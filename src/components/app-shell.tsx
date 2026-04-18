"use client";

import type { Trip } from "@prisma/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddPlaceModal } from "@/components/add-place-modal";
import { BottomNav } from "@/components/bottom-nav";
import {
  CollectionLanding,
  type PlaceWithTrip,
} from "@/components/collection-landing";
import { MyTripsLanding } from "@/components/my-trips-landing";
import type { NavId } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { CreateTripModal } from "@/components/create-trip-modal";
import { TripPlannerPanel } from "@/components/trip-planner-panel";
import { Toast } from "@/components/toast";
import { Plus } from "lucide-react";

function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[50dvh] flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 sm:py-16 lg:min-h-[calc(100dvh-0px)]">
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const didInitHistory = useRef(false);
  const suppressNextPush = useRef(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshData();
  }, [refreshData]);

  // Restore state on browser back/forward (mobile back gesture).
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const st = (e.state ?? null) as
        | { active?: NavId; selectedTripId?: string | null }
        | null;
      if (!st?.active) return;
      suppressNextPush.current = true;
      if ((st.active as string) === "inbox") {
        setActive("trips");
        setSelectedTripId(st.selectedTripId ?? null);
        return;
      }
      setActive(st.active);
      setSelectedTripId(st.selectedTripId ?? null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Push nav state to history so Back works naturally.
  useEffect(() => {
    if (!didInitHistory.current) {
      didInitHistory.current = true;
      try {
        window.history.replaceState({ active, selectedTripId }, "");
      } catch {
        // ignore
      }
      return;
    }
    if (suppressNextPush.current) {
      suppressNextPush.current = false;
      return;
    }
    try {
      window.history.pushState({ active, selectedTripId }, "");
    } catch {
      // ignore
    }
  }, [active, selectedTripId]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  const visiblePlaces = useMemo(() => {
    if (active === "trip" || active === "trip-planner") {
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
      const ref = p.photoReference;
      if (ref) refs[p.tripId] = ref;
    }
    return refs;
  }, [places]);

  const recentTrips = useMemo(() => {
    const dateKey = (t: Trip) => {
      const d = t.startDate ?? t.endDate ?? t.createdAt;
      return d instanceof Date ? d.getTime() : new Date(d).getTime();
    };
    return [...trips].sort((a, b) => dateKey(b) - dateKey(a)).slice(0, 5);
  }, [trips]);

  function handleNavSelect(id: NavId) {
    if (id === "trip-planner") {
      setActive("trip-planner");
      return;
    }
    setActive(id);
    if (id === "trips") {
      setSelectedTripId(null);
    }
  }

  function handleSelectTripForPlanner(tripId: string) {
    setSelectedTripId(tripId);
    setActive("trip-planner");
  }

  function showComingSoon() {
    setToastMessage("This area isn’t available yet — stay tuned!");
  }

  function handleSelectTrip(tripId: string) {
    setActive("trip");
    setSelectedTripId(tripId);
  }

  function handleTripCreated(trip: { id: string }) {
    setActive("trip");
    setSelectedTripId(trip.id);
    void refreshData();
  }

  async function handleDeleteTrip(tripId: string) {
    const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Could not delete trip");
    if (selectedTripId === tripId) {
      setSelectedTripId(null);
      if (active === "trip" || active === "trip-planner") {
        setActive("trips");
      }
    }
    await refreshData();
  }

  async function handleRenameTrip(tripId: string, name: string) {
    const res = await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Could not rename trip");
    await refreshData();
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
    <div className="flex min-h-[100svh] flex-col overflow-x-hidden bg-[#FAF9F6] min-h-[100dvh] lg:flex-row">
      <Sidebar
        active={active}
        onSelect={handleNavSelect}
        onComingSoon={showComingSoon}
        recentTrips={recentTrips}
        selectedTripId={selectedTripId}
        onSelectTrip={handleSelectTrip}
        onDropPlaceToTrip={movePlaceToTrip}
      />

      <div className="min-h-0 min-w-0 flex-1 bg-[#FAF9F6] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] transition-[opacity] duration-150 ease-out lg:pb-0 lg:pt-0">
        {active === "trips" && (
          <MyTripsLanding
            trips={trips}
            tripPlaceCounts={tripPlaceCounts}
            tripCoverPhotoRefs={tripCoverPhotoRefs}
            loading={loading}
            error={loadError}
            onSelectTrip={handleSelectTrip}
            onCreateTrip={() => setCreateTripOpen(true)}
            onDeleteTrip={handleDeleteTrip}
            onRenameTrip={handleRenameTrip}
          />
        )}
        {active === "trip" && selectedTripId && selectedTrip && (
          <CollectionLanding
            places={visiblePlaces}
            trips={trips}
            selectedTrip={selectedTrip}
            selectedTripId={selectedTripId}
            selectedTripCoverPhotoRef={tripCoverPhotoRefs[selectedTripId] ?? null}
            loading={loading}
            error={loadError}
            onAddPlace={() => setAddPlaceOpen(true)}
            onNavigateLibrary={handleNavigateLibrary}
            onOpenPlanner={() => setActive("trip-planner")}
            onRefresh={() => void refreshData()}
          />
        )}
        {active === "map" && (
          <PlaceholderPanel
            title="Map"
            description="Browse your places on a map. Detailed map tools are still in development."
          />
        )}
        {active === "trip-planner" && (
          <TripPlannerPanel
            trips={trips}
            places={places}
            selectedTripId={selectedTripId}
            onSelectTripForPlanner={handleSelectTripForPlanner}
            onBackToTripItems={() => {
              if (selectedTripId) setActive("trip");
              else setActive("trips");
            }}
            onRefresh={() => void refreshData()}
          />
        )}
      </div>

      <BottomNav active={active} onSelect={handleNavSelect} onComingSoon={showComingSoon} />
      {active === "trips" && (
        <button
          type="button"
          onClick={() => setCreateTripOpen(true)}
          title="Add Trip"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-5 z-40 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_16px_48px_-20px_rgba(15,92,86,0.65)] transition-transform duration-300 hover:-translate-y-1 active:scale-95 lg:bottom-6 lg:right-6"
          aria-label="Create new trip"
        >
          <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
        </button>
      )}
      <AddPlaceModal
        open={addPlaceOpen}
        onClose={() => setAddPlaceOpen(false)}
        currentTripId={
          active === "trip" || active === "trip-planner" ? selectedTripId : null
        }
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
