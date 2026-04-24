"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Background music hook. Owns a single looping <audio> element, exposes
 * start/duck/restore/toggleMute. All volume transitions are smooth — we
 * fade over ~350ms via requestAnimationFrame so the track never jumps.
 *
 * Design notes:
 * - Browsers require a user gesture before `play()` succeeds; call `start()`
 *   from an onClick handler (the "Approach the Gate" button).
 * - `duck()` lowers volume while Viktor's voice is playing so speech cuts
 *   through. `restore()` brings it back on idle.
 * - `toggleMute()` is a hard override that wins over duck/restore.
 * - Cleanup on unmount pauses the audio and cancels any pending RAF.
 */

const BASE_VOLUME = 0.28;
const DUCK_VOLUME = 0.08;
const FADE_MS = 350;

export function useBackgroundMusic(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    audioRef.current = a;
    return () => {
      a.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src]);

  const fadeTo = useCallback((target: number) => {
    const a = audioRef.current;
    if (!a) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / FADE_MS);
      a.volume = Math.max(0, Math.min(1, start + (target - start) * t));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const start = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setStarted(true);
    // play() can reject if the browser hasn't received a gesture yet; swallow.
    a.play().catch(() => {});
    if (!mutedRef.current) fadeTo(BASE_VOLUME);
  }, [fadeTo]);

  const duck = useCallback(() => {
    if (mutedRef.current) return;
    fadeTo(DUCK_VOLUME);
  }, [fadeTo]);

  const restore = useCallback(() => {
    if (mutedRef.current) return;
    fadeTo(BASE_VOLUME);
  }, [fadeTo]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      fadeTo(next ? 0 : BASE_VOLUME);
      return next;
    });
  }, [fadeTo]);

  return { start, duck, restore, toggleMute, muted, started };
}
