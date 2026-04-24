# negotiator-worker

Rust backend for The Negotiator, running on Cloudflare Workers via [`workers-rs`](https://github.com/cloudflare/workers-rs).

## Status

**R1 scaffold.** Routes defined, handlers return 501. Real implementations come in R2 (`llm.rs`, Groq) and R3 (`tts.rs`, ElevenLabs).

## Develop

```bash
cargo check --target wasm32-unknown-unknown    # quick syntax check
cargo test                                     # 17 type-contract tests (native target)
bunx wrangler dev                              # local worker at :8787
```

Tests compile and run on the host (macOS) target, not wasm — the `worker` crate handles cross-compilation gracefully. The suite covers the JSON shape contracts between this crate and `game/lib/types.ts`, so drift between TS client and Rust server is caught at `cargo test` time.

## Secrets (one-time)

```bash
bunx wrangler secret put GROQ_API_KEY
bunx wrangler secret put ELEVENLABS_API_KEY
bunx wrangler secret put ELEVENLABS_VOICE_ID   # optional
```

## Deploy

```bash
bunx wrangler deploy
```

## Routes

| Method | Path | Status | Request | Response |
|---|---|---|---|---|
| GET | `/` | ✅ health | — | `text/plain` "OK" |
| POST | `/negotiate` | 🚧 stub (R2) | `NegotiateRequest` JSON | `NegotiateReply` JSON |
| POST | `/voice` | 🚧 stub (R3) | `VoiceRequest` JSON | `audio/mpeg` stream |

Type shapes in [src/types.rs](src/types.rs). They mirror [game/lib/types.ts](../lib/types.ts) and their JSON serialization is locked by **17 round-trip tests** (`cargo test`).

## Structure

```
src/
├─ lib.rs       # #[event(fetch)] + Router
├─ handlers.rs  # negotiate, voice (stubs → real in R2/R3)
├─ types.rs     # Mood, Secret, Turn, NegotiateRequest, NegotiateReply, VoiceRequest + tests
└─ error.rs     # Error enum → Response (400/429/500/502)
```

## See also

- [../README.md](../README.md) — project overview
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — full system design + data contracts
- [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) — `wrangler deploy` walkthrough + secrets + rollback
- [../docs/TESTING.md](../docs/TESTING.md) — test philosophy
- [../CLAUDE.md](../CLAUDE.md) — agent-facing conventions
