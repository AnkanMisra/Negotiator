"use client";
import { motion } from "framer-motion";

export function EndCard({
  status,
  onReplay,
}: {
  status: "won" | "lost";
  onReplay: () => void;
}) {
  const won = status === "won";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm font-mono"
    >
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className={`text-4xl sm:text-5xl tracking-[0.3em] mb-4 ${
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
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="text-neutral-400 text-sm max-w-sm text-center px-6 mb-10"
      >
        {won
          ? "The gate lifts. Rain keeps falling."
          : "A door slams. The radio crackles. Your name goes in a book."}
      </motion.div>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        onClick={onReplay}
        className="border border-neutral-600 text-neutral-300 text-xs uppercase tracking-[0.3em] px-5 py-2 hover:border-neutral-400 hover:text-white transition-colors"
      >
        Try Again
      </motion.button>
    </motion.div>
  );
}
