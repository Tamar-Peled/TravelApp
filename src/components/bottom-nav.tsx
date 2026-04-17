"use client";

import { NAV_ITEMS, type NavId } from "@/components/navigation";

type BottomNavProps = {
  active: NavId;
  onSelect: (id: NavId) => void;
  onComingSoon: () => void;
};

export function BottomNav({ active, onSelect, onComingSoon }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/80 bg-[#FAF9F6]/92 backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 pt-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => (item.comingSoon ? onComingSoon() : onSelect(item.id))}
                className={`touch-manipulation flex w-full min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors active:bg-zinc-100/90 ${
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className="h-[22px] w-[22px] shrink-0"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span
                  className={`max-w-full truncate text-[8px] font-semibold uppercase leading-none tracking-[0.12em] ${
                    isActive ? "text-[var(--primary)]" : "text-zinc-500"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
