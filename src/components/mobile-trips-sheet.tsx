"use client";

import { Folder, X } from "lucide-react";
import type { Trip } from "@prisma/client";

type MobileTripsSheetProps = {
  open: boolean;
  onClose: () => void;
  trips: Trip[];
  selectedTripId: string | null;
  onSelectLibrary: () => void;
  onSelectTrip: (tripId: string) => void;
};

export function MobileTripsSheet({
  open,
  onClose,
  trips,
  selectedTripId,
  onSelectLibrary,
  onSelectTrip,
}: MobileTripsSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[min(70vh,520px)] rounded-t-2xl border border-zinc-100 bg-[#FAF9F6] shadow-[0_-8px_40px_-12px_rgba(15,23,42,0.15)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-trips-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <p
            id="mobile-trips-title"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            My Trips
          </p>
          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="max-h-[min(56vh,440px)] overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
          <button
            type="button"
            onClick={() => {
              onSelectLibrary();
              onClose();
            }}
            className={`flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              selectedTripId === null
                ? "bg-[var(--primary-muted)] text-[var(--primary)]"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Folder className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            My Library
          </button>
          <ul className="mt-1 space-y-0.5">
            {trips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTrip(t.id);
                    onClose();
                  }}
                  className={`flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    selectedTripId === t.id
                      ? "bg-[var(--primary-muted)] text-[var(--primary)]"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <Folder className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
