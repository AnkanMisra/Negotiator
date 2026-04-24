import "server-only";
import Groq from "groq-sdk";
import type { Claim, ClaimField, NegotiateReply, Passport, Secret, Turn } from "./types";
import { applyServerGate } from "./gate";

export { applyServerGate };

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq model — configurable via env. Defaults to Llama 4 Scout 17B MoE
// because it's the most generous on the free tier:
//   - 30K TPM (5x the 6K ceiling on 8B / 70B)
//   - 500K TPD (same as 8B, 5x the 70B cap)
//   - Newer architecture + more params than Llama 3.1 8B (better Viktor
//     quality — he's a character, bigger helps)
//
// Sources: console.groq.com/docs/rate-limits (verified 2026-04-24).
// Overrides: set GROQ_MODEL=llama-3.3-70b-versatile for max character fidelity
// (100K TPD), or GROQ_MODEL=qwen/qwen3-32b for big-model dialogue on 6K TPM.
const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

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

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
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

  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
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
  if (!call || call.function.name !== "respond") {
    throw new Error("Groq did not return the respond tool call");
  }
  const parsed = JSON.parse(call.function.arguments) as NegotiateReply;
  parsed.reply = parsed.reply.slice(0, 220);

  return applyServerGate(parsed, { trust: args.trust, suspicion: args.suspicion }, exchange);
}

/**
 * Extract structured claims from a single player turn. Runs a cheap, fast Groq
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
    const res = await groq.chat.completions.create({
      model: GROQ_MODEL,
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
    if (!call || call.function.name !== "extract") return [];
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
