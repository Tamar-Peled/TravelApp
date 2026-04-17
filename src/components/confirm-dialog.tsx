"use client";

import { useEffect, useId, useRef } from "react";
import { LoaderCircle } from "lucide-react";

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  cancelText = "Cancel",
  confirmText = "Delete",
  tone = "danger",
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  description?: string | null;
  cancelText?: string;
  confirmText?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
  }, [open]);

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

  const confirmCls =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[2px] opacity-0 animate-[fadeIn_140ms_ease-out_forwards]"
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
          {title}
        </p>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm ${confirmCls}`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

