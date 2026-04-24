# Session handoff — The Negotiator

> Read this cold. Everything below is what the next agent needs to continue without losing context. If anything disagrees with `docs/SUBMISSION.md` or `docs/STATUS.md`, those are canonical — come back here to re-orient.

## TL;DR in 5 lines

- **Hackathon:** [hacks.elevenlabs.io/hackathons/5](https://hacks.elevenlabs.io/hackathons/5). Zed × ElevenLabs. **Deadline: ~6 days from 2026-04-24.**
- **What we're shipping:** *The Negotiator* — one-screen narrative game. Player types at border guard Viktor Marek; Groq shapes his reply; a second Groq call extracts structured claims from the input; Viktor's prompt carries both the passport (ground truth) and the running claim list so he can call out contradictions by name; ElevenLabs streams the voice.
- **The differentiator:** consistency-under-pressure gameplay. The passport + claim-memory system is what lifts this above every other ElevenLabs submission. Papers, Please insight: *interrogation is compelling when you can get caught in a lie*.
- **Judging reality:** the hackathon guide says *spend half your time on the video, not the code*. Video ≈ 50% of score. +50 per social post × 4 platforms = +200 bonus. **Ship the video, not a Rust port.**
- **Strategic pivot (still in force):** Rust migration (R2-R7) is **DEFERRED until after submission**. TypeScript backend routes (`app/api/*`) ship live.

## Where to read the full plan

| File | Purpose |
|---|---|
| [docs/SUBMISSION.md](docs/SUBMISSION.md) | **Master week-sprint doc** — day-by-day timeline, shot list, social templates, form copy |
| [docs/STATUS.md](docs/STATUS.md) | Phase-by-phase done/pending with estimates, blockers, weighted completion |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design + JSON contracts + mermaid diagrams + passport/claim flow |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel (current) + Cloudflare (future) deploy |
| [docs/TESTING.md](docs/TESTING.md) | 56-test suite, what's covered, what isn't |
| [CLAUDE.md](CLAUDE.md) | Non-negotiables + file map + conventions |
| [README.md](README.md) | Top-level project overview |

---

## ✅ What's DONE (this session + prior)

### Frontend — feature-complete
- Next.js 16 + React 19 + Turbopack. Typechecks + lints clean.
- **Game UI** ([app/page.tsx](app/page.tsx), 262 lines): start screen, game scene, replay loop, orchestration of speak() + music duck/restore + state dispatch.
- **Components** ([components/](components/)):
  - `GuardPortrait` (622 lines) — anatomical SVG redesign: bezier head, radial-gradient skin, temple/cheekbone shading, stubble texture; eyes subcomponent with sclera + iris + pupil + highlight + upper eyelid + lower bag + eyelashes; mustache + nose + nasolabial folds + scar + uniform + cap with badge. **Life signs:** blinking every 2.5-5 s, breathing scale, iris gaze drift (locks when speaking/angry), forehead creases that emerge with suspicion, cheek flush on angry, ambient rim-light color-grades per mood.
  - `PassportCard` (108 lines) — aged-paper ID with name/origin/stamped purpose, photo silhouette, MRZ-ish footer line.
  - `TrustMeter` — emerald + glow.
  - `SuspicionMeter` — red + pulse on rise.
  - `DialogueLog` — internal `containerRef.scrollTop`, never bubbles to window.
  - `PlayerInput` — terminal `>` prompt inside textarea, stretch SEND button (items-stretch), counter below (no overlap), keyboard hint, red warning past 150 chars.
  - `MusicToggle` — speaker icon in header.
  - `EndCard` — CROSSED / ARRESTED overlay.
- **`useGuardVoice` hook** ([lib/audio.ts](lib/audio.ts)): streaming fetch → blob → AudioContext → AnalyserNode → amplitude RAF → mouth openness. **Graceful fallback:** catches errors, awaits `max(1200, 30 × text.length)` ms so UI stays playable without voice credits.
- **`useBackgroundMusic` hook** ([lib/music.ts](lib/music.ts)): looping `HTMLAudioElement`, smooth RAF volume fades (350 ms), `start / duck / restore / toggleMute`. Base 0.28, duck 0.08.
- **Pure reducer** ([lib/gameState.ts](lib/gameState.ts)): PLAYER_SUBMIT / GUARD_REPLY / SPEAKING_END / RESET. Carries `passport` + `claims`. `mergeClaims()` de-dupes by field, trims, preserves reference on empty input. F1 off-by-one fix intact.
- **Passport generator** ([lib/passport.ts](lib/passport.ts)): Slavic name pool (10 first + 10 last), 10-origin pool, purpose biased by secret (contraband → BUSINESS cover, fugitive → TRANSIT).
- **Global styles** ([app/globals.css](app/globals.css)): dark CRT, reactive rain (base + heavy layer), lightning overlay (appears at suspicion ≥ 70), flicker keyframes.

### Backend (TypeScript — currently ships)
- `/api/negotiate` ([app/api/negotiate/route.ts](app/api/negotiate/route.ts)) — runs `extractClaims()` + `negotiate()` **concurrently** via `Promise.all`, returns `NegotiateReply + updatedClaims`. Error envelopes on 429/4xx/5xx. Fallback payload on catastrophic LLM errors.
- `/api/voice` ([app/api/voice/route.ts](app/api/voice/route.ts)) — ElevenLabs Flash v2.5 streaming passthrough.
- **Viktor prompt** ([lib/llm.ts](lib/llm.ts)): `GROUND TRUTH` block (passport name/origin/purpose) + `PLAYER CLAIMS SO FAR` block (from reducer) + `INTERROGATION RULES` block (name contradictions specifically, never invent). Strict `end="pass" FORBIDDEN unless` language, `"none"` sentinel.
- **`extractClaims`** (same file): cheap Groq call, temp 0, tool-forced `{claims: [{field, value}]}`, max 120 tokens. Skips extraction for short inputs or obvious questions.
- **Server-side gate** ([lib/gate.ts](lib/gate.ts)): `applyServerGate` — strips `end=pass` unless trust+Δ≥80 ∧ exchange≥3; strips `end=arrest` unless suspicion+Δ≥100. LLM compliance not required.
- **ElevenLabs voice settings per mood** ([lib/elevenlabs.ts](lib/elevenlabs.ts)): calm/suspicious/angry/amused maps.

### Rust backend (scaffold ONLY — deferred further work)
- [backend/](backend/) crate compiles clean for `wasm32-unknown-unknown`.
- `Cargo.toml` + `wrangler.toml` + Router in [src/lib.rs](backend/src/lib.rs).
- [src/types.rs](backend/src/types.rs) — mirrors TS types (Mood, Secret, Role, EndKind, Turn, NegotiateRequest, NegotiateReply, VoiceRequest), camelCase via serde. **17 round-trip tests.**
- [src/error.rs](backend/src/error.rs) — thiserror → 400/429/500/502/501.
- [src/handlers.rs](backend/src/handlers.rs) — **501 stubs**, not implemented. Deferred.

### Assets
- [public/music/ossuary-5-rest.mp3](public/music/ossuary-5-rest.mp3) — Kevin MacLeod, "Ossuary 5 - Rest", CC BY 3.0, 7.5 MB (256 kbps stereo). Attribution on start screen.

### Tests — 56 total, all passing
- **TS (bun test) — 39 tests, 87 assertions:**
  - [lib/gameState.test.ts](lib/gameState.test.ts) — reducer coverage + F1 regression + passport initial-shape + `mergeClaims` (5 cases) + `GUARD_REPLY.updatedClaims` merging (2 cases).
  - [lib/llm.test.ts](lib/llm.test.ts) — `applyServerGate` coverage.
- **Rust (cargo test) — 17 tests:**
  - [backend/src/types.rs](backend/src/types.rs) — serde round-trip, camelCase contract, omit-when-None/False rules.
- Scripts: `bun run test` · `bun run test:rust` · `bun run test:all`.
- Production build (`bun run build`) clean.
- Cargo clippy: only dead-code warnings on scaffolded types (deferred with R2+).

### Documentation (updated this session)
- [README.md](README.md), [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — updated with passport/claim flow, concurrent LLM pattern, new modules (music.ts, passport.ts, two new components), constants table
- [docs/STATUS.md](docs/STATUS.md) — 22 phases, 11 done, ≈72% weighted complete
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — TS-current / Rust-future paths both documented
- [docs/TESTING.md](docs/TESTING.md) — 56 tests, new coverage areas
- [docs/SUBMISSION.md](docs/SUBMISSION.md) — passport-first video shot list, updated description, social templates
- Project-local skills: `.claude/skills/playtest-viktor/`, `.claude/skills/voice-ab/`, `.claude/skills/new-scenario/`
- `scripts/playtest.ts` — empirical calibration (5 archetypes × 3 seeds)

---

## ⬜ What's PENDING

Master plan is in [docs/SUBMISSION.md](docs/SUBMISSION.md). Below is the same work organized for an agent to pick up.

### Immediate (today, no credits needed)

| ID | Task | Est. | Blocker |
|---|---|---|---|
| **S1** | `vercel --prod` — link project, add `LLM_API_KEY` + `ELEVENLABS_API_KEY` env vars, ship. Get a live URL for judges. | 20 m | None |
| **W0f** | Cover image (1080×1920 screenshot of game mid-turn, save to `assets/cover.png`) | 30 m | None |
| F4 | Typewriter keystroke SFX on `onKeyDown` in `PlayerInput` | 30 m | None — Web Audio click |
| F6 | Mobile 390px layout pass | 30 m | None — verify all sections fit |

### Day 1 — after valid ElevenLabs credits arrive

| ID | Task | Est. | Blocker |
|---|---|---|---|
| — | **Replace invalid `ELEVENLABS_API_KEY`** in `.env.local` and Vercel env | 5 m | Credits |
| W1a | Run `/voice-ab` skill — 6-10 Viktor voice samples, pick strongest | 1 h | Credits |
| W1b | Generate SFX pack via `scripts/generate-sfx.ts` (TO WRITE): stamp-approved/denied, gate-buzz, radio-squelch, thunder-distant, door-slam. Save to `public/sfx/`. Trigger at terminal states. | 1 h | Credits |
| W1c | (Optional) Generate ElevenLabs Music bed to replace or layer with current Kevin MacLeod track | 30 m | Credits |
| W1d | Record 10 gameplay takes at 1080p (OBS) | 2 h | Credits (voice) |
| W1e | Draft video script — 3-5 bullets, not word-for-word | 1 h | None |

### Day 2 — the differentiator
Guide: *"Take it outside. Film yourself using it with friends."* Most submissions won't do this.

| ID | Task | Est. |
|---|---|---|
| W2a | Friend reaction take — have a friend play on camera, honest reaction = content. Capture the passport-catch "wait WHAT" moment. | 2-3 h |
| W2b | Zed B-roll — ~3s of editing the Viktor prompt or handler in Zed | 30 m |

### Day 3 — edit in CapCut (60s vertical 9:16)

| ID | Task | Est. |
|---|---|---|
| W3a | Rough cut per shot list in [docs/SUBMISSION.md](docs/SUBMISSION.md) — passport hook at 3-8 s, catch moment at 8-16 s | 1 h |
| W3b | Auto-captions + manual cleanup | 30 m |
| W3c | Music + SFX layering at 15-20 % under dialogue | 30 m |
| W3d | Color / grade pass | 30 m |
| W3e | Export 1080p 9:16 MP4 H.264 30 fps | 15 m |

### Days 4-5 — social + submit

| ID | Task | Est. |
|---|---|---|
| W4 | Draft social posts for X / LinkedIn / Instagram / TikTok (templates in SUBMISSION.md) | 2 h |
| W5a | Post all 4 platforms, 30 min apart, with `@zeddotdev @elevenlabsio #ElevenHacks` | 2 h |
| W5b | Submit at `hacks.elevenlabs.io/hackathons/5` — repo, live URL, cover, video, description | 30 m |

### Day 6 — buffer
Keep empty on purpose for crises.

### Deferred (post-submission, NOT blocking)

| ID | Task | Why deferred |
|---|---|---|
| R2-R7 | Rust backend migration + claim extractor port | Judges don't evaluate backend language; TS ships fine |
| Second scenario | New guard persona | `.claude/skills/new-scenario/` gate refuses until scenario 1 is recorded |
| Mobile native | iOS/Android | Web + vertical 9:16 video covers mobile viewership |

---

## 🗺️ Non-negotiables (do not relitigate)

From [CLAUDE.md](CLAUDE.md):

- **Audio is the core mechanic.** Never weaken or bypass it.
- **Passport + claim memory is load-bearing.** Gameplay differentiator — do not remove.
- **Viktor never invents contradictions.** Only flags real mismatches against passport or prior claims.
- **Secrets stay server-side.** `LLM_API_KEY` / `ELEVENLABS_API_KEY` live in `.env.local` / Vercel env / Worker secrets.
- **Cost caps:** player input ≤ 180, guard reply ≤ 220, history ≤ 6 turns, claim extraction ≤ 120 tokens.
- **Viktor never breaks character** — no "as an AI", no stage directions.
- **Single-viewport layout.** Game must fit without window scrolling (both UX + vertical video capture).
- **ONE scenario until it's polished AND recorded.**
- **Stateless backend.** Client holds state (including passport + claims). No sessions / DashMap / WebSockets.
- **No Docker / VM / AWS / GCP / Fly / Render.** Vercel + Cloudflare Workers.
- **No server-side audio DSP.** Kills WASM deploy. Radio filter is client-side (BiquadFilter in AudioContext).

---

## 🏃 Quick-start commands

```bash
# dev
bun run dev             # http://localhost:3000
bun run typecheck       # tsc --noEmit
bun run lint            # eslint
bun run test            # bun test (39 TS tests)
bun run test:rust       # cd backend && cargo test (17 Rust tests)
bun run test:all        # both
bun run build           # production build

# playtest empirical calibration (against running /api/negotiate)
bun scripts/playtest.ts

# deploy (TS backend ships)
vercel link                               # one-time
vercel env add LLM_API_KEY production     # one-time
vercel env add ELEVENLABS_API_KEY production
vercel --prod
```

---

## ⚠️ Known live issues

| # | Severity | Issue | Handling |
|---|---|---|---|
| 1 | **blocker** | `ELEVENLABS_API_KEY` in `.env.local` returns 401 invalid | User replaces key. Voice fallback (F5) keeps game playable in the meantime. Dev-server logs show `invalid_api_key` on every `/api/voice` call currently. |
| 2 | low | Replay flash (~250 ms StartScreen visible on reset) | Cosmetic — deferred |
| 3 | trivial | Music MP3 is 7.5 MB | Acceptable on Vercel CDN; could re-encode to 128 kbps if bundle budget tightens |

---

## 🩹 Gotchas that bit us this session (avoid repeats)

- **429 rate limit poisoning state.** The negotiate route returns `{error: "rate_limited"}` on 429 — the client was casting blindly as `NegotiateReply`, dispatching undefined deltas, and cascading NaN through every motion animation, the portrait's eyeSquint, and crashing `speak()` via `undefined.length`. Fixed: `app/page.tsx:onSubmit` now checks `res.ok` and shape-validates the payload before dispatching. **Lesson:** always validate before dispatch.
- **`scrollIntoView` bubbles to window.** When content exceeds viewport, `scrollIntoView` walks up to the first scrollable ancestor — which becomes the window. Fixed: `DialogueLog` uses `containerRef.scrollTop = scrollHeight` directly, and the outer layout is `h-screen overflow-hidden` so the window is never scrollable.
- **Framer Motion "animate from undefined" warnings.** If you set `animate` without `initial`, motion logs a warning on first render. Not breaking, but noisy. Fix: always include `initial={{...}}` on `motion.*` with animated values.
- **Music autoplay blocked.** Browsers block `audio.play()` before user gesture. Fix: `music.start()` is called in the "Approach the Gate" click handler, not in a `useEffect`.
- **SVG NaN attributes.** If any numeric prop becomes `NaN`, React logs "Received NaN for y1 attribute". Fixed with `Number.isFinite()` guards in `GuardPortrait` + the state-validation fix above.

---

## 📊 Work summary

| Category | Done | Remaining |
|---|---|---|
| Frontend core | 100% | — |
| Passport + claim memory | 100% | — |
| TS backend routes | 100% | — |
| Rust scaffold | 100% | — |
| Rust real logic | **DEFERRED** | — |
| Tests | 56 passing | — |
| Documentation | 100% | — |
| F1 Viktor gate | 100% | — |
| F2 Reactive atmosphere | 100% | — |
| F3 Per-secret openings | 100% | — |
| F5 Voice fallback | 100% | — |
| A1 Viktor anatomy | 100% | — |
| U1/U2/U3 UI polish + music | 100% | — |
| Live URL (Vercel) | 0% | **S1 — 20 m** |
| F4 Typewriter SFX | 0% | 30 m |
| F6 Mobile pass | 0% | 30 m |
| Cover image | 0% | **W0f — 30 m** |
| Voice A/B + SFX pack | 0% | **W1 — ~3 h** (credits required) |
| Gameplay takes | 0% | **W1d — 2 h** (credits) |
| Friend reaction + Zed B-roll | 0% | **W2 — 3 h** |
| Video edit | 0% | **W3 — 3 h** |
| Social drafts + posts | 0% | **W4-W5a — 4 h** |
| Submission form | 0% | **W5b — 30 m** |
| **Total remaining** | | **≈ 17 hours** over 5-6 days |

Feasible. Main risk is ElevenLabs credit arrival time.

---

## Last-session notes (2026-04-24)

- Portrait redesign is done — Viktor no longer looks like a cartoon. Anatomical SVG with 622 lines of structure + life signs + mood-driven muscles.
- Background music is live (Kevin MacLeod track). Plan for Day 1 is to generate a custom ElevenLabs Music track and A/B against it; keep MacLeod as fallback.
- Scroll jank killed; input alignment rebuilt with terminal feel; all meters/passport/portrait sized to fit single-viewport vertical capture.
- The 429 → NaN cascade bug is fixed. Any future protocol changes should preserve the `res.ok` + shape-validation checks in `onSubmit`.
- `scripts/playtest.ts` should be re-run once LLM rate limits cool down, to re-verify calibration targets (sincere ~40% win, absurd <10% win, hostile ≥30% arrest). The passport mechanic may shift these targets — worth measuring.
- ElevenLabs credits blocker is external; nothing code-side to do until key is valid.
- Today's date as of this handoff: **2026-04-24**.
