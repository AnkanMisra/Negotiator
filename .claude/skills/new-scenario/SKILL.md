---
name: new-scenario
description: Scaffold a second guard persona with a new voice, new secret, and new system prompt in the Rust backend. Use only AFTER scenario 1 is polished and recorded. Do not use to add breadth at the expense of depth.
---

# New Scenario

Adds a second playable guard. Default is ONE guard — adding a second is a scope-widening move that must wait until scenario 1 is recording-ready.

## Gate before proceeding

Before touching any code, confirm all of these:

- [ ] Scenario 1 passes `/playtest-viktor` with calibrated win rates (sincere ~40%, absurd <10%, hostile arrest ≥30%)
- [ ] A gameplay video has already been recorded OR the user explicitly says they're widening scope on purpose
- [ ] The user has named the new guard, described their personality in one paragraph, and either picked or asked you to pick a contrasting ElevenLabs voice

If any are missing, stop and ask. Do not scaffold a shallow second scenario.

## Where the code lives

- **Before R2 (Rust migration):** Viktor persona is in [lib/llm.ts](../../../lib/llm.ts). Refactor stays in TS until Rust lands.
- **After R2:** Viktor persona lives in `backend/src/llm.rs`. Refactor the Rust code.

Check which state the repo is in (does `backend/src/llm.rs` exist?) and apply accordingly.

## What to do once greenlit

1. **Generalize the data model.**
   - Move the Viktor persona from the inline `system()` template into a `Persona` struct. Each persona holds `{ id, name, system_prompt_template, voice_id, opening_line, secrets: Map<Secret, String> }`.
   - `negotiate()` takes a `persona_id: String` argument and looks up the persona.
   - `VIKTOR_VOICE_ID` becomes `persona.voice_id`; `voice_settings_for(mood)` stays shared.
   - Frontend picks a persona — either random on start, or via a pre-game scenario picker.

2. **Add the new persona.** Mirror Viktor's structure. Reuse the existing `Secret` enum unless the user explicitly wants new secret types.

3. **Verify.**
   - `bunx tsc --noEmit` + `bunx eslint .` in `game/`.
   - `cargo check` + `cargo clippy -- -D warnings` in `backend/`.
   - Hit `/negotiate` with each `persona_id` via curl — confirm each reply sounds like a distinct character, not reskinned Viktor.
   - Re-run `/playtest-viktor` against scenario 1 to confirm NO regression.

4. **Do NOT** regress scenario 1. A Viktor playthrough after the refactor must still win on sincere and lose on absurd.

## Anti-patterns to avoid

- Don't duplicate the prompt template with light edits. Extract the shared structure first.
- Don't introduce scenario-selection UI before the backend can cleanly address a persona by id.
- Don't add a third scenario in the same session. Two scenarios tested and polished beats three half-broken.
- Don't couple scenarios to secrets — secrets are orthogonal. Any guard can face any secret.

## Related docs

- [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) — "What we are NOT building" lists the guardrails; extending the persona model is an explicit crossover
- [../../../docs/STATUS.md](../../../docs/STATUS.md) — check scenario 1 is polished + recorded before any scenario 2 work
- [../../../docs/TESTING.md](../../../docs/TESTING.md) — add types tests for any new persona-related fields on Rust side
