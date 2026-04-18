"use client";

import { Compass, Folder } from "lucide-react";
import { NAV_ITEMS, type NavId } from "@/components/navigation";
import type { Trip } from "@prisma/client";
import { signIn, signOut, useSession } from "next-auth/react";

type SidebarProps = {
  active: NavId;
  onSelect: (id: NavId) => void;
  onComingSoon: () => void;
  recentTrips: Trip[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  onDropPlaceToTrip: (placeId: string, tripId: string | null) => void;
};

const activeNav =
  "bg-[var(--primary-muted)] text-[var(--primary)] shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-[var(--primary-muted)]";
const inactiveNav =
  "text-zinc-500 hover:bg-white/60 hover:text-zinc-800";

export function Sidebar({
  active,
  onSelect,
  onComingSoon,
  recentTrips,
  selectedTripId,
  onSelectTrip,
  onDropPlaceToTrip,
}: SidebarProps) {
  const { data: session, status } = useSession();
  return (
    <aside
      className="hidden min-h-0 w-[248px] shrink-0 flex-col overflow-hidden border-r border-white/50 bg-white/50 py-8 shadow-[inset_-1px_0_0_rgba(255,255,255,0.6)] backdrop-blur-xl lg:flex lg:h-full lg:max-h-screen lg:self-stretch"
      aria-label="Primary"
    >
      <div className="mb-8 flex shrink-0 items-center gap-2.5 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_8px_24px_-6px_rgba(15,92,86,0.45)]">
          <Compass className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-zinc-900">
            TravelAI
          </p>
          <p className="text-[11px] font-medium text-zinc-500">Plan smarter</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <nav className="flex flex-col gap-1 text-[13px]" aria-label="Main">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Categories
            </p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => (item.comingSoon ? onComingSoon() : onSelect(item.id))}
                      className={`min-h-[44px] w-full rounded-2xl px-3 py-2.5 text-left font-medium transition-colors ${
                        isActive ? activeNav : inactiveNav
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 ${
                            isActive ? "text-[var(--primary)]" : "text-zinc-400"
                          }`}
                          strokeWidth={1.5}
                        />
                        {item.label}
                        {item.comingSoon && (
                          <span className="ml-auto rounded-md border border-zinc-200/80 bg-zinc-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                            Coming soon
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Recent Trips
            </p>
            <ul className="space-y-0.5 pr-1">
              {recentTrips.map((t) => {
                const isTripActive =
                  (active === "trip" || active === "trip-planner") &&
                  selectedTripId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onSelectTrip(t.id)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/tripId", t.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        const placeId = e.dataTransfer.getData("text/placeId");
                        if (placeId) onDropPlaceToTrip(placeId, t.id);
                      }}
                      className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                        isTripActive ? activeNav : inactiveNav
                      }`}
                    >
                      <Folder
                        className={`h-[16px] w-[16px] shrink-0 ${isTripActive ? "text-[var(--primary)]" : "text-zinc-400"}`}
                        strokeWidth={1.25}
                      />
                      <span className="truncate">{t.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 shrink-0 border-t border-gray-100 bg-white p-4">
          {status === "authenticated" ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-3 py-2.5 ring-1 ring-white/70 backdrop-blur">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-zinc-900">
                  {session.user?.name ?? session.user?.email ?? "Signed in"}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {session.user?.email ?? " "}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="touch-manipulation rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signIn("google")}
              className="touch-manipulation w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)]"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
