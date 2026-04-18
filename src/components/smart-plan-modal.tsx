"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { MAX_PLANNER_DAYS } from "@/lib/planner-constants";

export type SmartPlanScope = "all" | "specific_days";

export function SmartPlanModal({
  open,
  dayCount,
  loading,
  onClose,
  onRun,
}: {
  open: boolean;
  dayCount: number;
  loading: boolean;
  onClose: () => void;
  onRun: (opts: {
    scope: SmartPlanScope;
    specificDays: number[];
    instructions: string;
  }) => void;
}) {
  const titleId = useId();
  const [scope, setScope] = useState<SmartPlanScope>("all");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [instructions, setInstructions] = useState("");

  const dayOptions = useMemo(
    () =>
      Array.from(
        { length: Math.min(MAX_PLANNER_DAYS, Math.max(1, dayCount)) },
        (_, i) => i + 1,
      ),
    [dayCount],
  );

  useEffect(() => {
    if (!open) return;
    setScope("all");
    setInstructions("");
    setSelectedDays(dayOptions.length ? [dayOptions[0]] : []);
  }, [open, dayOptions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  function toggleDay(d: number) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );
  }

  function submit() {
    if (scope === "specific_days" && selectedDays.length === 0) return;
    onRun({
      scope,
      specificDays: scope === "specific_days" ? selectedDays : [],
      instructions: instructions.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[8px]"
        aria-label="Close"
        disabled={loading}
        onClick={() => !loading && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-zinc-100 bg-[#FAF9F6] p-6 shadow-[0_24px_80px_-16px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.03)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-muted)] text-[var(--primary)]">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </div>
            <p id={titleId} className="text-base font-semibold tracking-tight text-zinc-900">
              Smart Plan
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Choose what to plan and optional instructions for the itinerary assistant.
        </p>

        <fieldset className="mt-5 space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Scope
          </legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2.5">
            <input
              type="radio"
              name="smart-plan-scope"
              checked={scope === "all"}
              onChange={() => setScope("all")}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="text-sm font-medium text-zinc-800">All items</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2.5">
            <input
              type="radio"
              name="smart-plan-scope"
              checked={scope === "specific_days"}
              onChange={() => setScope("specific_days")}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="text-sm font-medium text-zinc-800">Specific days</span>
          </label>
        </fieldset>

        {scope === "specific_days" ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Days to fill
            </p>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((d) => {
                const on = selectedDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`min-h-9 min-w-9 rounded-xl px-3 text-sm font-semibold transition-colors ${
                      on
                        ? "bg-[var(--primary)] text-white shadow-[0_8px_24px_-8px_rgba(15,92,86,0.45)]"
                        : "border border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {selectedDays.length === 0 ? (
              <p className="mt-2 text-xs text-amber-700">Select at least one day.</p>
            ) : null}
          </div>
        ) : null}

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Custom instructions
          </span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Day 1 very chill — only 1–2 nearby spots; dinners after 7pm…"
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="min-h-11 rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || (scope === "specific_days" && selectedDays.length === 0)}
            onClick={submit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                Planning…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Run Smart Plan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
