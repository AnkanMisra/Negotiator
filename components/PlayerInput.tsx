"use client";
import { useState, KeyboardEvent } from "react";

export function PlayerInput({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed.slice(0, 180));
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const charCount = value.length;
  const nearLimit = charCount > 150;

  return (
    <div className="font-mono">
      <div className="flex items-stretch gap-2">
        {/* input column — prompt char + textarea */}
        <div className="flex-1 relative flex items-stretch border border-emerald-900/50 focus-within:border-emerald-500/70 bg-black/60">
          <span
            aria-hidden
            className="pl-3 pt-[9px] text-emerald-600/80 text-sm select-none"
          >
            &gt;
          </span>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 180))}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={disabled ? "…" : "speak, traveler"}
            className="flex-1 resize-none bg-transparent outline-none px-2 py-2 text-emerald-300 placeholder:text-emerald-900 caret-emerald-400 text-sm leading-6 disabled:text-emerald-700/60"
            autoFocus
          />
        </div>

        {/* send button — matches input height via items-stretch */}
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="px-4 border border-emerald-500/60 text-emerald-300 text-xs uppercase tracking-[0.25em] hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          Send
        </button>
      </div>

      {/* hint + counter row — outside the textarea so it never overlaps content */}
      <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
        <span className="text-emerald-900 tracking-[0.2em] uppercase">
          Enter to send · Shift+Enter for newline
        </span>
        <span
          className={
            nearLimit ? "text-red-500/70" : "text-emerald-900"
          }
        >
          {charCount}/180
        </span>
      </div>
    </div>
  );
}
