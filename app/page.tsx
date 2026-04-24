"use client";
import { useCallback, useEffect, useReducer, useState } from "react";
import { createInitialState, reducer } from "@/lib/gameState";
import { useGuardVoice } from "@/lib/audio";
import { useBackgroundMusic } from "@/lib/music";
import { GuardPortrait } from "@/components/GuardPortrait";
import { TrustMeter } from "@/components/TrustMeter";
import { SuspicionMeter } from "@/components/SuspicionMeter";
import { DialogueLog } from "@/components/DialogueLog";
import { PlayerInput } from "@/components/PlayerInput";
import { EndCard } from "@/components/EndCard";
import { PassportCard } from "@/components/PassportCard";
import { MusicToggle } from "@/components/MusicToggle";
import type { NegotiateReply, Secret } from "@/lib/types";

const OPENINGS: Record<Secret, string> = {
  contraband: "Papers. Now. Any luggage, open it.",
  fake_passport: "Papers. Hand them over. Slowly.",
  fugitive: "Name. Destination. Slowly.",
};

const MUSIC_SRC = "/music/ossuary-5-rest.mp3";

export default function Home() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const { speak, amplitude } = useGuardVoice();
  const music = useBackgroundMusic(MUSIC_SRC);
  const [started, setStarted] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);

  const opening = OPENINGS[state.secret];

  const runOpening = useCallback(async () => {
    dispatch({
      type: "GUARD_REPLY",
      reply: opening,
      mood: "suspicious",
      trustDelta: 0,
      suspicionDelta: 0,
    });
    try {
      await speak(opening, "suspicious");
    } catch (e) {
      console.error("opening audio failed", e);
    }
    dispatch({ type: "SPEAKING_END" });
  }, [speak, opening]);

  useEffect(() => {
    if (started && state.history.length === 0 && state.status === "speaking") {
      void runOpening();
    }
  }, [started, state.history.length, state.status, runOpening]);

  // Duck the background music while Viktor is speaking so his voice cuts through;
  // restore the moment he's done. Won/lost states keep the music bed playing.
  useEffect(() => {
    if (!music.started) return;
    if (state.status === "speaking") music.duck();
    else music.restore();
  }, [state.status, music]);

  const onSubmit = async (text: string) => {
    dispatch({ type: "PLAYER_SUBMIT", text });
    try {
      // Send history as "turns BEFORE this one" + playerInput separately.
      // The backend appends playerInput itself; duplicating caused the LLM to see the line twice.
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: state.secret,
          trust: state.trust,
          suspicion: state.suspicion,
          history: state.history,
          playerInput: text,
          passport: state.passport,
          claims: state.claims,
        }),
      });

      // Non-OK responses return an error envelope, not a NegotiateReply.
      // Dispatching undefined deltas would corrupt state into NaN, so bail
      // cleanly and let the player retry.
      if (!res.ok) {
        console.warn(`negotiate returned ${res.status}`);
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const secs = retryAfter ? parseInt(retryAfter, 10) : 0;
          setRateLimitMsg(
            secs > 0
              ? `Rate limit hit. Retry in ~${secs}s.`
              : "Rate limit hit. Try again in a moment.",
          );
          setTimeout(() => setRateLimitMsg(null), 6000);
        }
        dispatch({ type: "SPEAKING_END" });
        return;
      }
      // Clear any lingering rate-limit banner on a successful turn.
      if (rateLimitMsg) setRateLimitMsg(null);

      const data = (await res.json()) as Partial<NegotiateReply>;

      // Minimal shape check — fallback paths on the server can produce weird
      // payloads. If the core fields are missing, don't poison state.
      if (
        typeof data.reply !== "string" ||
        typeof data.trustDelta !== "number" ||
        typeof data.suspicionDelta !== "number" ||
        !data.mood ||
        !data.voiceStyle
      ) {
        console.warn("negotiate returned malformed payload", data);
        dispatch({ type: "SPEAKING_END" });
        return;
      }

      dispatch({
        type: "GUARD_REPLY",
        reply: data.reply,
        mood: data.mood,
        trustDelta: data.trustDelta,
        suspicionDelta: data.suspicionDelta,
        end: data.end,
        updatedClaims: data.updatedClaims,
      });
      try {
        await speak(data.reply, data.voiceStyle);
      } catch (e) {
        console.error("tts failed", e);
      }
      dispatch({ type: "SPEAKING_END" });
    } catch (err) {
      console.error("negotiate failed", err);
      dispatch({ type: "SPEAKING_END" });
    }
  };

  const replay = () => {
    dispatch({ type: "RESET" });
    setStarted(false);
    setTimeout(() => setStarted(true), 250);
  };

  const handleStart = () => {
    setStarted(true);
    // Must be called from the user-gesture click handler so the browser allows playback.
    music.start();
  };

  if (!started) return <StartScreen onStart={handleStart} />;

  const inputDisabled = state.status !== "idle";

  // suspicion-level: 0..1, drives CSS variables for rain intensity + flash frequency
  const suspicionLevel = Math.min(1, Math.max(0, state.suspicion / 100));

  return (
    <main
      className="relative h-screen overflow-hidden"
      style={
        {
          background:
            "radial-gradient(ellipse at 50% -10%, #1b0f0d 0%, #050302 60%), #050302",
          "--suspicion-level": suspicionLevel,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 rain-overlay pointer-events-none" aria-hidden />
      <div className="absolute inset-0 rain-heavy-overlay pointer-events-none" aria-hidden />
      {suspicionLevel >= 0.7 && (
        <div className="absolute inset-0 lightning-overlay pointer-events-none" aria-hidden />
      )}
      <div className="relative z-10 max-w-2xl mx-auto px-5 py-4 flex flex-col h-full gap-3">
        <header className="flex-shrink-0 flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-neutral-600 flicker">
          <span>— Checkpoint 7 —</span>
          <div className="flex items-center gap-3">
            <span>02:14 / Rain</span>
            <MusicToggle muted={music.muted} onToggle={music.toggleMute} />
          </div>
        </header>

        {rateLimitMsg && (
          <div
            role="alert"
            className="flex-shrink-0 border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-amber-200"
          >
            {rateLimitMsg}
          </div>
        )}

        <section className="flex-shrink-0 flex flex-col items-center">
          <GuardPortrait
            amplitude={amplitude}
            mood={state.mood}
            speaking={state.status === "speaking"}
            suspicion={state.suspicion}
          />
        </section>

        <section className="flex-shrink-0 grid grid-cols-2 gap-6">
          <TrustMeter value={state.trust} />
          <SuspicionMeter value={state.suspicion} />
        </section>

        <section className="flex-shrink-0">
          <PassportCard passport={state.passport} />
        </section>

        <section className="flex-1 min-h-0 overflow-hidden">
          <DialogueLog
            history={state.history}
            thinking={state.status === "thinking"}
          />
        </section>

        <section className="flex-shrink-0 pt-1">
          <PlayerInput disabled={inputDisabled} onSubmit={onSubmit} />
        </section>
      </div>

      {(state.status === "won" || state.status === "lost") && (
        <EndCard status={state.status} onReplay={replay} />
      )}
    </main>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 rain-overlay pointer-events-none" aria-hidden />
      <div className="relative z-10 text-center px-6 max-w-md">
        <div className="text-[10px] tracking-[0.4em] text-neutral-500 uppercase mb-5">
          — The Negotiator —
        </div>
        <h1
          className="text-3xl sm:text-5xl tracking-[0.28em] mb-6 text-neutral-100 flicker"
          style={{ textShadow: "0 0 28px rgba(255,255,255,0.22)" }}
        >
          PAPERS.
          <br />
          NOW.
        </h1>
        <p className="text-neutral-400 text-sm leading-relaxed mb-10">
          Midnight. The rain won&apos;t stop. The guard has nineteen years on
          this post. Talk your way through — or don&apos;t.
        </p>
        <button
          onClick={onStart}
          className="border border-neutral-500 text-neutral-200 text-xs uppercase tracking-[0.4em] px-7 py-3 hover:bg-white/5 hover:border-white transition-colors"
        >
          Approach the Gate
        </button>
        <div className="mt-10 space-y-1">
          <div className="text-[10px] text-neutral-600 tracking-widest">
            voice: elevenlabs · wits: cerebras · built in zed
          </div>
          <div className="text-[9px] text-neutral-700 tracking-wider">
            music:{" "}
            <a
              href="https://incompetech.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-neutral-500"
            >
              &ldquo;Ossuary 5 - Rest&rdquo; by Kevin MacLeod
            </a>
            {" · "}
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-neutral-500"
            >
              CC BY 3.0
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
