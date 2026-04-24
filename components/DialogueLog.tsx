"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Turn } from "@/lib/types";

export function DialogueLog({ history, thinking }: { history: Turn[]; thinking: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Direct container scroll — never bubbles to the window, so the page
    // never jumps when a new turn lands.
    el.scrollTop = el.scrollHeight;
  }, [history.length, thinking]);

  return (
    <div
      ref={containerRef}
      className="h-full font-mono text-sm leading-relaxed space-y-3 overflow-y-auto pr-1 min-h-0"
    >
      <AnimatePresence initial={false}>
        {history.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {t.role === "guard" ? (
              <div>
                <span className="text-neutral-500 text-[10px] uppercase tracking-[0.25em] mr-2">
                  Viktor
                </span>
                <span className="text-neutral-100">{t.text}</span>
              </div>
            ) : (
              <div>
                <span className="text-emerald-500/70 text-[10px] uppercase tracking-[0.25em] mr-2">
                  You
                </span>
                <span className="text-emerald-300">&gt; {t.text}</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {thinking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-neutral-500 text-xs"
        >
          <span className="text-[10px] uppercase tracking-[0.25em] mr-2">Viktor</span>
          <span>…</span>
        </motion.div>
      )}
    </div>
  );
}
