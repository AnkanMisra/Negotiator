"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Mood } from "@/lib/types";

/**
 * Viktor's portrait — illustrated, animated, emotionally expressive.
 *
 * Design goals:
 * - Real anatomy: proper head silhouette, cheekbones, deep-set eye sockets,
 *   mustache + beard stubble, border-guard cap with gold badge.
 * - Alive: natural blinking, subtle breathing, gaze drift when calm.
 * - Emotionally legible: mood drives eyebrow angle, mouth curvature, eye
 *   squint, forehead creases, cheek flush. All transitions go through
 *   framer-motion springs — smooth, not snappy.
 * - Speech-reactive: amplitude drives mouth aperture with mood-aware lip shapes.
 *
 * Kept as SVG instead of Rive/Lottie to preserve the noir CRT aesthetic and
 * avoid bundling a 150KB animation runtime.
 */
export function GuardPortrait({
  amplitude,
  mood,
  speaking,
  suspicion = 0,
}: {
  amplitude: number;
  mood: Mood;
  speaking: boolean;
  suspicion?: number;
}) {
  // ── Life signs ────────────────────────────────────────────────────────────
  // Natural blink every 2.5-5s. Closes in ~80ms, holds 60ms, opens in ~100ms.
  const [eyesClosed, setEyesClosed] = useState(false);
  useEffect(() => {
    let timeoutOpen: ReturnType<typeof setTimeout>;
    let timeoutClose: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 2500;
      timeoutClose = setTimeout(() => {
        setEyesClosed(true);
        timeoutOpen = setTimeout(() => {
          setEyesClosed(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };
    scheduleBlink();
    return () => {
      clearTimeout(timeoutOpen);
      clearTimeout(timeoutClose);
    };
  }, []);

  // Gaze drift — small continuous iris movement when idle + calm.
  // Frozen forward when speaking or angry (focused).
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let raf = 0;
    const locked = speaking || mood === "angry";
    const tick = (t: number) => {
      if (locked) {
        setGaze((prev) =>
          prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 },
        );
      } else {
        setGaze({
          x: Math.sin(t / 1700) * 1.3,
          y: Math.cos(t / 2300) * 0.5,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speaking, mood]);

  // ── Mood-derived muscle groups ─────────────────────────────────────────────
  // Defensive finite-check — if upstream ever passes NaN, we fall back to 0
  // instead of propagating NaN into SVG attribute values.
  const safeSuspicion = Number.isFinite(suspicion) ? suspicion : 0;
  const safeAmplitude = Number.isFinite(amplitude) ? amplitude : 0;
  const suspFactor = Math.max(0, Math.min(1, safeSuspicion / 100));

  const browAngleL =
    mood === "angry" ? -18 : mood === "suspicious" ? -8 : mood === "amused" ? 6 : -2;
  const browAngleR = -browAngleL;
  const browYShift = mood === "angry" ? -2 : mood === "amused" ? 1 : 0;

  // Eye squint — narrows with both mood tension and climbing suspicion.
  const moodSquint = mood === "angry" ? 0.6 : mood === "suspicious" ? 0.78 : 1;
  const eyeSquint = Math.max(0.45, moodSquint - suspFactor * 0.18);

  // Mouth geometry — mood shapes the lip curve, amplitude opens the aperture.
  const mouthOpen = Math.max(0.8, Math.min(9, safeAmplitude * 18));
  const upperLipByMood: Record<Mood, string> = {
    // bezier: corner, mid-peak, corner
    calm:       "M 82 158 Q 100 161 118 158",
    suspicious: "M 82 159 Q 100 161 118 160",
    angry:      "M 80 160 Q 100 161 120 160",
    amused:     "M 82 156 Q 100 163 118 156",
  };
  const lowerLipByMood: Record<Mood, string> = {
    calm:       "M 82 162 Q 100 168 118 162",
    suspicious: "M 82 162 Q 100 166 118 162",
    angry:      "M 80 162 Q 100 163 120 162",
    amused:     "M 82 164 Q 100 173 118 164",
  };

  // Head tilt on angry — jaw sets, head dips ~2deg.
  const headTilt = mood === "angry" ? -2 : 0;

  // Breath — tiny scale on body at rest, faster/shallower when speaking.
  const breathe = speaking ? [1, 1.004, 1] : [1, 1.008, 1];
  const breatheDuration = speaking ? 0.9 : 3.6;

  // Cheek flush: red when angry, pallor when suspicious.
  const cheekOpacity =
    mood === "angry" ? 0.55 : mood === "amused" ? 0.28 : 0;
  const cheekColor = mood === "angry" ? "#8a2a20" : "#b26860";

  // Forehead creases — emerge as suspicion rises or on anger.
  const creaseOpacity = Math.max(
    mood === "angry" ? 0.7 : 0,
    suspFactor * 0.8,
  );

  // Ambient rim-light around portrait picks up mood — subtle noir color grade.
  const rimColor =
    mood === "angry"
      ? "rgba(140, 30, 25, 0.35)"
      : mood === "amused"
      ? "rgba(180, 140, 80, 0.25)"
      : mood === "suspicious"
      ? "rgba(60, 70, 90, 0.3)"
      : "rgba(70, 80, 100, 0.22)";

  return (
    <div className="relative w-full aspect-square max-w-[220px] mx-auto">
      {/* ambient mood rim-light */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: `radial-gradient(ellipse at 50% 55%, ${rimColor} 0%, transparent 70%)`,
          filter: "blur(6px)",
        }}
        aria-hidden
      />

      <motion.div
        className="absolute inset-0"
        animate={{ scale: breathe, rotate: headTilt }}
        transition={{
          scale: { duration: breatheDuration, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 0.8, ease: "easeOut" },
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            {/* Skin gradient — warm on cheekbones, cool in shadow, deep on jaw */}
            <radialGradient id="skin" cx="50%" cy="44%" r="62%">
              <stop offset="0%" stopColor="#caa085" />
              <stop offset="45%" stopColor="#a88367" />
              <stop offset="78%" stopColor="#5d4435" />
              <stop offset="100%" stopColor="#2a1c14" />
            </radialGradient>

            {/* Neck shading */}
            <linearGradient id="neck" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7a5c46" />
              <stop offset="100%" stopColor="#2a1d14" />
            </linearGradient>

            {/* Cap — dark blue felt */}
            <linearGradient id="cap" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#23303f" />
              <stop offset="100%" stopColor="#0a0f17" />
            </linearGradient>
            <linearGradient id="cap-band" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#141a22" />
              <stop offset="100%" stopColor="#05080c" />
            </linearGradient>

            {/* Iris gradient — dark amber brown */}
            <radialGradient id="iris" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#6a4a30" />
              <stop offset="60%" stopColor="#3a2616" />
              <stop offset="100%" stopColor="#1a0e08" />
            </radialGradient>

            {/* Uniform fabric */}
            <linearGradient id="uniform" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1a2230" />
              <stop offset="100%" stopColor="#070a0f" />
            </linearGradient>

            {/* Soft shadow filter for under-chin / under-brow */}
            <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>

            {/* Rough stubble pattern for chin/cheeks */}
            <pattern id="stubble" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.35" fill="#2a1a10" opacity="0.55" />
              <circle cx="2.5" cy="2.2" r="0.28" fill="#1a0e08" opacity="0.4" />
            </pattern>
          </defs>

          {/* ── Uniform / shoulders (bottom layer) ──────────────────────── */}
          <path
            d="M 20 200 Q 20 168 60 158 Q 100 154 140 158 Q 180 168 180 200 Z"
            fill="url(#uniform)"
            stroke="#0a0d13"
            strokeWidth="1"
          />
          {/* collar */}
          <path
            d="M 72 170 Q 100 182 128 170 L 128 178 Q 100 190 72 178 Z"
            fill="#0a0d13"
            stroke="#2a3140"
            strokeWidth="0.8"
          />
          {/* epaulet hints */}
          <rect x="38" y="172" width="18" height="5" fill="#2a3140" opacity="0.75" />
          <rect x="144" y="172" width="18" height="5" fill="#2a3140" opacity="0.75" />

          {/* ── Neck ───────────────────────────────────────────────────── */}
          <path
            d="M 80 152 Q 80 168 76 178 L 124 178 Q 120 168 120 152 Z"
            fill="url(#neck)"
          />
          {/* neck shadow under jaw */}
          <path
            d="M 74 150 Q 100 162 126 150"
            fill="none"
            stroke="#1a0e08"
            strokeWidth="2.2"
            opacity="0.55"
            filter="url(#soft)"
          />

          {/* ── Ears (small, behind head) ──────────────────────────────── */}
          <ellipse cx="38" cy="105" rx="6" ry="10" fill="#8a6a52" opacity="0.85" />
          <ellipse cx="162" cy="105" rx="6" ry="10" fill="#8a6a52" opacity="0.85" />

          {/* ── Head ───────────────────────────────────────────────────── */}
          {/*
            Oval with slight jaw asymmetry for realism; rendered with a
            radial gradient for cheekbone lighting.
          */}
          <path
            d="M 100 32
               C 134 32 160 60 160 100
               C 160 134 148 160 130 170
               C 118 178 108 180 100 180
               C 92 180 82 178 70 170
               C 52 160 40 134 40 100
               C 40 60 66 32 100 32 Z"
            fill="url(#skin)"
            stroke="#3a2418"
            strokeWidth="0.8"
          />

          {/* Cheek flush — red zones when angry, barely-there on amused */}
          <motion.ellipse
            cx="68"
            cy="125"
            rx="12"
            ry="7"
            fill={cheekColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: cheekOpacity }}
            transition={{ duration: 0.4 }}
          />
          <motion.ellipse
            cx="132"
            cy="125"
            rx="12"
            ry="7"
            fill={cheekColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: cheekOpacity }}
            transition={{ duration: 0.4 }}
          />

          {/* Jaw/chin stubble texture */}
          <path
            d="M 72 138 Q 100 168 128 138 Q 122 166 100 170 Q 78 166 72 138 Z"
            fill="url(#stubble)"
            opacity="0.9"
          />

          {/* Temple/cheekbone shading */}
          <path
            d="M 44 110 Q 56 132 72 140"
            fill="none"
            stroke="#3a2418"
            strokeWidth="2"
            opacity="0.45"
            filter="url(#soft)"
          />
          <path
            d="M 156 110 Q 144 132 128 140"
            fill="none"
            stroke="#3a2418"
            strokeWidth="2"
            opacity="0.45"
            filter="url(#soft)"
          />

          {/* ── Cap ─────────────────────────────────────────────────────── */}
          {/* crown */}
          <path
            d="M 38 78 Q 100 26 162 78 L 162 92 Q 100 78 38 92 Z"
            fill="url(#cap)"
            stroke="#000"
            strokeWidth="0.8"
          />
          {/* band */}
          <path d="M 36 88 L 164 88 L 164 98 L 36 98 Z" fill="url(#cap-band)" />
          {/* peak */}
          <path
            d="M 34 98 Q 100 104 166 98 L 166 100 Q 100 106 34 100 Z"
            fill="#04070b"
          />
          {/* badge */}
          <g transform="translate(100 72)">
            <circle r="7" fill="#c7a048" stroke="#3a2a10" strokeWidth="0.8" />
            <circle r="5.5" fill="#a88432" />
            <path d="M -3 0 L 0 -4 L 3 0 L 0 4 Z" fill="#3a2a10" />
          </g>
          {/* cap shadow on forehead */}
          <path
            d="M 50 92 Q 100 100 150 92 L 150 98 Q 100 108 50 98 Z"
            fill="#1a0f08"
            opacity="0.45"
          />

          {/* ── Forehead creases (suspicion/anger) ─────────────────────── */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: creaseOpacity }}
            transition={{ duration: 0.4 }}
          >
            <path
              d="M 72 100 Q 100 97 128 100"
              fill="none"
              stroke="#3a2418"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M 78 105 Q 100 102 122 105"
              fill="none"
              stroke="#3a2418"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* glabellar (between brows) vertical crease — only on angry */}
            {mood === "angry" && (
              <path
                d="M 97 108 L 97 116"
                stroke="#3a2418"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            )}
          </motion.g>

          {/* ── Eyebrows ──────────────────────────────────────────────── */}
          <motion.g
            animate={{ y: browYShift }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
          >
            <motion.path
              d="M 62 112 Q 75 108 88 112 L 86 116 Q 75 114 64 116 Z"
              fill="#1a0e08"
              animate={{ rotate: browAngleL }}
              style={{ transformOrigin: "75px 114px" }}
              transition={{ type: "spring", stiffness: 140, damping: 15 }}
            />
            <motion.path
              d="M 112 112 Q 125 108 138 112 L 136 116 Q 125 114 114 116 Z"
              fill="#1a0e08"
              animate={{ rotate: browAngleR }}
              style={{ transformOrigin: "125px 114px" }}
              transition={{ type: "spring", stiffness: 140, damping: 15 }}
            />
          </motion.g>

          {/* ── Eye sockets (subtle shadow under brows) ────────────────── */}
          <ellipse cx="75" cy="124" rx="13" ry="6" fill="#1a0f08" opacity="0.45" filter="url(#soft)" />
          <ellipse cx="125" cy="124" rx="13" ry="6" fill="#1a0f08" opacity="0.45" filter="url(#soft)" />

          {/* ── Eyes ──────────────────────────────────────────────────── */}
          <Eye
            cx={75}
            squint={eyeSquint}
            closed={eyesClosed}
            gazeX={gaze.x}
            gazeY={gaze.y}
          />
          <Eye
            cx={125}
            squint={eyeSquint}
            closed={eyesClosed}
            gazeX={gaze.x}
            gazeY={gaze.y}
          />

          {/* ── Nose ──────────────────────────────────────────────────── */}
          <path
            d="M 100 120
               Q 97 134 94 144
               Q 100 150 106 144
               Q 103 134 100 120 Z"
            fill="#3a2418"
            opacity="0.55"
          />
          {/* nose bridge highlight */}
          <path
            d="M 100 122 L 100 140"
            stroke="#c8a085"
            strokeWidth="1"
            opacity="0.45"
          />
          {/* nostrils */}
          <ellipse cx="96" cy="147" rx="1.6" ry="1" fill="#0a0504" opacity="0.8" />
          <ellipse cx="104" cy="147" rx="1.6" ry="1" fill="#0a0504" opacity="0.8" />

          {/* ── Nasolabial folds (subtle — shows age/stress) ─────────── */}
          <path
            d="M 90 148 Q 86 158 82 164"
            fill="none"
            stroke="#3a2418"
            strokeWidth="1"
            opacity={0.35 + suspFactor * 0.25}
            strokeLinecap="round"
          />
          <path
            d="M 110 148 Q 114 158 118 164"
            fill="none"
            stroke="#3a2418"
            strokeWidth="1"
            opacity={0.35 + suspFactor * 0.25}
            strokeLinecap="round"
          />

          {/* ── Mustache (thick, covers upper lip) ─────────────────────── */}
          <path
            d="M 70 154
               Q 82 150 98 154
               Q 100 155 102 154
               Q 118 150 130 154
               Q 124 160 110 160
               Q 100 162 90 160
               Q 76 160 70 154 Z"
            fill="#1a0e08"
            stroke="#05030a"
            strokeWidth="0.5"
          />

          {/* ── Mouth (below mustache) ─────────────────────────────────── */}
          <g>
            {/* upper lip — only slightly visible under mustache */}
            <motion.path
              d={upperLipByMood[mood]}
              fill="none"
              stroke="#2a1410"
              strokeWidth="2"
              strokeLinecap="round"
              animate={{ d: upperLipByMood[mood] }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            />

            {/* mouth interior (dark) — grows with amplitude */}
            <motion.ellipse
              cx={100}
              cy={163}
              rx={11}
              initial={{ ry: 0.8 }}
              animate={{ ry: mouthOpen }}
              transition={{ duration: 0.06 }}
              fill="#0a0504"
            />

            {/* lower lip */}
            <motion.path
              d={lowerLipByMood[mood]}
              fill="#5a2f26"
              stroke="#2a1410"
              strokeWidth="0.8"
              animate={{ d: lowerLipByMood[mood] }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            />
          </g>

          {/* ── Scar — kept from original, more subtle ─────────────────── */}
          <path
            d="M 134 110 Q 138 116 140 120 Q 144 126 146 132"
            stroke="#6a2a20"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M 134 110 Q 138 116 140 120 Q 144 126 146 132"
            stroke="#a64838"
            strokeWidth="0.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />

          {/* ── Rain specks on the portrait (light) ────────────────────── */}
          <g opacity="0.12">
            <line x1="24" y1="24" x2="28" y2="38" stroke="#87a7d8" strokeWidth="1" />
            <line x1="54" y1="12" x2="58" y2="26" stroke="#87a7d8" strokeWidth="1" />
            <line x1="156" y1="18" x2="160" y2="32" stroke="#87a7d8" strokeWidth="1" />
            <line x1="178" y1="44" x2="182" y2="58" stroke="#87a7d8" strokeWidth="1" />
            <line x1="90" y1="10" x2="94" y2="22" stroke="#87a7d8" strokeWidth="1" />
          </g>
        </svg>
      </motion.div>

      {/* mood indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-mono">
        {mood}
      </div>
    </div>
  );
}

/**
 * A single eye. Renders sclera + iris (with gaze offset) + pupil + highlight
 * + upper eyelid that closes on blink. `squint` scales the vertical opening
 * independently of blinking — used for mood (angry = narrow, calm = wide).
 */
function Eye({
  cx,
  squint,
  closed,
  gazeX,
  gazeY,
}: {
  cx: number;
  squint: number;
  closed: boolean;
  gazeX: number;
  gazeY: number;
}) {
  const cy = 127;
  const rx = 8;
  // Guard every numeric input — any NaN propagating from above would corrupt
  // SVG attributes (React logs a NaN attribute error and the scene glitches).
  const safeSquint = Number.isFinite(squint) ? squint : 1;
  const ry = 5.5 * safeSquint;
  const openRy = closed ? 0.2 : ry;
  const safeGazeX = Number.isFinite(gazeX) ? gazeX : 0;
  const safeGazeY = Number.isFinite(gazeY) ? gazeY : 0;

  return (
    <g>
      {/* sclera — off-white, slightly warmer than pure */}
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        initial={{ ry: openRy }}
        animate={{ ry: openRy }}
        transition={{ duration: closed ? 0.08 : 0.12, ease: "easeOut" }}
        fill="#ece3d2"
      />
      {/* iris (clipped by sclera via rendering order — drawn inside ellipse bounds) */}
      <g
        style={{
          // hide iris while blinking to avoid "floating eye" look
          display: closed ? "none" : "block",
        }}
      >
        <motion.g
          initial={{ x: 0, y: 0 }}
          animate={{ x: safeGazeX, y: safeGazeY }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        >
          <circle cx={cx} cy={cy} r={4.4} fill="url(#iris)" />
          <circle cx={cx} cy={cy} r={2} fill="#05030a" />
          {/* specular highlight */}
          <circle cx={cx - 1.4} cy={cy - 1.6} r={1} fill="#fff" opacity="0.85" />
        </motion.g>
      </g>
      {/* upper eyelid — a path that covers the eye when `closed` */}
      <motion.path
        d={`M ${cx - rx - 0.5} ${cy} Q ${cx} ${cy - ry - 1} ${cx + rx + 0.5} ${cy} L ${cx + rx + 0.5} ${cy - 0.2} L ${cx - rx - 0.5} ${cy - 0.2} Z`}
        fill="#8a6a52"
        initial={{ scaleY: 0.02 }}
        animate={{ scaleY: closed ? 1 : 0.02 }}
        transition={{ duration: closed ? 0.08 : 0.12, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* lower eyelid bag — subtle line for weariness */}
      <path
        d={`M ${cx - rx + 1} ${cy + ry + 0.8} Q ${cx} ${cy + ry + 2.2} ${cx + rx - 1} ${cy + ry + 0.8}`}
        fill="none"
        stroke="#3a2418"
        strokeWidth="0.8"
        opacity="0.75"
      />
      {/* eyelashes — few short strokes on upper lid */}
      {!closed && (
        <g opacity="0.65">
          <line x1={cx - 4} y1={cy - ry} x2={cx - 4} y2={cy - ry - 1.2} stroke="#0a0504" strokeWidth="0.6" />
          <line x1={cx - 1} y1={cy - ry - 0.3} x2={cx - 1} y2={cy - ry - 1.6} stroke="#0a0504" strokeWidth="0.6" />
          <line x1={cx + 2} y1={cy - ry - 0.3} x2={cx + 2} y2={cy - ry - 1.6} stroke="#0a0504" strokeWidth="0.6" />
          <line x1={cx + 5} y1={cy - ry} x2={cx + 5} y2={cy - ry - 1.2} stroke="#0a0504" strokeWidth="0.6" />
        </g>
      )}
    </g>
  );
}
