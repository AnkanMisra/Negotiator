"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Mood } from "./types";

export function useGuardVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      audio.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const ensureCtx = useCallback(() => {
    if (!audioRef.current) return;
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
  }, []);

  const startTicking = useCallback(() => {
    const loop = () => {
      const an = analyserRef.current;
      if (!an) return;
      const buf = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(buf);
      let sum = 0;
      // lower half of spectrum is where vocal energy sits
      const half = Math.floor(buf.length / 2);
      for (let i = 0; i < half; i++) sum += buf[i];
      const avg = sum / half / 255;
      setAmplitude(avg);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopTicking = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setAmplitude(0);
  }, []);

  const speak = useCallback(
    async (text: string, mood: Mood) => {
      const audio = audioRef.current;
      if (!audio) return;
      // Defend against upstream bugs that might pass empty/undefined text.
      // Without this, the fallback's `text.length` would crash.
      if (!text || typeof text !== "string") return;
      ensureCtx();
      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, mood }),
        });
        if (!res.ok) throw new Error(`voice ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audio.src = url;
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            audio.removeEventListener("ended", onEnd);
            audio.removeEventListener("error", onErr);
            URL.revokeObjectURL(url);
            stopTicking();
          };
          const onEnd = () => {
            cleanup();
            resolve();
          };
          const onErr = () => {
            cleanup();
            reject(new Error("audio playback failed"));
          };
          audio.addEventListener("ended", onEnd);
          audio.addEventListener("error", onErr);
          audio
            .play()
            .then(() => startTicking())
            .catch((e) => {
              cleanup();
              reject(e);
            });
        });
      } catch {
        // TTS unavailable (no credits, API down, playback failed).
        // Hold "speaking" state for a natural read-time pause so the UI
        // doesn't snap to idle instantly. Callers dispatch SPEAKING_END after us.
        const delay = Math.max(1200, 30 * text.length);
        await new Promise((r) => setTimeout(r, delay));
      }
    },
    [ensureCtx, startTicking, stopTicking],
  );

  return { speak, amplitude };
}
