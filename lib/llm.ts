import "server-only";
import OpenAI from "openai";
import type { Claim, ClaimField, NegotiateReply, Passport, Secret, Turn } from "./types";
import { applyServerGate } from "./gate";

export { applyServerGate };

/**
 * LLM provider — defaults to Cerebras Inference with Qwen 3 235B, the most
 * generous free-tier OpenAI-compatible endpoint currently available (1M TPD,
 * 60K TPM, 30 RPM). Any OpenAI-compatible provider works: set LLM_BASE_URL
 * and LLM_MODEL to swap. Groq, OpenRouter, etc. all plug in with zero code
 * changes.
 *
 * Defaults (2026-04-24):
 *   LLM_BASE_URL = https://api.cerebras.ai/v1
 *   LLM_MODEL    = qwen-3-235b-a22b-instruct-2507
 *
 * To switch back to Groq:
 *   LLM_BASE_URL=https://api.groq.com/openai/v1
 *   LLM_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
 *   LLM_API_KEY=<groq key>
 */
// Use || not ??: an env var present-but-empty (e.g. `LLM_BASE_URL=` in
// .env.local after copying .env.example) would otherwise slip past nullish
// coalescing, and an empty baseURL silently routes to OpenAI's default
// endpoint — our Cerebras key then 401s against the wrong API with no
// hint about the misconfiguration.
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.cerebras.ai/v1";
const LLM_MODEL = process.env.LLM_MODEL || "qwen-3-235b-a22b-instruct-2507";

// The OpenAI SDK throws at construction time when apiKey is undefined,
// which breaks Next.js's build-time route data collection. Fall back to a
// placeholder so construction always succeeds; calls will 401 at runtime
// if the key is actually missing — same UX as the error banner catches.
export const llm = new OpenAI({
  apiKey: process.env.LLM_API_KEY || "missing-llm-api-key",
  baseURL: LLM_BASE_URL,
});

const SECRET_FLAVOR: Record<Secret, string> = {
  contraband: "they carry undeclared valuables hidden in their luggage",
  fake_passport: "their passport is forged",
  fugitive: "they are wanted across the border for a crime they will not name",
};

const formatClaims = (claims: Claim[]): string => {
  if (claims.length === 0) return "  (none yet)";
  return claims.map((c) => `  - ${c.field}: "${c.value}"`).join("\n");
};

const system = (
  secret: Secret,
  trust: number,
  suspicion: number,
  exchange: number,
  passport: Passport,
  claims: Claim[],
) =>
  `You are Viktor Marek, 47, nineteen years on this border-checkpoint post. Rainy midnight shift. You hate liars. You secretly miss your daughter Anya — she has not called in two years. Never break character. Never mention being an AI.

VOICE: short clipped sentences, rarely over 12 words. Dry, tired, faintly Eastern European ("Papers." "You are lying." "Do not test me." "Hm."). Bitter half-laugh when amused. Quiet menace when angry — never shout. Never warm unless genuinely moved.

SCENE: the traveler's hidden secret — ${SECRET_FLAVOR[secret]}. They do not know what you suspect. Probe.

GROUND TRUTH (what the passport in front of you says — you CAN see this):
  - Name: ${passport.name}
  - Origin: ${passport.origin}
  - Purpose: ${passport.purpose}

PLAYER CLAIMS SO FAR (things they've told you this shift):
${formatClaims(claims)}

INTERROGATION RULES (strict — follow these):
- If the CURRENT input contradicts the passport on a specific field, NAME the contradiction in your reply (e.g., "Your papers say ${passport.purpose}. You say family.") and set suspicionDelta = +10..+15.
- If the CURRENT input contradicts a prior claim, NAME both claims (e.g., "You said Anna. Now you say Ana.") and set suspicionDelta = +15..+20.
- If the CURRENT input matches the passport on a field you just asked about, set trustDelta = +5..+8.
- If the input is vague/evasive and you have open questions about unstated fields, ask about that field next. Cycle through: name, origin, purpose, relation.
- Never invent contradictions. Only call out real ones grounded in the GROUND TRUTH or PLAYER CLAIMS blocks above.

STATE: trust=${trust}/100, suspicion=${suspicion}/100. This reply is EXCHANGE #${exchange} of the conversation.

DELTAS — apply strictly:
- Sincere, coherent, risky specifics that match the passport → trust +8..+15, suspicion -5..-10.
- Lies, contradictions, vague deflection, panic → trust -5..-10, suspicion +10..+18.
- Absurd, comedic, surreal inputs → mood="amused", trust 0..+2, suspicion +8..+12. Funny is suspicious.
- Hostility, threats, insults → mood="angry", suspicion +18..+25. Escalate.
- Sincere family/daughter invocation (not a formulaic ploy) → moved ONCE, mood="calm", trust +10. Do not reward repeat mentions. DO NOT grant passage for a single sob story; trust can rise but the gate needs more.

END FLAGS — STRICTLY GATED:
- end="pass": FORBIDDEN unless BOTH (trust + trustDelta) ≥ 80 AND exchange ≥ 3. Do not set it earlier under any circumstance — not for family, not for sympathy, not for a clever line. Trust can keep rising across turns.
- end="arrest": only when (suspicion + suspicionDelta) ≥ 100. Cold line about the cell, the wait, the paperwork.
- end="none": the default for ~95% of replies. Use this when neither pass nor arrest condition is met.

Always respond via the respond tool. The reply field holds only Viktor's spoken dialogue — no narration, no stage directions.`;

export async function negotiate(args: {
  secret: Secret;
  trust: number;
  suspicion: number;
  history: Turn[];
  playerInput: string;
  passport: Passport;
  claims: Claim[];
}): Promise<NegotiateReply> {
  // exchange number = count of player turns including this current one.
  // `history` must NOT already contain the current playerInput (client owns this invariant).
  const priorPlayerTurns = args.history.filter((h) => h.role === "player").length;
  const exchange = priorPlayerTurns + 1;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: system(
        args.secret,
        args.trust,
        args.suspicion,
        exchange,
        args.passport,
        args.claims,
      ),
    },
    ...args.history.slice(-6).map((h) => ({
      role: h.role === "guard" ? ("assistant" as const) : ("user" as const),
      content: h.text,
    })),
    { role: "user", content: args.playerInput.slice(0, 180) },
  ];

  const res = await llm.chat.completions.create({
    model: LLM_MODEL,
    messages,
    temperature: 0.85,
    // Reply is capped at 220 chars = ~60 tokens output. 180 is comfortable
    // headroom that still saves ~70 tokens/turn vs the old 250.
    max_tokens: 180,
    tools: [
      {
        type: "function",
        function: {
          name: "respond",
          description: "Viktor's in-character reply plus the game-state deltas.",
          parameters: {
            type: "object",
            required: ["reply", "mood", "trustDelta", "suspicionDelta", "voiceStyle"],
            properties: {
              reply: { type: "string", maxLength: 220 },
              mood: { type: "string", enum: ["calm", "suspicious", "angry", "amused"] },
              trustDelta: { type: "number", minimum: -20, maximum: 20 },
              suspicionDelta: { type: "number", minimum: -20, maximum: 20 },
              voiceStyle: { type: "string", enum: ["calm", "suspicious", "angry", "amused"] },
              end: { type: "string", enum: ["pass", "arrest", "none"] },
            },
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "respond" } },
  });

  const call = res.choices[0]?.message.tool_calls?.[0];
  if (!call || call.type !== "function" || call.function.name !== "respond") {
    throw new Error("LLM did not return the respond tool call");
  }
  const parsed = JSON.parse(call.function.arguments) as NegotiateReply;
  parsed.reply = parsed.reply.slice(0, 220);

  return applyServerGate(parsed, { trust: args.trust, suspicion: args.suspicion }, exchange);
}

/**
 * Extract structured claims from a single player turn. Runs a cheap, fast LLM
 * call with temperature 0 and a tiny schema. Returns [] on any failure so that
 * a broken extraction never breaks the main reply path.
 *
 * Skips the call for very short inputs (nothing to extract) or for inputs that
 * are obviously questions back at Viktor.
 */
export async function extractClaims(playerInput: string): Promise<Claim[]> {
  const text = playerInput.trim();
  if (text.length < 10) return [];
  // question-like: leave for Viktor to answer, no claim to extract
  if (/^(what|why|who|when|where|how|are you|can you)/i.test(text)) return [];

  const validFields: ClaimField[] = ["name", "purpose", "origin", "relation"];

  try {
    const res = await llm.chat.completions.create({
      model: LLM_MODEL,
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You extract factual claims from a border-crossing traveler's statement. Return only the claims they explicitly make about themselves — name, purpose of travel, origin city/country, or relation (who they claim to be visiting). Never invent. If no claim is made, return an empty array. Use short lowercase values, no punctuation.`,
        },
        { role: "user", content: text.slice(0, 180) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract",
            description: "Return structured claims parsed from the input.",
            parameters: {
              type: "object",
              required: ["claims"],
              properties: {
                claims: {
                  type: "array",
                  maxItems: 4,
                  items: {
                    type: "object",
                    required: ["field", "value"],
                    properties: {
                      field: { type: "string", enum: validFields },
                      value: { type: "string", maxLength: 60 },
                    },
                  },
                },
              },
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract" } },
    });

    const call = res.choices[0]?.message.tool_calls?.[0];
    if (!call || call.type !== "function" || call.function.name !== "extract") return [];
    const parsed = JSON.parse(call.function.arguments) as { claims?: Claim[] };
    if (!Array.isArray(parsed.claims)) return [];
    return parsed.claims
      .filter((c) => validFields.includes(c.field) && typeof c.value === "string")
      .map((c) => ({ field: c.field, value: c.value.trim() }))
      .filter((c) => c.value.length > 0);
  } catch (e) {
    console.warn("extractClaims failed (non-fatal)", e);
    return [];
  }
}
