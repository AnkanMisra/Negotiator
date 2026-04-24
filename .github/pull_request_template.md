## Summary

<!--
  What does this PR do? 1-3 bullets focused on the outcome, not the diff.
  Example:
  - Switch default LLM to Cerebras + Qwen 3 235B for 2x daily token budget
  - Make the provider configurable via LLM_BASE_URL / LLM_MODEL
  - Update docs to reflect the new env vars
-->

## Why

<!--
  The motivation / the problem this solves. If it's obvious from the
  summary, delete this section.
-->

## Changes

<!--
  Key files touched, grouped. Drop this section for trivial PRs.
  Example:
  - `lib/llm.ts` — OpenAI SDK with configurable baseURL
  - `package.json` — swap groq-sdk for openai
  - Docs — .env.example, README, ARCHITECTURE, DEPLOYMENT
-->

## Test plan

<!-- Tick what you verified locally before pushing. CI reruns these. -->

- [ ] `bun run typecheck`
- [ ] `bun run lint`
- [ ] `bun run test` (39 TS tests)
- [ ] `bun run test:rust` (17 Rust tests)
- [ ] `bun run build` (production build clean)
- [ ] Manual smoke test — describe:

## Non-negotiables preserved

<!-- Check the ones this PR touches. -->

- [ ] No secrets committed (`.env.local` stays out of git)
- [ ] Viktor's prompt still has `GROUND TRUTH` + `PLAYER CLAIMS SO FAR` + `INTERROGATION RULES` blocks
- [ ] `applyServerGate` still enforces (trust+Δ ≥ 80 ∧ exchange ≥ 3) for pass
- [ ] Stateless backend — no server sessions
- [ ] Single-viewport layout holds (no window scrolling)
- [ ] Audio core mechanic intact (`useGuardVoice`, amplitude → mouth)
- [ ] Graceful TTS fallback still works when ElevenLabs is unreachable

## Follow-ups / known issues

<!-- Anything intentionally deferred. -->
