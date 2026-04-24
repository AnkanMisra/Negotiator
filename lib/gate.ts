import type { NegotiateReply } from "./types";

/**
 * Strip invalid `end` flags per the F1 server-side gate. Pure — no IO, no side effects.
 *
 * Rules:
 *  - "none" is a schema sentinel meaning "no end"; always strip
 *  - "pass" requires (trust + trustDelta) ≥ 80 AND exchange ≥ 3
 *  - "arrest" requires (suspicion + suspicionDelta) ≥ 100
 *
 * Kept in its own file so unit tests don't need to pull Next.js "server-only"
 * transitively via lib/llm.ts.
 */
export function applyServerGate(
  parsed: NegotiateReply,
  state: { trust: number; suspicion: number },
  exchange: number,
): NegotiateReply {
  const out: NegotiateReply = { ...parsed };

  if ((out.end as string | undefined) === "none") {
    delete out.end;
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const newTrust = clamp(state.trust + out.trustDelta);
  const newSusp = clamp(state.suspicion + out.suspicionDelta);

  if (out.end === "pass" && (newTrust < 80 || exchange < 3)) {
    delete out.end;
  }
  if (out.end === "arrest" && newSusp < 100) {
    delete out.end;
  }

  return out;
}
