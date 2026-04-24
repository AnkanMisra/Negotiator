import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { Mood } from "./types";

export const el = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const VIKTOR_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";

export const TTS_MODEL = "eleven_flash_v2_5";

export const voiceSettingsFor = (mood: Mood) => {
  switch (mood) {
    case "calm":
      return { stability: 0.6, similarityBoost: 0.8, style: 0.2, useSpeakerBoost: true };
    case "suspicious":
      return { stability: 0.45, similarityBoost: 0.75, style: 0.4, useSpeakerBoost: true };
    case "angry":
      return { stability: 0.25, similarityBoost: 0.7, style: 0.7, useSpeakerBoost: true };
    case "amused":
      return { stability: 0.55, similarityBoost: 0.8, style: 0.5, useSpeakerBoost: true };
  }
};
