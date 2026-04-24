import { NextRequest } from "next/server";
import { extractClaims, negotiate } from "@/lib/llm";
import type { Claim, NegotiateReply, Passport, Secret, Turn } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  secret: Secret;
  trust: number;
  suspicion: number;
  history: Turn[];
  playerInput: string;
  passport: Passport;
  claims: Claim[];
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  if (
    !body.playerInput ||
    typeof body.playerInput !== "string" ||
    body.playerInput.length > 500
  ) {
    return Response.json({ error: "bad input" }, { status: 400 });
  }

  if (!body.passport || typeof body.passport !== "object") {
    return Response.json({ error: "missing passport" }, { status: 400 });
  }

  const priorClaims = Array.isArray(body.claims) ? body.claims : [];

  try {
    // Run claim extraction and Viktor's reply concurrently — extraction is fast
    // and tolerant of failure, so we don't want it on the critical path.
    const [newClaims, reply] = await Promise.all([
      extractClaims(body.playerInput),
      negotiate({
        secret: body.secret,
        trust: body.trust,
        suspicion: body.suspicion,
        history: body.history,
        playerInput: body.playerInput,
        passport: body.passport,
        claims: priorClaims,
      }),
    ]);

    const replyWithClaims: NegotiateReply = {
      ...reply,
      updatedClaims: newClaims,
    };
    return Response.json(replyWithClaims);
  } catch (e) {
    const status = (e as { status?: number } | undefined)?.status;
    if (status === 429) {
      const retryAfter = (e as { headers?: Headers }).headers?.get?.("retry-after") ?? "5";
      return Response.json(
        { error: "rate_limited", retryAfter },
        { status: 429, headers: { "retry-after": retryAfter } },
      );
    }
    console.error("negotiate error", e);
    const fallback: NegotiateReply & { fallback: true } = {
      reply: "...",
      mood: "suspicious",
      trustDelta: 0,
      suspicionDelta: 5,
      voiceStyle: "suspicious",
      fallback: true,
    };
    return Response.json(fallback);
  }
}
