"use client";

import type { Trip } from "@prisma/client";
import { Folder, Plus } from "lucide-react";

type MyTripsLandingProps = {
  trips: Trip[];
  tripPlaceCounts: Record<string, number>;
  tripCoverPhotoRefs: Record<string, string | null>;
  loading: boolean;
  error: string | null;
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
};

export function MyTripsLanding({
  trips,
  tripPlaceCounts,
  tripCoverPhotoRefs,
  loading,
  error,
  onSelectTrip,
  onCreateTrip,
}: MyTripsLandingProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 pt-3 sm:px-6 sm:pb-8 lg:px-8 lg:pt-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              My Trips
            </p>
            <h1 className="mt-1.5 text-balance text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-3xl">
              My Trips
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Your folders for planning — open a trip to see its places, or drop new
              saves into Inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateTrip}
            className="touch-manipulation inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#138a82] via-[var(--primary)] to-[#0a4540] px-6 py-3 text-[14px] font-semibold text-[var(--primary-foreground)] shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-8px_rgba(15,92,86,0.45),0_2px_6px_-2px_rgba(15,23,42,0.06)] transition-[transform,filter] duration-200 hover:brightness-[1.05] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Create New Trip
          </button>
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {loading && (
          <p className="mt-8 text-sm text-zinc-400">Loading trips…</p>
        )}

        {!loading && !error && (
          <div className="mt-8">
            {trips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200/90 bg-white/60 px-6 py-14 text-center text-sm text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-3xl bg-white shadow-[0_16px_48px_-30px_rgba(15,23,42,0.25)]">
                  <svg
                    viewBox="0 0 64 64"
                    width="56"
                    height="56"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 46c8-6 20-6 28 0"
                      fill="none"
                      stroke="#0f5c56"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M20 22c0-4 3-7 7-7h10c4 0 7 3 7 7v18c0 2-1 4-3 5l-7 4c-1 1-3 1-4 0l-7-4c-2-1-3-3-3-5V22z"
                      fill="#e7f5f3"
                      stroke="#0f5c56"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <circle cx="32" cy="28" r="4" fill="#0f5c56" opacity="0.9" />
                  </svg>
                </div>
                <p className="text-zinc-700 font-semibold">
                  Your world of trips starts here.
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Create your first one to get started!
                </p>
                <button
                  type="button"
                  onClick={onCreateTrip}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Get started
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {trips.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTrip(t.id)}
                    className="touch-manipulation group flex min-h-[180px] flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white text-left shadow-[0_2px_12px_-4px_rgba(15,23,42,0.07),0_1px_2px_-1px_rgba(15,23,42,0.04)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.12)] active:translate-y-0 active:shadow-[0_2px_12px_-4px_rgba(15,23,42,0.1)]"
                  >
                    <div className="relative h-24 w-full bg-zinc-100">
                      {tripCoverPhotoRefs[t.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/photo?ref=${encodeURIComponent(tripCoverPhotoRefs[t.id] as string)}&maxwidth=640`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-50" />
                      )}
                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-zinc-600 shadow-sm ring-1 ring-white/60 backdrop-blur">
                          <Folder className="h-5 w-5" strokeWidth={1.5} />
                        </div>
                        <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 ring-1 ring-white/60 backdrop-blur">
                          {tripPlaceCounts[t.id] ?? 0} places
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
                          {t.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {(t.region || t.city)
                            ? [t.region, t.city].filter(Boolean).join(" • ")
                            : "—"}
                        </p>
                      </div>
                      <p className="mt-4 text-xs font-medium text-zinc-400">
                        Open trip →
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

