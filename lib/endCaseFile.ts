import type { GameState } from "./gameState";
import type { ClaimField, Secret } from "./types";

export type EndCaseFile = {
  verdict: "CLEARED" | "DETAINED";
  outcomeNote: string;
  caseNumber: string;
  secretLabel: string;
  secretFinding: string;
  turns: number;
  trust: number;
  suspicion: number;
  passport: {
    name: string;
    origin: string;
    purpose: string;
  };
  claims: {
    label: string;
    value: string;
  }[];
  finalGuardLine: string;
};

const SECRET_DETAILS: Record<Secret, { label: string; finding: string }> = {
  contraband: {
    label: "Contraband",
    finding: "Hidden goods were the real risk at the gate.",
  },
  fake_passport: {
    label: "False papers",
    finding: "The passport itself was the weak point.",
  },
  fugitive: {
    label: "Fugitive",
    finding: "The checkpoint was watching for a wanted traveler.",
  },
};

const CLAIM_LABELS: Record<ClaimField, string> = {
  name: "Name",
  origin: "Origin",
  purpose: "Purpose",
  relation: "Contact",
};

export function buildEndCaseFile(state: GameState): EndCaseFile {
  const secret = SECRET_DETAILS[state.secret];
  const playerTurns = state.history.filter((turn) => turn.role === "player").length;
  const finalGuardLine =
    [...state.history].reverse().find((turn) => turn.role === "guard")?.text ??
    "No final statement recorded.";

  return {
    verdict: state.status === "won" ? "CLEARED" : "DETAINED",
    outcomeNote:
      state.status === "won"
        ? "The record closes with passage granted."
        : "The record closes with detention ordered.",
    caseNumber: String(state.passport.photoSeed).padStart(4, "0"),
    secretLabel: secret.label,
    secretFinding: secret.finding,
    turns: playerTurns,
    trust: state.trust,
    suspicion: state.suspicion,
    passport: {
      name: state.passport.name,
      origin: state.passport.origin,
      purpose: state.passport.purpose,
    },
    claims: state.claims.map((claim) => ({
      label: CLAIM_LABELS[claim.field],
      value: claim.value,
    })),
    finalGuardLine,
  };
}
