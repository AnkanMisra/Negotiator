"use client";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";

export function SuspicionMeter({ value }: { value: number }) {
  const controls = useAnimationControls();
  const prev = useRef(value);

  useEffect(() => {
    if (value > prev.current) {
      controls.start({
        opacity: [1, 0.6, 1],
        transition: { duration: 0.6 },
      });
    }
    prev.current = value;
  }, [value, controls]);

  return (
    <div className="font-mono">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.25em] text-red-500/80 mb-1">
        <span>Suspicion</span>
        <span>{value}</span>
      </div>
      <motion.div
        animate={controls}
        className="h-2 w-full bg-red-950/70 border border-red-900/60 overflow-hidden"
      >
        <motion.div
          className="h-full bg-red-500"
          style={{ boxShadow: "0 0 12px rgba(239,68,68,0.8)" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </motion.div>
    </div>
  );
}
