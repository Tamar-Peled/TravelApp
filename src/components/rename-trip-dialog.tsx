"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

export function RenameTripDialog({
  open,
  initialName,
  onCancel,
  onSave,
}: {
  open: boolean;
  initialName: string;
  onCancel: () => void;
  onSave: (name: string) => void | Promise<void>;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(initialName);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  async function submit() {
    const name = value.trim();
    if (!name || loading) return;
    setLoading(true);
    try {
      await onSave(name);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[8px] opacity-0 animate-[fadeIn_140ms_ease-out_forwards]"
        aria-label="Close"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-2xl border border-zinc-100 bg-[#FAF9F6] p-6 shadow-[0_24px_80px_-16px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.03)] opacity-0 animate-[fadeIn_140ms_ease-out_forwards]"
      >
        <p id={titleId} className="text-base font-semibold tracking-tight text-zinc-900">
          Rename trip
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Trip name
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none transition-shadow focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
          />
        </label>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || !value.trim()}
            className="min-h-11 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                Saving…
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
