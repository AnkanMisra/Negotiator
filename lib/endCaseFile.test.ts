import { describe, expect, it } from "bun:test";
import { buildEndCaseFile } from "./endCaseFile";
import type { GameState } from "./gameState";

const baseState = (overrides: Partial<GameState> = {}): GameState => ({
  trust: 82,
  suspicion: 44,
  history: [
    { role: "player", text: "I am only passing through." },
    { role: "guard", text: "Transit. Hm.", mood: "suspicious" },
    { role: "player", text: "My cousin waits outside." },
    { role: "guard", text: "The gate lifts.", mood: "calm" },
  ],
  secret: "contraband",
  passport: {
    name: "Mila Orlov",
    origin: "Lodsk",
    purpose: "TRANSIT",
    photoSeed: 17,
  },
  claims: [
    { field: "purpose", value: "passing through" },
    { field: "relation", value: "cousin outside" },
  ],
  turnCap: 6,
  mood: "calm",
  status: "won",
  ...overrides,
});

describe("buildEndCaseFile", () => {
  it("summarizes a cleared run", () => {
    const file = buildEndCaseFile(baseState());

    expect(file.verdict).toBe("CLEARED");
    expect(file.caseNumber).toBe("0017");
    expect(file.secretLabel).toBe("Contraband");
    expect(file.turns).toBe(2);
    expect(file.trust).toBe(82);
    expect(file.suspicion).toBe(44);
    expect(file.finalGuardLine).toBe("The gate lifts.");
    expect(file.claims).toEqual([
      { label: "Purpose", value: "passing through" },
      { label: "Contact", value: "cousin outside" },
    ]);
  });

  it("summarizes a detained run", () => {
    const file = buildEndCaseFile(
      baseState({
        status: "lost",
        secret: "fake_passport",
        trust: 20,
        suspicion: 100,
      }),
    );

    expect(file.verdict).toBe("DETAINED");
    expect(file.outcomeNote).toBe("The record closes with detention ordered.");
    expect(file.secretLabel).toBe("False papers");
    expect(file.secretFinding).toContain("passport");
  });

  it("falls back when no guard line exists", () => {
    const file = buildEndCaseFile(baseState({ history: [] }));

    expect(file.turns).toBe(0);
    expect(file.finalGuardLine).toBe("No final statement recorded.");
  });
});
