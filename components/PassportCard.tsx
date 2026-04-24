"use client";
import type { Passport } from "@/lib/types";

export function PassportCard({ passport }: { passport: Passport }) {
  // Deterministic silhouette based on photoSeed — no real face, just a monochrome abstract portrait.
  const hue = (passport.photoSeed * 7) % 40;
  const tilt = ((passport.photoSeed % 7) - 3) * 0.6;

  return (
    <div
      className="relative mx-auto w-full max-w-[420px] select-none"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div
        className="relative border border-[#6b5a3a]/60 px-3 py-2 shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_6px_20px_rgba(0,0,0,0.6)]"
        style={{
          background:
            "linear-gradient(135deg, #d9c89a 0%, #c2ae7d 45%, #a89469 100%)",
          color: "#2a1f12",
          fontFamily:
            "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {/* watermark stripe */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 18px, rgba(255,255,255,0.06) 18px 19px)",
          }}
        />

        {/* header */}
        <div className="relative flex items-center justify-between text-[9px] tracking-[0.35em] uppercase">
          <span>Republic of Arstotzka</span>
          <span className="opacity-70">№ {String(passport.photoSeed).padStart(4, "0")}</span>
        </div>

        <div className="relative mt-2 flex gap-3">
          {/* photo silhouette */}
          <div
            className="flex h-[58px] w-[46px] flex-shrink-0 items-end justify-center overflow-hidden border border-[#4a3820]/50"
            style={{
              background: `linear-gradient(180deg, hsl(${30 + hue}, 18%, 55%), hsl(${20 + hue}, 25%, 28%))`,
            }}
          >
            <svg viewBox="0 0 60 80" className="h-full w-full">
              {/* head */}
              <circle cx="30" cy="28" r="12" fill="#1a120a" opacity="0.82" />
              {/* shoulders */}
              <path
                d="M8 80 Q8 52 30 44 Q52 52 52 80 Z"
                fill="#1a120a"
                opacity="0.82"
              />
            </svg>
          </div>

          {/* fields */}
          <div className="flex-1 text-[11px] leading-tight">
            <FieldRow label="NAME" value={passport.name.toUpperCase()} />
            <FieldRow label="ORIGIN" value={passport.origin.toUpperCase()} />
            <FieldRow label="PURPOSE" value={passport.purpose} stamped />
          </div>
        </div>

        {/* bottom MRZ-ish line for flavor */}
        <div className="relative mt-3 truncate border-t border-[#4a3820]/40 pt-1 text-[9px] tracking-[0.15em] opacity-70">
          {`P<ARS${passport.name.split(" ")[1]?.toUpperCase() ?? "XXXX"}<<${passport.name.split(" ")[0]?.toUpperCase() ?? "X"}<<<<<<<<`.slice(0, 44)}
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  stamped,
}: {
  label: string;
  value: string;
  stamped?: boolean;
}) {
  return (
    <div className="mb-1 flex items-baseline gap-2">
      <span className="min-w-[54px] text-[8px] tracking-[0.25em] opacity-70">
        {label}
      </span>
      {stamped ? (
        <span
          className="inline-block border-2 px-2 py-[1px] text-[11px] font-bold tracking-[0.2em]"
          style={{
            borderColor: "#7a1a14",
            color: "#7a1a14",
            transform: "rotate(-3deg)",
            letterSpacing: "0.2em",
          }}
        >
          {value}
        </span>
      ) : (
        <span className="text-[12px] font-semibold tracking-wider">{value}</span>
      )}
    </div>
  );
}
