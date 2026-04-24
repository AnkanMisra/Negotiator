import { describe, expect, it } from "bun:test";
import { createInitialState, mergeClaims, reducer, type GameState } from "./gameState";
import type { Claim, Secret } from "./types";

const base = (overrides: Partial<GameState> = {}): GameState => ({
  ...createInitialState(),
  ...overrides,
});

describe("createInitialState", () => {
  it("starts with balanced meters, empty history, speaking status", () => {
    const s = createInitialState();
    expect(s.trust).toBe(35);
    expect(s.suspicion).toBe(35);
    expect(s.history).toEqual([]);
    expect(s.turnCap).toBe(6);
    expect(s.mood).toBe("suspicious");
    expect(s.status).toBe("speaking");
  });

  it("picks one of the three secrets", () => {
    const valid: Secret[] = ["contraband", "fake_passport", "fugitive"];
    for (let i = 0; i < 20; i++) {
      expect(valid).toContain(createInitialState().secret);
    }
  });

  it("populates a passport with name, origin, purpose, and empty claims", () => {
    const s = createInitialState();
    expect(s.passport.name.split(" ").length).toBe(2);
    expect(s.passport.origin.length).toBeGreaterThan(2);
    expect(["BUSINESS", "FAMILY", "TRANSIT"]).toContain(s.passport.purpose);
    expect(s.claims).toEqual([]);
  });
});

describe("mergeClaims", () => {
  it("adds new claims when list is empty", () => {
    const next = mergeClaims([], [{ field: "name", value: "Anna" }]);
    expect(next).toEqual([{ field: "name", value: "Anna" }]);
  });

  it("de-dupes by field: latest value for a field wins", () => {
    const existing: Claim[] = [{ field: "name", value: "Anna" }];
    const next = mergeClaims(existing, [{ field: "name", value: "Ana" }]);
    expect(next).toEqual([{ field: "name", value: "Ana" }]);
  });

  it("preserves other fields when one field is restated", () => {
    const existing: Claim[] = [
      { field: "name", value: "Anna" },
      { field: "purpose", value: "business" },
    ];
    const next = mergeClaims(existing, [{ field: "name", value: "Ana" }]);
    expect(next).toContainEqual({ field: "name", value: "Ana" });
    expect(next).toContainEqual({ field: "purpose", value: "business" });
    expect(next.length).toBe(2);
  });

  it("trims whitespace and drops empty values", () => {
    const next = mergeClaims(
      [],
      [
        { field: "name", value: "  Anna  " },
        { field: "origin", value: "   " },
      ],
    );
    expect(next).toEqual([{ field: "name", value: "Anna" }]);
  });

  it("returns original when incoming is empty", () => {
    const existing: Claim[] = [{ field: "name", value: "Anna" }];
    expect(mergeClaims(existing, [])).toBe(existing);
  });
});

describe("reducer PLAYER_SUBMIT", () => {
  it("appends player turn to history and flips status to thinking", () => {
    const s = base({ status: "idle", history: [] });
    const next = reducer(s, { type: "PLAYER_SUBMIT", text: "hello" });
    expect(next.history).toEqual([{ role: "player", text: "hello" }]);
    expect(next.status).toBe("thinking");
    expect(next.trust).toBe(s.trust);
    expect(next.suspicion).toBe(s.suspicion);
  });
});

describe("reducer GUARD_REPLY", () => {
  const reply = (overrides: {
    trustDelta?: number;
    suspicionDelta?: number;
    end?: "pass" | "arrest";
  } = {}) =>
    ({
      type: "GUARD_REPLY" as const,
      reply: "Hm.",
      mood: "suspicious" as const,
      trustDelta: 0,
      suspicionDelta: 0,
      ...overrides,
    });

  it("applies trust and suspicion deltas", () => {
    const s = base({ trust: 40, suspicion: 30 });
    const next = reducer(s, reply({ trustDelta: 10, suspicionDelta: -5 }));
    expect(next.trust).toBe(50);
    expect(next.suspicion).toBe(25);
  });

  it("clamps trust and suspicion to [0, 100]", () => {
    expect(reducer(base({ trust: 95 }), reply({ trustDelta: 50 })).trust).toBe(100);
    expect(reducer(base({ trust: 5 }), reply({ trustDelta: -50 })).trust).toBe(0);
    expect(reducer(base({ suspicion: 95 }), reply({ suspicionDelta: 50 })).suspicion).toBe(100);
  });

  it("appends guard turn with its mood", () => {
    const s = base();
    const next = reducer(s, { ...reply(), mood: "angry", reply: "Do not test me." });
    const guardTurn = next.history[next.history.length - 1];
    expect(guardTurn).toEqual({ role: "guard", text: "Do not test me.", mood: "angry" });
  });

  it("sets status=won when end=pass regardless of meters", () => {
    const s = base({ trust: 50 });
    const next = reducer(s, reply({ end: "pass" }));
    expect(next.status).toBe("won");
  });

  it("sets status=lost when end=arrest regardless of meters", () => {
    const s = base({ suspicion: 10 });
    const next = reducer(s, reply({ end: "arrest" }));
    expect(next.status).toBe("lost");
  });

  it("sets status=lost when suspicion reaches 100 without end flag", () => {
    const s = base({ suspicion: 90 });
    const next = reducer(s, reply({ suspicionDelta: 15 }));
    expect(next.status).toBe("lost");
  });

  it("sets status=won when trust>=80 AND at least 3 player turns taken (fixed off-by-one)", () => {
    const threePlayer = base({
      trust: 75,
      history: [
        { role: "player", text: "1" },
        { role: "guard", text: "a" },
        { role: "player", text: "2" },
        { role: "guard", text: "b" },
        { role: "player", text: "3" },
      ],
    });
    const next = reducer(threePlayer, reply({ trustDelta: 10 }));
    expect(next.trust).toBe(85);
    expect(next.status).toBe("won");
  });

  it("does NOT win at trust>=80 with only 2 player turns (gate regression)", () => {
    const twoPlayer = base({
      trust: 70,
      history: [
        { role: "player", text: "1" },
        { role: "guard", text: "a" },
        { role: "player", text: "2" },
      ],
    });
    const next = reducer(twoPlayer, reply({ trustDelta: 15 }));
    expect(next.trust).toBe(85);
    expect(next.status).toBe("speaking"); // keeps playing, does not win early
  });

  it("falls back to turnCap: wins if trust > suspicion at cap", () => {
    const history = Array.from({ length: 6 }, () => ({ role: "player" as const, text: "p" }));
    const s = base({ trust: 55, suspicion: 40, history });
    const next = reducer(s, reply());
    expect(next.status).toBe("won");
  });

  it("falls back to turnCap: loses if suspicion >= trust at cap", () => {
    const history = Array.from({ length: 6 }, () => ({ role: "player" as const, text: "p" }));
    const s = base({ trust: 40, suspicion: 55, history });
    const next = reducer(s, reply());
    expect(next.status).toBe("lost");
  });

  it("merges updatedClaims into state.claims", () => {
    const s = base({ claims: [{ field: "name", value: "Anna" }] });
    const next = reducer(s, {
      ...reply(),
      updatedClaims: [
        { field: "name", value: "Ana" },
        { field: "purpose", value: "family" },
      ],
    });
    expect(next.claims).toContainEqual({ field: "name", value: "Ana" });
    expect(next.claims).toContainEqual({ field: "purpose", value: "family" });
    expect(next.claims.length).toBe(2);
  });

  it("leaves claims untouched when no updatedClaims provided", () => {
    const existing: Claim[] = [{ field: "name", value: "Anna" }];
    const s = base({ claims: existing });
    const next = reducer(s, reply());
    expect(next.claims).toBe(existing);
  });
});

describe("reducer SPEAKING_END", () => {
  it("transitions speaking → idle", () => {
    const next = reducer(base({ status: "speaking" }), { type: "SPEAKING_END" });
    expect(next.status).toBe("idle");
  });

  it("preserves terminal won state (no-op)", () => {
    const s = base({ status: "won" });
    const next = reducer(s, { type: "SPEAKING_END" });
    expect(next).toBe(s);
  });

  it("preserves terminal lost state (no-op)", () => {
    const s = base({ status: "lost" });
    const next = reducer(s, { type: "SPEAKING_END" });
    expect(next).toBe(s);
  });

  it("no-op when idle or thinking", () => {
    const idle = base({ status: "idle" });
    expect(reducer(idle, { type: "SPEAKING_END" })).toBe(idle);
    const thinking = base({ status: "thinking" });
    expect(reducer(thinking, { type: "SPEAKING_END" })).toBe(thinking);
  });
});

describe("reducer RESET", () => {
  it("returns a fresh initial state", () => {
    const dirty = base({
      trust: 10,
      suspicion: 90,
      status: "lost",
      history: [{ role: "player", text: "x" }],
    });
    const next = reducer(dirty, { type: "RESET" });
    expect(next.trust).toBe(35);
    expect(next.suspicion).toBe(35);
    expect(next.status).toBe("speaking");
    expect(next.history).toEqual([]);
  });
});
