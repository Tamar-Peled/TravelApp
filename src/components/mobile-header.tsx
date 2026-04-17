"use client";

import { Compass, Folder, Plus } from "lucide-react";

type MobileHeaderProps = {
  onAdd: () => void;
  onOpenTrips: () => void;
};

export function MobileHeader({ onAdd, onOpenTrips }: MobileHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-zinc-200/70 bg-[#FAF9F6]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-md lg:hidden">
      <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_6px_20px_-6px_rgba(15,92,86,0.45)]">
          <Compass className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-900">
            TravelAI
          </p>
          <p className="truncate text-[11px] font-medium text-zinc-500">
            Plan smarter
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenTrips}
          className="touch-manipulation flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200/90 bg-white text-zinc-700 shadow-sm transition-colors active:bg-zinc-50"
          aria-label="Open trips"
        >
          <Folder className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="touch-manipulation flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_-8px_rgba(15,92,86,0.45)] transition-transform active:scale-95"
          aria-label="Add new item"
        >
          <Plus className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </header>
  );
}
