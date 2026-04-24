import type { Claim, ClaimField, Mood, Passport, Secret, Turn } from "./types";
import { generatePassport } from "./passport";

export type GameStatus = "idle" | "thinking" | "speaking" | "won" | "lost";

export type GameState = {
  trust: number;
  suspicion: number;
  history: Turn[];
  secret: Secret;
  passport: Passport;
  claims: Claim[];
  turnCap: number;
  mood: Mood;
  status: GameStatus;
};

export type Action =
  | { type: "PLAYER_SUBMIT"; text: string }
  | {
      type: "GUARD_REPLY";
      reply: string;
      mood: Mood;
      trustDelta: number;
      suspicionDelta: number;
      end?: "pass" | "arrest";
      updatedClaims?: Claim[];
    }
  | { type: "SPEAKING_END" }
  | { type: "RESET" };

const randomSecret = (): Secret => {
  const all: Secret[] = ["contraband", "fake_passport", "fugitive"];
  return all[Math.floor(Math.random() * all.length)];
};

export const createInitialState = (): GameState => {
  const secret = randomSecret();
  return {
    trust: 35,
    suspicion: 35,
    history: [],
    secret,
    passport: generatePassport(secret),
    claims: [],
    turnCap: 6,
    mood: "suspicious",
    status: "speaking",
  };
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Merge new claims into the existing list, keyed by field. Latest claim for
 * any given field wins (so if the player restates their name, the most recent
 * version is what Viktor sees — but prior contradictions have already been
 * fed to earlier turns, so the interrogation memory is preserved).
 */
export function mergeClaims(existing: Claim[], incoming: Claim[]): Claim[] {
  if (incoming.length === 0) return existing;
  const byField = new Map<ClaimField, string>();
  for (const c of existing) byField.set(c.field, c.value);
  for (const c of incoming) {
    const v = c.value.trim();
    if (v.length === 0) continue;
    byField.set(c.field, v);
  }
  return Array.from(byField.entries()).map(([field, value]) => ({ field, value }));
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "PLAYER_SUBMIT":
      return {
        ...state,
        history: [...state.history, { role: "player", text: action.text }],
        status: "thinking",
      };

    case "GUARD_REPLY": {
      const trust = clamp(state.trust + action.trustDelta);
      const suspicion = clamp(state.suspicion + action.suspicionDelta);
      const turnsTaken = state.history.filter((h) => h.role === "player").length;

      let status: GameStatus = "speaking";
      if (action.end === "pass") status = "won";
      else if (action.end === "arrest") status = "lost";
      else if (suspicion >= 100) status = "lost";
      else if (trust >= 80 && turnsTaken >= 3) status = "won";
      else if (turnsTaken >= state.turnCap) status = trust > suspicion ? "won" : "lost";

      const claims = action.updatedClaims
        ? mergeClaims(state.claims, action.updatedClaims)
        : state.claims;

      return {
        ...state,
        trust,
        suspicion,
        mood: action.mood,
        claims,
        history: [
          ...state.history,
          { role: "guard", text: action.reply, mood: action.mood },
        ],
        status,
      };
    }

    case "SPEAKING_END":
      if (state.status === "speaking") return { ...state, status: "idle" };
      return state;

    case "RESET":
      return createInitialState();
  }
}
