"use client";

import type { Trip } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddPlaceModal } from "@/components/add-place-modal";
import { BottomNav } from "@/components/bottom-nav";
import {
  CollectionLanding,
  type PlaceWithTrip,
} from "@/components/collection-landing";
import { MyTripsLanding } from "@/components/my-trips-landing";
import { MobileHeader } from "@/components/mobile-header";
import { MobileTripsSheet } from "@/components/mobile-trips-sheet";
import type { NavId } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { CreateTripModal } from "@/components/create-trip-modal";
import { TripPlannerPanel } from "@/components/trip-planner-panel";
import { Toast } from "@/components/toast";

function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 sm:py-16 lg:min-h-[calc(100vh-0px)]">
      <div className="max-w-md rounded-2xl border border-zinc-100 bg-white/80 px-6 py-10 text-center shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
          {title}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

export function AppShell() {
  const [active, setActive] = useState<NavId>("trips");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [places, setPlaces] = useState<PlaceWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [mobileTripsOpen, setMobileTripsOpen] = useState(false);
  const [recentTripIds, setRecentTripIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setLoadError(null);
      const [tRes, pRes] = await Promise.all([
        fetch("/api/trips", { cache: "no-store" }),
        fetch("/api/places", { cache: "no-store" }),
      ]);
      if (!tRes.ok || !pRes.ok) {
        throw new Error("Request failed");
      }
      const tJson = (await tRes.json()) as { trips: Trip[] };
      const pJson = (await pRes.json()) as { places: PlaceWithTrip[] };
      setTrips(tJson.trips);
      setPlaces(pJson.places);
    } catch {
      setLoadError(
        "Could not load trips and places. Set DATABASE_URL and run npx prisma db push.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("recentTripIds");
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setRecentTripIds(parsed.filter((x) => typeof x === "string"));
      }
    } catch {
      // ignore
    }
  }, []);

  function bumpRecentTrip(tripId: string) {
    setRecentTripIds((prev) => {
      const next = [tripId, ...prev.filter((id) => id !== tripId)].slice(0, 5);
      try {
        window.localStorage.setItem("recentTripIds", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  const visiblePlaces = useMemo(() => {
    if (active === "inbox") {
      return places.filter((p) => p.tripId === null);
    }
    if (active === "trip") {
      if (!selectedTripId) return [];
      return places.filter((p) => p.tripId === selectedTripId);
    }
    return places;
  }, [active, places, selectedTripId]);

  const tripPlaceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of places) {
      if (!p.tripId) continue;
      counts[p.tripId] = (counts[p.tripId] ?? 0) + 1;
    }
    return counts;
  }, [places]);

  const tripCoverPhotoRefs = useMemo(() => {
    const refs: Record<string, string | null> = {};
    for (const p of places) {
      if (!p.tripId) continue;
      if (refs[p.tripId]) continue;
      const ref = (p as any).photoReference as string | null | undefined;
      if (ref) refs[p.tripId] = ref;
    }
    return refs;
  }, [places]);

  const recentTrips = useMemo(() => {
    const byId = new Map(trips.map((t) => [t.id, t]));
    return recentTripIds.map((id) => byId.get(id)).filter(Boolean) as Trip[];
  }, [recentTripIds, trips]);

  function handleNavSelect(id: NavId) {
    setActive(id);
    if (id === "trips") {
      setSelectedTripId(null);
    }
    if (id === "inbox") {
      setSelectedTripId(null);
    }
  }

  function showComingSoon() {
    setToastMessage("We’re currently perfecting the AI Planner. Stay tuned!");
  }

  function handleSelectTrip(tripId: string) {
    setActive("trip");
    setSelectedTripId(tripId);
    bumpRecentTrip(tripId);
  }

  function handleTripCreated(trip: { id: string }) {
    setActive("trip");
    setSelectedTripId(trip.id);
    bumpRecentTrip(trip.id);
    void refreshData();
  }

  async function movePlaceToTrip(placeId: string, tripId: string | null) {
    try {
      await fetch(`/api/places/${placeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      await refreshData();
    } catch {
      // ignore for now
    }
  }

  function handleNavigateLibrary() {
    setActive("trips");
    setSelectedTripId(null);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#FAF9F6] lg:flex-row">
      <MobileHeader
        onAdd={() => setAddPlaceOpen(true)}
        onOpenTrips={() => setMobileTripsOpen(true)}
      />
      <Sidebar
        active={active}
        onSelect={handleNavSelect}
        onComingSoon={showComingSoon}
        recentTrips={recentTrips}
        selectedTripId={selectedTripId}
        onSelectTrip={handleSelectTrip}
        onDropPlaceToTrip={movePlaceToTrip}
      />

      <div className="min-h-0 min-w-0 flex-1 bg-[#FAF9F6] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.5rem+env(safe-area-inset-top,0px))] transition-[opacity] duration-150 ease-out lg:pb-0 lg:pt-0">
        {active === "trips" && (
          <MyTripsLanding
            trips={trips}
            tripPlaceCounts={tripPlaceCounts}
            tripCoverPhotoRefs={tripCoverPhotoRefs}
            loading={loading}
            error={loadError}
            onSelectTrip={handleSelectTrip}
            onCreateTrip={() => setCreateTripOpen(true)}
          />
        )}
        {(active === "inbox" || active === "trip") && (
          <CollectionLanding
            places={visiblePlaces}
            selectedTrip={selectedTrip}
            selectedTripId={selectedTripId}
            mode={active === "trip" ? "trip" : "inbox"}
            loading={loading}
            error={loadError}
            onAddPlace={() => setAddPlaceOpen(true)}
            onNavigateLibrary={handleNavigateLibrary}
            onRefresh={() => void refreshData()}
          />
        )}
        {active === "map" && (
          <PlaceholderPanel
            title="Map"
            description="See your places on a map — coming soon."
          />
        )}
        {active === "trip-planner" && <TripPlannerPanel trips={trips} />}
      </div>

      <BottomNav active={active} onSelect={handleNavSelect} onComingSoon={showComingSoon} />
      <MobileTripsSheet
        open={mobileTripsOpen}
        onClose={() => setMobileTripsOpen(false)}
        trips={trips}
        selectedTripId={selectedTripId}
        onSelectLibrary={() => {
          handleNavigateLibrary();
        }}
        onSelectTrip={(id) => {
          handleSelectTrip(id);
        }}
      />
      <AddPlaceModal
        open={addPlaceOpen}
        onClose={() => setAddPlaceOpen(false)}
        currentTripId={active === "trip" ? selectedTripId : null}
        onCreated={() => void refreshData()}
      />
      <CreateTripModal
        open={createTripOpen}
        onClose={() => setCreateTripOpen(false)}
        onCreated={handleTripCreated}
      />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
