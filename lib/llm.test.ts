import { describe, expect, it } from "bun:test";
import { applyServerGate } from "./gate";
import type { NegotiateReply } from "./types";

const baseReply = (o: Partial<NegotiateReply> = {}): NegotiateReply => ({
  reply: "Hm.",
  mood: "suspicious",
  trustDelta: 0,
  suspicionDelta: 0,
  voiceStyle: "suspicious",
  ...o,
});

describe("applyServerGate — none sentinel", () => {
  it("strips end='none' (schema-workaround value)", () => {
    const out = applyServerGate(
      { ...baseReply(), end: "none" as unknown as "pass" | "arrest" },
      { trust: 35, suspicion: 35 },
      1,
    );
    expect(out.end).toBeUndefined();
  });
});

describe("applyServerGate — end='pass' gate", () => {
  it("strips end='pass' when exchange < 3 (even with high trust)", () => {
    const out = applyServerGate(
      baseReply({ trustDelta: 15, end: "pass" }),
      { trust: 70, suspicion: 20 },
      2, // too early
    );
    expect(out.end).toBeUndefined();
  });

  it("strips end='pass' when trust+delta < 80 (even on exchange 3)", () => {
    const out = applyServerGate(
      baseReply({ trustDelta: 5, end: "pass" }),
      { trust: 60, suspicion: 20 },
      3,
    );
    expect(out.end).toBeUndefined();
  });

  it("keeps end='pass' when BOTH gates met (trust+delta>=80 AND exchange>=3)", () => {
    const out = applyServerGate(
      baseReply({ trustDelta: 10, end: "pass" }),
      { trust: 70, suspicion: 20 },
      3,
    );
    expect(out.end).toBe("pass");
  });

  it("keeps end='pass' on a much later exchange with satisfied trust", () => {
    const out = applyServerGate(
      baseReply({ trustDelta: 0, end: "pass" }),
      { trust: 85, suspicion: 20 },
      5,
    );
    expect(out.end).toBe("pass");
  });
});

describe("applyServerGate — end='arrest' gate", () => {
  it("strips end='arrest' when suspicion+delta < 100", () => {
    const out = applyServerGate(
      baseReply({ suspicionDelta: 10, end: "arrest" }),
      { trust: 20, suspicion: 80 },
      2,
    );
    expect(out.end).toBeUndefined();
  });

  it("keeps end='arrest' when suspicion+delta >= 100", () => {
    const out = applyServerGate(
      baseReply({ suspicionDelta: 15, end: "arrest" }),
      { trust: 10, suspicion: 90 },
      2,
    );
    expect(out.end).toBe("arrest");
  });

  it("exchange count is irrelevant for arrest", () => {
    const out = applyServerGate(
      baseReply({ suspicionDelta: 25, end: "arrest" }),
      { trust: 10, suspicion: 80 },
      1, // arrest allowed on turn 1 if suspicion crosses
    );
    expect(out.end).toBe("arrest");
  });
});

describe("applyServerGate — purity", () => {
  it("does not mutate the input reply object", () => {
    const input = { ...baseReply({ trustDelta: 15, end: "pass" as const }) };
    const snapshot = JSON.parse(JSON.stringify(input));
    applyServerGate(input, { trust: 70, suspicion: 20 }, 2);
    expect(input).toEqual(snapshot);
  });

  it("passes through non-end fields untouched", () => {
    const out = applyServerGate(
      baseReply({ reply: "Papers.", mood: "angry", trustDelta: -3, suspicionDelta: 12, voiceStyle: "angry" }),
      { trust: 30, suspicion: 50 },
      2,
    );
    expect(out.reply).toBe("Papers.");
    expect(out.mood).toBe("angry");
    expect(out.trustDelta).toBe(-3);
    expect(out.suspicionDelta).toBe(12);
    expect(out.voiceStyle).toBe("angry");
  });
});

describe("applyServerGate — edge cases", () => {
  it("handles clamped trust (+30 when trust=60, delta=30) still satisfying >=80", () => {
    const out = applyServerGate(
      baseReply({ trustDelta: 30, end: "pass" }),
      { trust: 60, suspicion: 20 },
      3,
    );
    expect(out.end).toBe("pass"); // 60+30=90, gate ok
  });

  it("handles negative delta pushing trust below 80 (strips pass)", () => {
    const out = applyServerGate(
      baseReply({ trustDelta: -5, end: "pass" }),
      { trust: 82, suspicion: 10 },
      3,
    );
    expect(out.end).toBeUndefined(); // 82-5=77 < 80
  });

  it("no-op when end is already undefined", () => {
    const input = baseReply({ trustDelta: 5 });
    const out = applyServerGate(input, { trust: 35, suspicion: 35 }, 1);
    expect(out.end).toBeUndefined();
    expect(out.trustDelta).toBe(5);
  });
});
