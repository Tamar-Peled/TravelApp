"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { Calendar } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
}) {
  const buttonId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const display = value ? format(value, "MMM d, yyyy", { locale: enUS }) : "";

  return (
    <div className="relative" ref={popoverRef}>
      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
        <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        {label}
      </span>
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white/90 px-4 py-3 text-left text-sm font-medium text-zinc-900 shadow-sm hover:bg-white"
      >
        <span className={display ? "text-zinc-900" : "text-zinc-400"}>
          {display || "Select a date"}
        </span>
        <span className="text-xs font-semibold text-zinc-500">EN</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.35)]">
          <DayPicker
            mode="single"
            selected={value ?? undefined}
            onSelect={(d) => {
              onChange(d ?? null);
              setOpen(false);
            }}
            locale={enUS}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="min-h-10 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-10 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

