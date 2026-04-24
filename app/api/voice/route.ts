import { NextRequest } from "next/server";
import { el, TTS_MODEL, VIKTOR_VOICE_ID, voiceSettingsFor } from "@/lib/elevenlabs";
import type { Mood } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text, mood } = (await req.json()) as { text: string; mood: Mood };
  if (!text || typeof text !== "string" || text.length > 300) {
    return new Response("bad input", { status: 400 });
  }

  const stream = (await el.textToSpeech.stream(VIKTOR_VOICE_ID, {
    text,
    modelId: TTS_MODEL,
    voiceSettings: voiceSettingsFor(mood),
    outputFormat: "mp3_44100_128",
  })) as unknown as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
    },
  });
}
