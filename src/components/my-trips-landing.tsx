"use client";

import type { Trip } from "@prisma/client";
import { ArrowLeft, Plus } from "lucide-react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

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
  const dateLabel = (t: Trip) => {
    const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
    const start = t.startDate ? new Date(t.startDate) : null;
    const end = t.endDate ? new Date(t.endDate) : null;
    if (!start && !end) return null;
    if (start && end) {
      return `${fmt.format(start)} – ${fmt.format(end)}`.toUpperCase();
    }
    const one = start ?? end;
    return one ? fmt.format(one).toUpperCase() : null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:px-6 sm:pb-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:px-8 lg:pt-4">
      <div className="mx-auto w-full max-w-6xl max-w-[100vw]">
        <div className="sticky top-0 z-40 -mx-4 mb-2 flex items-center justify-between border-b border-zinc-200/70 bg-[#FAF9F6]/92 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top,0px))] backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
            }}
            className="touch-manipulation inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-700 active:bg-zinc-100/70"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </button>
          <div className="flex-1" aria-hidden />
          <div className="min-h-11 min-w-11" aria-hidden />
        </div>

        <div className="mb-4 hidden lg:mb-5 lg:block">
          <BreadcrumbNav
            segments={[
              { key: "library", label: "My Library" },
              { key: "trips", label: "My Trips" },
            ]}
            onNavigateLibrary={() => {
              // already on library
            }}
          />
        </div>

        <div className="text-center lg:text-left">
          <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-[var(--primary)] sm:text-3xl lg:text-4xl">
            Where to next
          </h1>
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
          <div className="mt-4">
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
                  title="Add Trip"
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Get started
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {trips.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTrip(t.id)}
                    className="touch-manipulation group relative aspect-[3/4] w-full overflow-hidden rounded-2xl text-left shadow-[0_2px_12px_-4px_rgba(15,23,42,0.16),0_1px_2px_-1px_rgba(15,23,42,0.06)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.20)] active:translate-y-0 active:shadow-[0_2px_12px_-4px_rgba(15,23,42,0.18)] sm:min-h-[180px] sm:aspect-auto sm:rounded-xl"
                  >
                    <div className="absolute inset-0 bg-zinc-100">
                      {tripCoverPhotoRefs[t.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/photo?ref=${encodeURIComponent(tripCoverPhotoRefs[t.id] as string)}&maxwidth=960`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-50" />
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                      {dateLabel(t) ? (
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
                          {dateLabel(t)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-base font-extrabold tracking-tight text-white sm:text-lg">
                        {t.name}
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-white/80">
                        {tripPlaceCounts[t.id] ?? 0} saved
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

