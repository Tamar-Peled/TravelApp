"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { toast } from "sonner";

type CreateTripModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (trip: { id: string }) => void;
};

export function CreateTripModal({ open, onClose, onCreated }: CreateTripModalProps) {
  const titleId = useId();
  const nameId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setStartDate(null);
    setEndDate(null);
    setSaving(false);
    setError(null);
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Trip name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null,
        }),
      });
      const data = (await res.json()) as { trip?: { id: string }; error?: string };
      if (!res.ok || !data.trip?.id) throw new Error(data.error || "Could not create trip");
      onCreated(data.trip);
      onClose();
      toast.success("Trip created");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create trip";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/12 backdrop-blur-[8px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-zinc-100 bg-[#FAF9F6] p-6 shadow-[0_24px_80px_-16px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.03)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id={titleId} className="text-lg font-semibold tracking-tight text-zinc-900">
              Create New Trip
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Name it, add dates (optional), and start saving places.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="touch-manipulation -m-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <label className="mt-6 block" htmlFor={nameId}>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Trip name
          </span>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tokyo 2026"
            className="min-h-11 w-full rounded-2xl border border-zinc-200/90 bg-white/90 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DatePicker
            label="Start date (Optional)"
            value={startDate}
            onChange={setStartDate}
          />
          <DatePicker
            label="End date (Optional)"
            value={endDate}
            onChange={setEndDate}
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation min-h-12 rounded-2xl border border-zinc-200/90 bg-white px-5 py-3 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 sm:min-h-11 sm:py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={saving}
            className="touch-manipulation min-h-12 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] shadow-[0_8px_24px_-6px_rgba(15,92,86,0.35)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60 sm:min-h-11 sm:py-2.5"
          >
            {saving ? "Processing..." : "Create Trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

