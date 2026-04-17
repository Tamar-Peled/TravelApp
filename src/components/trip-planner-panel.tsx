"use client";

import type { Trip } from "@prisma/client";
import { useMemo, useState } from "react";

export function TripPlannerPanel({ trips }: { trips: Trip[] }) {
  const [linkedTripId, setLinkedTripId] = useState<string | null>(null);
  const linkedTrip = useMemo(
    () => trips.find((t) => t.id === linkedTripId) ?? null,
    [linkedTripId, trips],
  );
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center px-4 py-8 sm:px-8 lg:min-h-[calc(100vh-0px)] lg:py-10">
      <div className="mb-8 max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
          Planner
        </p>
        <h1 className="mt-2 text-balance text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Turn saved places into day-by-day plans
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Drag a trip folder here to link context (dates, location), then drag trip items in.
        </p>
      </div>

      <div
        className="w-full max-w-lg rounded-2xl border border-dashed border-zinc-200/90 bg-white/60 px-6 py-10 text-center text-sm text-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("text/tripId")) e.preventDefault();
        }}
        onDrop={(e) => {
          const tripId = e.dataTransfer.getData("text/tripId");
          if (tripId) setLinkedTripId(tripId);
        }}
      >
        <p className="font-semibold text-zinc-800">
          {linkedTrip ? `Linked: ${linkedTrip.name}` : "Drop a trip here"}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Trips you can access will work here. (Planner UI is still minimal.)
        </p>
      </div>
    </div>
  );
}
