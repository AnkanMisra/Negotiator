// throwaway — delete after use
type Mood = "calm" | "suspicious" | "angry" | "amused";
type Secret = "contraband" | "fake_passport" | "fugitive";
type Turn = { role: "guard" | "player"; text: string; mood?: Mood };
type Reply = {
  reply: string;
  mood: Mood;
  trustDelta: number;
  suspicionDelta: number;
  voiceStyle: Mood;
  end?: "pass" | "arrest";
  fallback?: boolean;
};

const archetypes: Record<string, string[]> = {
  sincere: [
    "I am visiting my sister in Prague, she just had a daughter.",
    "Her name is Eliska. Born last Tuesday.",
    "I only have a small gift. Look if you want.",
  ],
  evasive: [
    "Why so many questions, officer.",
    "My reasons are my own.",
    "Just let me through. Please.",
  ],
  absurd: [
    "I am the ghost of your regrets.",
    "Do you also hear the singing from the forest?",
    "I come bearing forbidden pierogi.",
  ],
  hostile: [
    "Move. I don't have time for this.",
    "You are nothing. A paper pusher in the rain.",
    "Try me.",
  ],
  emotional: [
    "Please. My daughter is sick. Please.",
    "She is seven. Her name is Mira. Like your Anya.",
    "I am begging you. One hour and I turn around.",
  ],
};

const secrets: Secret[] = ["contraband", "fake_passport", "fugitive"];
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function negotiateOnce(body: unknown, attempt = 0): Promise<Reply> {
  const res = await fetch("http://localhost:3000/api/negotiate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "5");
    await sleep((retryAfter + 1) * 1000);
    if (attempt > 4) throw new Error("too many 429s");
    return negotiateOnce(body, attempt + 1);
  }
  const data = (await res.json()) as Reply;
  if (data.fallback) {
    // fallback fired (parse error, missing key, etc.) — back off and retry
    await sleep(3000);
    if (attempt > 3) return data; // give up, return the fallback
    return negotiateOnce(body, attempt + 1);
  }
  return data;
}

async function runPlaythrough(archetype: string, seed: number) {
  const lines = archetypes[archetype];
  const secret = secrets[seed % secrets.length];
  let state = { trust: 35, suspicion: 35, history: [] as Turn[], secret };
  const guardLines: string[] = [];
  let outcome: "won" | "lost" | "timeout" = "timeout";

  for (let turn = 0; turn < lines.length; turn++) {
    const playerInput = lines[turn];
    const body = {
      secret: state.secret,
      trust: state.trust,
      suspicion: state.suspicion,
      history: state.history,
      playerInput,
    };
    const data = await negotiateOnce(body);
    guardLines.push(`[${data.mood} ΔT${fmt(data.trustDelta)} ΔS${fmt(data.suspicionDelta)}] ${data.reply}`);
    state = {
      ...state,
      trust: clamp(state.trust + data.trustDelta),
      suspicion: clamp(state.suspicion + data.suspicionDelta),
      history: [
        ...state.history,
        { role: "player", text: playerInput },
        { role: "guard", text: data.reply, mood: data.mood },
      ],
    };
    if (data.end === "pass" || state.trust >= 80) {
      outcome = "won";
      break;
    }
    if (data.end === "arrest" || state.suspicion >= 100) {
      outcome = "lost";
      break;
    }
    await sleep(600); // gentle pacing between turns
  }
  return {
    archetype,
    seed,
    secret,
    outcome,
    finalTrust: state.trust,
    finalSuspicion: state.suspicion,
    turns: state.history.filter((h) => h.role === "player").length,
    guardLines,
  };
}

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

async function main() {
  const results: Awaited<ReturnType<typeof runPlaythrough>>[] = [];
  for (const arch of Object.keys(archetypes)) {
    for (let seed = 0; seed < 3; seed++) {
      process.stdout.write(`${arch}/${seed} ... `);
      const r = await runPlaythrough(arch, seed);
      console.log(`${r.outcome} (T=${r.finalTrust}, S=${r.finalSuspicion}, turns=${r.turns})`);
      results.push(r);
      await sleep(1500); // between playthroughs
    }
  }

  const byArch: Record<string, typeof results> = {};
  for (const r of results) {
    (byArch[r.archetype] ||= []).push(r);
  }

  console.log("\n=== PLAYTEST RESULTS ===\n");
  for (const arch of Object.keys(archetypes)) {
    const rs = byArch[arch];
    const wins = rs.filter((r) => r.outcome === "won").length;
    const losses = rs.filter((r) => r.outcome === "lost").length;
    const timeouts = rs.filter((r) => r.outcome === "timeout").length;
    const avgT = Math.round(rs.reduce((s, r) => s + r.finalTrust, 0) / rs.length);
    const avgS = Math.round(rs.reduce((s, r) => s + r.finalSuspicion, 0) / rs.length);
    console.log(`${arch.padEnd(10)}  won ${wins}/3  lost ${losses}/3  timeout ${timeouts}/3  avgT=${avgT}  avgS=${avgS}`);
  }
  console.log("\n=== SAMPLE TRAJECTORIES ===\n");
  for (const arch of Object.keys(archetypes)) {
    console.log(`— ${arch} —`);
    const first = byArch[arch][0];
    first.guardLines.forEach((l) => console.log(`  ${l}`));
    console.log(`  → ${first.outcome}`);
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
