"use client";
import { motion } from "framer-motion";

export function TrustMeter({ value }: { value: number }) {
  return (
    <div className="font-mono">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.25em] text-emerald-500/80 mb-1">
        <span>Trust</span>
        <span>{value}</span>
      </div>
      <div className="h-2 w-full bg-emerald-950/70 border border-emerald-900/60 overflow-hidden">
        <motion.div
          className="h-full bg-emerald-400"
          style={{ boxShadow: "0 0 12px rgba(52,211,153,0.7)" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
