---
name: voice-ab
description: Generate short ElevenLabs audio samples for A/B comparison across voice IDs or mood settings, save to /tmp, and report paths. Use when picking the Viktor voice or tuning mood-to-voice-params. Requires ElevenLabs credits.
---

# Voice A/B

Generates comparison audio clips against the ElevenLabs API so a human can listen and pick the best voice or setting.

## When to invoke

- Choosing a different ElevenLabs voice for Viktor
- Sanity-checking that current `voiceSettingsFor(mood)` values feel right
- Producing a clean set of samples for the hackathon video voice reveal

## Prerequisites

- `ELEVENLABS_API_KEY` is set (in `.env.local` for TS backend, or as Worker secret for Rust backend)
- ElevenLabs account has credits. If credits are zero, abort and tell the user.
- Either the TS dev server (`/api/voice` at :3000) or the Rust Worker dev server (`/voice` at :8787) is running, OR you'll call the ElevenLabs SDK directly with the API key.

## Inputs the user may provide

- A list of voice IDs to compare (otherwise default to current `VIKTOR_VOICE_ID` + two contrasting pre-made voices)
- A list of moods to compare (otherwise all four: calm / suspicious / angry / amused)
- A test line (otherwise use the three canonical lines below)

## What to do

1. **Preflight.** Confirm credits and backend URL. If no backend is running, call ElevenLabs directly via the SDK in a one-off Bun script using `ELEVENLABS_API_KEY`.

2. **Test lines** — default to three, one per emotional register:

   ```
   suspicious: "Papers. Now."
   amused:     "You think I have not heard every lie this rain has heard?"
   angry:      "Turn around. Walk. Do not speak."
   ```

3. **Matrix.** One TTS call per (voice × line × mood). Default matrix = 3 × 3 × 4 = 36 clips. If the matrix would exceed 30 clips, narrow it before running — ask the user which axis to trim.

4. **Save.** Write to `/tmp/negotiator-voice-ab/<voice-id-short>/<mood>-<line-slug>.mp3`. Create directories first.

5. **Report.** Markdown table of voice × mood with paths. Suggest a listen order — e.g., "start with voice A / angry / 'Turn around' — that's the strongest differentiator." End with the macOS one-liner:

   ```bash
   for f in /tmp/negotiator-voice-ab/**/*.mp3; do afplay "$f"; done
   ```

6. **Do NOT** edit `lib/elevenlabs.ts` or `backend/src/tts.rs` to change the voice ID unless the user explicitly asks after listening. This skill generates; the user decides.

## Implementation

Prefer calling the running backend's `/voice` endpoint (same voice-settings logic the game uses) rather than hitting ElevenLabs directly. That makes the A/B a true apples-to-apples against gameplay.

If backend is down, use the SDK directly:

```ts
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
const el = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
const stream = await el.textToSpeech.stream(voiceId, {
  text,
  modelId: "eleven_flash_v2_5",
  voiceSettings: { /* mood preset */ },
  outputFormat: "mp3_44100_128",
});
await Bun.write(outPath, stream);
```

## Cost awareness

Each test line is ~25 chars — ~25 credits per clip. A 36-clip matrix is ~900 credits. Well inside any paid plan. Confirm with the user before generating a wider sweep. If the account has zero credits (the current situation at time of writing), skip this skill entirely and note the blocker.

## Related docs

- [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) — mood → voice-settings table
- [../../../docs/DEPLOYMENT.md](../../../docs/DEPLOYMENT.md) — where `ELEVENLABS_API_KEY` lives in prod (Worker secret)
