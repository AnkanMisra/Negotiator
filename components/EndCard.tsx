"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { EndCaseFile } from "@/lib/endCaseFile";

export function EndCard({
  status,
  caseFile,
  onReplay,
}: {
  status: "won" | "lost";
  caseFile: EndCaseFile;
  onReplay: () => void;
}) {
  const won = status === "won";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="absolute inset-0 z-20 overflow-y-auto bg-black/90 px-4 py-6 font-mono backdrop-blur-sm"
    >
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-xl text-center">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className={`mb-3 text-4xl tracking-[0.3em] sm:text-5xl ${
              won ? "text-emerald-300" : "text-red-500"
            }`}
            style={{
              textShadow: won
                ? "0 0 24px rgba(52,211,153,0.6)"
                : "0 0 24px rgba(239,68,68,0.6)",
            }}
          >
            {won ? "CROSSED" : "ARRESTED"}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.72 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="mx-auto mb-6 max-w-sm px-6 text-sm text-neutral-400"
          >
            {won
              ? "The gate lifts. Rain keeps falling."
              : "A door slams. The radio crackles. Your name goes in a book."}
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.55 }}
            className="border border-neutral-700/80 bg-neutral-950/80 p-4 text-left shadow-[0_0_32px_rgba(0,0,0,0.45)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">
                  Case file {caseFile.caseNumber}
                </div>
                <div className="mt-1 text-lg uppercase tracking-[0.18em] text-neutral-100">
                  {caseFile.verdict}
                </div>
              </div>
              <div
                className={`border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${
                  won
                    ? "border-emerald-500/50 text-emerald-300"
                    : "border-red-500/50 text-red-300"
                }`}
              >
                {caseFile.secretLabel}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric label="Trust" value={`${caseFile.trust}`} tone="emerald" />
              <Metric label="Suspicion" value={`${caseFile.suspicion}`} tone="red" />
              <Metric label="Turns" value={`${caseFile.turns}`} />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <SectionTitle>Passport</SectionTitle>
                <Fact label="Name" value={caseFile.passport.name} />
                <Fact label="Origin" value={caseFile.passport.origin} />
                <Fact label="Purpose" value={caseFile.passport.purpose} />
              </div>
              <div className="space-y-2">
                <SectionTitle>Statement Log</SectionTitle>
                {caseFile.claims.length > 0 ? (
                  caseFile.claims.map((claim) => (
                    <Fact
                      key={`${claim.label}:${claim.value}`}
                      label={claim.label}
                      value={claim.value}
                    />
                  ))
                ) : (
                  <div className="text-xs leading-relaxed text-neutral-500">
                    No reliable statements recorded.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-neutral-800 pt-3">
              <div className="text-xs leading-relaxed text-neutral-400">
                {caseFile.secretFinding}
              </div>
              <blockquote className="mt-3 border-l border-neutral-700 pl-3 text-xs italic leading-relaxed text-neutral-500">
                {caseFile.finalGuardLine}
              </blockquote>
              <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-neutral-600">
                {caseFile.outcomeNote}
              </div>
            </div>
          </motion.section>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.35, duration: 0.4 }}
            onClick={onReplay}
            className="mt-6 border border-neutral-600 px-5 py-2 text-xs uppercase tracking-[0.3em] text-neutral-300 transition-colors hover:border-neutral-400 hover:text-white"
          >
            Try Again
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : "text-neutral-100";

  return (
    <div className="border border-neutral-800 bg-black/35 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.22em] text-neutral-600">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)] gap-2 text-xs">
      <span className="uppercase tracking-[0.18em] text-neutral-600">{label}</span>
      <span className="break-words text-neutral-300">{value}</span>
    </div>
  );
}
