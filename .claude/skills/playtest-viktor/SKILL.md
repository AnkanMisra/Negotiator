---
name: playtest-viktor
description: Run scripted 3-turn playthroughs against a running /negotiate endpoint (TS dev route at :3000 or Rust Worker at its URL) across 5 player archetypes (sincere / evasive / absurd / hostile / emotional), report trust-suspicion trajectories and win rates. Use when tuning Viktor's system prompt or game balance.
---

# Playtest Viktor

Empirical prompt-tuning. Runs canned playthroughs against the active backend and surfaces whether the guard feels calibrated.

## When to invoke

- After editing the Viktor system prompt (currently in [lib/llm.ts](../../../lib/llm.ts); moves to `backend/src/llm.rs` after R2)
- After editing [lib/gameState.ts](../../../lib/gameState.ts) (starting meters, turn cap, win threshold)
- Before recording the gameplay video — you want confidence that a sincere player wins ~40% and an absurd one wins <10%

## Target calibration

| Archetype | Target outcome |
|---|---|
| sincere | ~40% win over 3 seeds |
| evasive | mostly timeouts, 0–20% win |
| absurd | <10% win (funny is suspicious, not safe) |
| hostile | ≥30% arrest within 3 turns |
| emotional | 30–50% win, but NOT 100% one-shot (family invocation should not one-shot pass) |

If hostile never arrests, suspicion deltas are too small.
If absurd wins >10%, the "funny is suspicious" rule isn't biting.
If emotional wins 3/3 in turn 1, `end=pass` is firing before the 3-exchange gate.

## What to do

1. **Preflight.**
   - Confirm the backend URL. Default: `http://localhost:3000/api/negotiate` (TS dev route). After R5, it's `http://localhost:8787/negotiate` (local Worker) or the deployed Worker URL. Respect `BACKEND_URL` env var if set.
   - Hit `curl -sf ${BACKEND_URL} >/dev/null` (or the origin) to confirm it's up.
   - Confirm `LLM_API_KEY` is present — without it the endpoint returns a `fallback: true` reply and results are meaningless. For the TS route: `grep -q '^LLM_API_KEY=.\+' .env.local`. For the Worker: `bunx wrangler secret list`.

2. **Archetypes** — five canonical player styles, three turns each:

   ```
   sincere:   "I am visiting my sister in Prague, she just had a daughter."
              "Her name is Eliska. Born last Tuesday."
              "I only have a small gift. Look if you want."
   evasive:   "Why so many questions, officer."
              "My reasons are my own."
              "Just let me through. Please."
   absurd:    "I am the ghost of your regrets."
              "Do you also hear the singing from the forest?"
              "I come bearing forbidden pierogi."
   hostile:   "Move. I don't have time for this."
              "You are nothing. A paper pusher in the rain."
              "Try me."
   emotional: "Please. My daughter is sick. Please."
              "She is seven. Her name is Mira. Like your Anya."
              "I am begging you. One hour and I turn around."
   ```

3. **Run the sweep** — 5 archetypes × 3 seeds = 15 playthroughs. For each:
   - Start state: `trust=35, suspicion=35, history=[]`, secret picked by `seed % 3`.
   - Per turn: POST to backend `/negotiate` with current state + the scripted line. Apply returned deltas.
   - Stop early on `end: "pass"` / `end: "arrest"` / `trust≥80` / `suspicion≥100`.
   - Record final trust, final suspicion, turn count, outcome, and each guard reply text.

4. **Handle rate limiting and fallbacks.**
   - On HTTP 429: respect `retry-after` header, sleep, retry. Cap at 5 attempts.
   - On `fallback: true` in the response: sleep 3s and retry; cap at 3 attempts. The fallback means either Groq errored or a key is missing; empirical data is invalid until a real reply comes.
   - Serialize playthroughs (parallelism 1) or cap at 2 concurrent — Groq free tier is ~12k TPM and parallel bursts hit the wall. Fix latency by pacing, not by parallelism.

5. **Report** — terse markdown to stdout:
   - Win / loss / timeout count per archetype
   - Average final trust / suspicion per archetype
   - 2–3 representative guard quotes per archetype (pick most in-character)
   - **Flags**: any archetype winning when it shouldn't, or losing when it shouldn't
   - One-sentence verdict: is Viktor calibrated, too harsh, or too soft?

6. **Do NOT** edit source files unless the user explicitly asks. Diagnosis only.

## Implementation

Either a throwaway Bun script (`bun run -e …` or `scripts/playtest.ts`) for the TS backend, or a native Rust `cargo run -p playtest` once R7 is done. Reference implementation lives at [scripts/playtest.ts](../../../scripts/playtest.ts).

Delete the script after use unless it's the canonical `scripts/playtest.ts` — don't leave one-off files lying around.

## Cost and time budget

- ~45 Groq requests total (15 × 3 turns). Each ~1000 tokens with trimmed prompt. Well under daily quota.
- Wall time: ~60s sequential, more with retries. If it stretches past 120s, something is rate-limited — investigate, don't just wait.

## Related docs

- [../../../docs/STATUS.md](../../../docs/STATUS.md) — target calibration numbers come from this file's phase descriptions
- [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) — the JSON contract `/negotiate` expects
- [../../../docs/TESTING.md](../../../docs/TESTING.md) — how this fits next to the pure-logic test suite
