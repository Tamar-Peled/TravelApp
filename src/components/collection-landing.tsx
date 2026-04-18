"use client";

import type { Place, PlaceCategory, Trip } from "@prisma/client";
import {
  ArrowLeft,
  BusFront,
  Camera,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  LayoutGrid,
  List,
  CalendarRange,
  MapPin,
  Mountain,
  Plus,
  Share2,
  Trash2,
  UtensilsCrossed,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { buildTripBreadcrumb } from "@/lib/trip-breadcrumb";
import { PlaceDetailModal } from "@/components/place-detail-modal";
import { TripLinkShareModal } from "@/components/trip-link-share-modal";
import { TripShareModal } from "@/components/trip-share-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CategorySelect } from "@/components/category-select";
import { CATEGORY_META } from "@/lib/place-category-meta";
import { toast } from "sonner";

export type PlaceWithTrip = Place & {
  trip: Trip | null;
  /** Set after `plisma db push` + `prisma generate` */
  plannerOrder?: number | null;
};

export type PlaceCardData = {
  id: string;
  title: string;
  location: string;
  category: PlaceCategory | null;
  subLocation: string | null;
  description: string | null;
  photoReference: string | null;
  sourceUrl: string | null;
};

function CategoryBadge({
  category,
  onChange,
}: {
  category: PlaceCategory | null;
  onChange: (next: PlaceCategory | null) => void;
}) {
  return (
    <div
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <CategorySelect value={category} onChange={onChange} />
    </div>
  );
}

function PlaceCard({
  place,
  onOpen,
  onDelete,
  onUpdateCategory,
}: {
  place: PlaceCardData;
  onOpen: () => void;
  onDelete: () => void;
  onUpdateCategory: (next: PlaceCategory | null) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className="group relative flex min-h-[170px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_2px_18px_-8px_rgba(15,23,42,0.14),0_1px_2px_-1px_rgba(15,23,42,0.04)] transition-[box-shadow,transform,background-color] duration-300 ease-out hover:-translate-y-1 hover:bg-zinc-50/40 hover:shadow-[0_18px_44px_-22px_rgba(15,23,42,0.28)] active:translate-y-0"
    >
      <div className="relative">
        <div className="h-28 w-full bg-zinc-100">
          {place.photoReference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo?ref=${encodeURIComponent(place.photoReference)}&maxwidth=640`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-400">
              <ImageIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
          )}
        </div>
        <div className="absolute left-3 top-3 right-3 flex items-start justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="touch-manipulation relative z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/95 text-zinc-600 opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge category={place.category} onChange={onUpdateCategory} />
        </div>
        <h3 className="mt-3 text-balance text-[16px] font-semibold leading-snug tracking-tight text-zinc-900 sm:text-[17px]">
          {place.title}
        </h3>
        <p className="mt-1.5 text-sm text-zinc-500">{place.location}</p>
      </div>
    </article>
  );
}

function PlaceRow({
  place,
  onOpen,
  onDelete,
  onUpdateCategory,
  compact = false,
}: {
  place: PlaceCardData;
  onOpen: () => void;
  onDelete: () => void;
  onUpdateCategory: (next: PlaceCategory | null) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-3 shadow-[0_2px_14px_-8px_rgba(15,23,42,0.12),0_1px_2px_-1px_rgba(15,23,42,0.04)] transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_44px_-22px_rgba(15,23,42,0.22)]"
    >
      <div
        className={`shrink-0 overflow-hidden rounded-xl bg-zinc-100 ${
          compact ? "h-12 w-12 sm:h-[60px] sm:w-[60px]" : "h-[60px] w-[60px]"
        } ${compact ? "order-2 sm:order-none" : ""}`}
      >
        {place.photoReference ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photo?ref=${encodeURIComponent(place.photoReference)}&maxwidth=240`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-400">
            <ImageIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </div>

      <div className={`min-w-0 flex-1 ${compact ? "order-1 sm:order-none" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
            {place.title}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="touch-manipulation flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-50 group-hover:opacity-100"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-zinc-500">{place.location}</p>
          <CategoryBadge category={place.category} onChange={onUpdateCategory} />
        </div>
      </div>
    </div>
  );
}

function toCardData(place: PlaceWithTrip): PlaceCardData {
  const city = place.city?.trim();
  const url = place.sourceUrl?.trim();
  const desc = place.description?.trim();
  const location = city || place.location?.trim() || (desc ? desc.slice(0, 72) + (desc.length > 72 ? "…" : "") : url ? url : "—");
  return {
    id: place.id,
    title: place.title,
    location,
    category: place.category ?? null,
    subLocation: place.subLocation?.trim() || null,
    description: place.description?.trim() || null,
    photoReference: place.photoReference ?? null,
    sourceUrl: place.sourceUrl ?? null,
  };
}

type CollectionLandingProps = {
  places: PlaceWithTrip[];
  trips?: Trip[];
  selectedTrip: Trip | null;
  selectedTripId: string | null;
  selectedTripCoverPhotoRef?: string | null;
  loading: boolean;
  error: string | null;
  onAddPlace: () => void;
  onNavigateLibrary: () => void;
  onOpenPlanner: () => void;
  onRefresh: () => void;
};

export function CollectionLanding({
  places,
  trips = [],
  selectedTrip,
  selectedTripId,
  selectedTripCoverPhotoRef,
  loading,
  error,
  onAddPlace,
  onNavigateLibrary,
  onOpenPlanner,
  onRefresh,
}: CollectionLandingProps) {
  const cards = places.map(toCardData);
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkShareOpen, setLinkShareOpen] = useState(false);
  const [deletePlaceId, setDeletePlaceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [optimisticallyHiddenIds, setOptimisticallyHiddenIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Map<string, Partial<PlaceWithTrip>>
  >(() => new Map());
  const { data: session } = useSession();
  const [tripAccess, setTripAccess] = useState<{
    isShared: boolean;
    canEdit: boolean;
    sharedWithText: string | null;
  }>({ isShared: false, canEdit: true, sharedWithText: null });
  const crumbs = buildTripBreadcrumb(selectedTrip);
  const isTripView = Boolean(selectedTripId && selectedTrip);
  const [view, setView] = useState<"grid" | "list">("grid");
  const pageSize = 12;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const emptyTrip =
    isTripView && !loading && !error && cards.length === 0;

  const openPlace = useMemo(() => {
    const base = places.find((p) => p.id === openPlaceId) ?? null;
    if (!base) return null;
    const override = optimisticOverrides.get(base.id);
    return override ? ({ ...base, ...override } as PlaceWithTrip) : base;
  }, [openPlaceId, places, optimisticOverrides]);

  const visibleCards = useMemo(() => {
    const byId = new Map(places.map((p) => [p.id, p]));
    return cards
      .filter((c) => !optimisticallyHiddenIds.has(c.id))
      .map((c) => {
        const base = byId.get(c.id);
        const override = optimisticOverrides.get(c.id);
        const effective = override && base ? ({ ...base, ...override } as PlaceWithTrip) : base;
        return effective ? toCardData(effective) : c;
      });
  }, [cards, optimisticallyHiddenIds, optimisticOverrides, places]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleCards;
    return visibleCards.filter((c) => {
      const hay = [
        c.title,
        c.description ?? "",
        c.subLocation ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [visibleCards, searchQuery]);

  useEffect(() => {
    if (!isTripView || !selectedTripId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTripAccess({ isShared: false, canEdit: true, sharedWithText: null });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/trips/${selectedTripId}/collaborators`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          error?: string;
          viewer?: { isOwner?: boolean };
          collaborators?: Array<{
            role?: "EDITOR" | "VIEWER";
            user?: { id?: string };
          }>;
        };
        if (!res.ok) throw new Error(json.error || "Failed");
        const isOwner = json.viewer?.isOwner === true;
        const collaborator = (json.collaborators ?? []).find(
          (c) => c.user?.id && c.user.id === session?.user?.id,
        );
        const role = collaborator?.role;
        const canEdit = isOwner || role === "EDITOR";
        const count = (json.collaborators ?? []).length;
        const sharedWithText =
          count > 0 ? `Shared with ${count} ${count === 1 ? "person" : "people"}` : null;
        if (!cancelled) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTripAccess({
            isShared: count > 0,
            canEdit,
            sharedWithText,
          });
        }
      } catch {
        if (!cancelled) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTripAccess({ isShared: false, canEdit: true, sharedWithText: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTripView, selectedTripId, session?.user?.id]);

  const displayedCards = useMemo(
    () => filteredCards.slice(0, visibleCount),
    [filteredCards, visibleCount],
  );

  const groupedDisplayedCards = useMemo(() => {
    const groups = new Map<string, PlaceCardData[]>();
    for (const c of displayedCards) {
      const key = c.category ?? "Uncategorized";
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return [...groups.entries()];
  }, [displayedCards]);

  const groupedDisplayedCardsWithSubLocation = useMemo(() => {
    return groupedDisplayedCards.map(([cat, items]) => {
      const subs = new Map<string, PlaceCardData[]>();
      const hasAnyTagged = items.some((it) => Boolean(it.subLocation?.trim()));
      for (const it of items) {
        const key = it.subLocation?.trim() ? it.subLocation.trim() : "General";
        subs.set(key, [...(subs.get(key) ?? []), it]);
      }
      if (!hasAnyTagged) {
        // No sub-location tags at all: list directly under category (no "General" header).
        return [cat, [["", items]] as Array<[string, PlaceCardData[]]>] as const;
      }
      // Put General first, then alphabetical.
      const entries = [...subs.entries()].sort(([a], [b]) => {
        if (a === "General" && b !== "General") return -1;
        if (b === "General" && a !== "General") return 1;
        return a.localeCompare(b);
      });
      return [cat, entries] as const;
    });
  }, [groupedDisplayedCards]);

  const listGroups = useMemo(() => {
    const groups = new Map<string, PlaceCardData[]>();
    for (const c of displayedCards) {
      const key = c.category ?? "Uncategorized";
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return [...groups.entries()];
  }, [displayedCards]);

  const listGroupsWithSubLocation = useMemo(() => {
    return listGroups.map(([cat, items]) => {
      const subs = new Map<string, PlaceCardData[]>();
      const hasAnyTagged = items.some((it) => Boolean(it.subLocation?.trim()));
      for (const it of items) {
        const key = it.subLocation?.trim() ? it.subLocation.trim() : "General";
        subs.set(key, [...(subs.get(key) ?? []), it]);
      }
      if (!hasAnyTagged) {
        return [cat, [["", items]] as Array<[string, PlaceCardData[]]>] as const;
      }
      const entries = [...subs.entries()].sort(([a], [b]) => {
        if (a === "General" && b !== "General") return -1;
        if (b === "General" && a !== "General") return 1;
        return a.localeCompare(b);
      });
      return [cat, entries] as const;
    });
  }, [listGroups]);

  const listGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filteredCards) {
      const key = c.category ?? "Uncategorized";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [filteredCards]);

  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const collapseScope = useMemo(() => {
    return `trip:${selectedTripId ?? "none"}`;
  }, [selectedTripId]);

  useEffect(() => {
    const key = `travelai:collapsedCats:${collapseScope}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsedCats({});
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsedCats(parsed as Record<string, boolean>);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsedCats({});
      }
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsedCats({});
    }
  }, [collapseScope]);

  useEffect(() => {
    const key = `travelai:collapsedCats:${collapseScope}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(collapsedCats));
    } catch {
      // ignore
    }
  }, [collapsedCats, collapseScope]);

  function toggleCategory(cat: string) {
    setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  const canLoadMore = filteredCards.length > visibleCount;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(pageSize);
  }, [pageSize, selectedTripId]);

  // Default Grid for each trip; persist preference per scope (bonus).
  useEffect(() => {
    const scope = `trip:${selectedTripId ?? "none"}`;
    const key = `travelai:view:${scope}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === "grid" || raw === "list") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setView(raw);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setView("grid");
      }
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("grid");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripId]);

  useEffect(() => {
    const scope = `trip:${selectedTripId ?? "none"}`;
    const key = `travelai:view:${scope}`;
    try {
      window.localStorage.setItem(key, view);
    } catch {
      // ignore
    }
  }, [view, selectedTripId]);

  async function updateCategory(placeId: string, category: PlaceCategory | null) {
    await fetch(`/api/places/${placeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    onRefresh();
  }

  async function deletePlace(placeId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/places/${placeId}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Item deleted");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setOptimisticallyHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    } finally {
      setDeleting(false);
    }
  }

  async function saveFromModal(input: {
    id: string;
    description: string;
    notes: string;
    category: PlaceCategory | null;
    tripId: string | null;
    subLocation: string | null;
  }) {
    const prevOverride = optimisticOverrides.get(input.id);
    setOptimisticOverrides((prev) => {
      const next = new Map(prev);
      next.set(input.id, {
        description: input.description,
        notes: input.notes,
        category: input.category,
        tripId: input.tripId,
        subLocation: input.subLocation,
      });
      return next;
    });

    try {
      const res = await fetch(`/api/places/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: input.description,
          notes: input.notes,
          category: input.category,
          tripId: input.tripId,
          subLocation: input.subLocation,
        }),
      });
      const json = (await res.json()) as { error?: string; place?: PlaceWithTrip };
      if (!res.ok || !json.place) throw new Error(json.error || "Save failed");
      toast.success("Changes saved");
      setOptimisticOverrides((prev) => {
        const next = new Map(prev);
        next.delete(input.id);
        return next;
      });
      onRefresh();

      const movedOutOfTrip =
        Boolean(selectedTripId) && input.tripId !== selectedTripId;
      if (movedOutOfTrip) {
        setOptimisticallyHiddenIds((prev) => new Set(prev).add(input.id));
        toast.success(
          input.tripId
            ? `Moved to ${trips.find((t) => t.id === input.tripId)?.name ?? "trip"}`
            : "Removed from this trip",
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
      setOptimisticOverrides((prev) => {
        const next = new Map(prev);
        if (prevOverride) next.set(input.id, prevOverride);
        else next.delete(input.id);
        return next;
      });
    }
  }

  return (
    <>
      <div
        key={selectedTripId ?? "library"}
        className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] transition-opacity duration-150 ease-out sm:px-6 sm:pb-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:px-8 lg:pt-4"
      >
        <div className="w-full max-w-none">
        <div className="sticky top-0 z-40 -mx-4 mb-2 flex items-center justify-between border-b border-zinc-200/70 bg-[#FAF9F6]/92 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top,0px))] backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else onNavigateLibrary();
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
            segments={crumbs}
            onNavigateLibrary={onNavigateLibrary}
          />
        </div>

        {isTripView && selectedTrip && (
          <div className="mb-4 overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)]">
            <div className="relative h-40 w-full sm:h-48">
              {selectedTripCoverPhotoRef ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/photo?ref=${encodeURIComponent(selectedTripCoverPhotoRef)}&maxwidth=1400`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-50" />
              )}
            </div>
          </div>
        )}

        <div className="text-center lg:text-left">
          <div className="mt-1 flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-[var(--primary)] sm:text-3xl lg:text-4xl">
              {selectedTrip?.name ?? "Trip"}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
              <div className="hidden items-center overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm md:flex">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold ${
                    view === "grid" ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                  aria-pressed={view === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold ${
                    view === "list" ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                  aria-pressed={view === "list"}
                >
                  <List className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  List
                </button>
              </div>
              {selectedTripId && (
                <button
                  type="button"
                  onClick={onOpenPlanner}
                  className="touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200/70 bg-white px-3 py-2 text-sm font-semibold text-[var(--primary)] shadow-sm hover:bg-zinc-50"
                >
                  <CalendarRange className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Planner
                </button>
              )}
              {selectedTripId && (
                <button
                  type="button"
                  onClick={() => {
                    setLinkShareOpen(true);
                  }}
                  className="touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200/70 bg-transparent px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-white/70"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Share
                </button>
              )}
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-zinc-500 lg:mx-0">
            Items in this trip — add from TikTok, Instagram, or your notes.
          </p>
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {loading && (
          <p className="mt-8 text-center text-sm text-zinc-400 lg:text-left">
            Loading places…
          </p>
        )}

        {!loading && !error && (
          <div className="mt-6 sm:mt-8">
            <div className="mb-3 flex flex-col gap-0.5 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                Items in this trip
              </h2>
              <p className="text-xs text-zinc-500">
                {filteredCards.length} saved
              </p>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, description, or sub-location…"
                  className="min-h-11 w-full rounded-2xl border border-zinc-200/70 bg-white/80 py-3 pl-11 pr-4 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 outline-none transition-shadow focus:border-zinc-300 focus:bg-white focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                />
              </div>
            </div>

            {emptyTrip && (
              <button
                type="button"
                onClick={onAddPlace}
                className="w-full rounded-xl border border-dashed border-zinc-200/90 bg-white/60 px-6 py-14 text-center text-sm text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors hover:bg-white/75"
              >
                This trip is empty. Click to add your first item.
              </button>
            )}

            {!emptyTrip && (
              <>
                {view === "list" ? (
                  <div className="space-y-4">
                    {listGroupsWithSubLocation.map(([cat, subGroups]) => {
                      const meta = CATEGORY_META[cat] ?? null;
                      const label = meta?.label ?? cat;
                      const count =
                        listGroupCounts.get(cat) ??
                        subGroups.reduce((acc, [, its]) => acc + its.length, 0);
                      const collapsed = Boolean(collapsedCats[cat]);
                      return (
                        <section key={cat}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="sticky top-0 z-30 mb-2 flex w-full items-center justify-between rounded-xl border border-zinc-100 bg-white/90 px-3 py-2 text-left text-xs font-semibold text-zinc-700 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur hover:bg-white"
                            aria-expanded={!collapsed}
                          >
                            <span className="flex items-center gap-2">
                              {collapsed ? (
                                <ChevronRight className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                              )}
                              <span className="uppercase tracking-[0.14em] text-zinc-500">
                                {label}
                              </span>
                              <span className="text-zinc-400">({count})</span>
                            </span>
                          </button>
                          <div
                            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                              collapsed ? "max-h-0 opacity-0" : "max-h-[9999px] opacity-100"
                            }`}
                          >
                            <div className="space-y-4 pt-0.5">
                              {subGroups.map(([sub, items]) => (
                                <div key={sub}>
                                  <div className="space-y-3">
                                    {items.map((place) => (
                                      <PlaceRow
                                        key={place.id}
                                        place={place}
                                        compact={count > 3}
                                        onOpen={() => setOpenPlaceId(place.id)}
                                        onDelete={() => setDeletePlaceId(place.id)}
                                        onUpdateCategory={(next) =>
                                          void updateCategory(place.id, next)
                                        }
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      );
                    })}
                    {canLoadMore && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleCount((c) =>
                            Math.min(visibleCards.length, c + pageSize),
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                      >
                        Load more
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-10">
                    {groupedDisplayedCardsWithSubLocation.map(([cat, subGroups]) => {
                      const meta = CATEGORY_META[cat] ?? null;
                      const Icon = meta?.Icon ?? MapPin;
                      const label = meta?.label ?? cat;
                      const count =
                        listGroupCounts.get(cat) ??
                        subGroups.reduce((acc, [, its]) => acc + its.length, 0);
                      const collapsed = Boolean(collapsedCats[cat]);
                      return (
                        <section key={cat}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="sticky top-0 z-30 mb-4 flex w-full items-center justify-between rounded-2xl border border-zinc-100 bg-white/90 px-3 py-2.5 text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur hover:bg-white"
                            aria-expanded={!collapsed}
                          >
                            <span className="flex items-center gap-2">
                              {collapsed ? (
                                <ChevronRight className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                              )}
                              <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                              <span className="text-sm font-semibold tracking-tight text-zinc-900">
                                {label}
                              </span>
                              <span className="text-xs text-zinc-400">{count}</span>
                            </span>
                          </button>
                          <div
                            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                              collapsed ? "max-h-0 opacity-0" : "max-h-[9999px] opacity-100"
                            }`}
                          >
                            <div className="space-y-6 pt-0.5">
                              {subGroups.map(([sub, items]) => (
                                <div key={sub}>
                                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
                                    {items.map((place) => (
                                      <PlaceCard
                                        key={place.id}
                                        place={place}
                                        onOpen={() => setOpenPlaceId(place.id)}
                                        onDelete={async () => {
                                          setDeletePlaceId(place.id);
                                        }}
                                        onUpdateCategory={async (next) => {
                                          await updateCategory(place.id, next);
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
                {view !== "list" && canLoadMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => Math.min(visibleCards.length, c + pageSize))}
                    className="mt-4 w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                  >
                    Load more
                  </button>
                )}
              </>
            )}
          </div>
        )}
        </div>
      </div>
      <PlaceDetailModal
        open={openPlaceId !== null}
        place={openPlace}
        trips={trips}
        canEdit={openPlace?.tripId ? tripAccess.canEdit : true}
        sharedWithText={openPlace?.tripId ? tripAccess.sharedWithText : null}
        onClose={() => setOpenPlaceId(null)}
        onDeleted={() => {
          setOpenPlaceId(null);
          onRefresh();
        }}
        onUpdated={(next) => {
          void next;
          onRefresh();
        }}
        onRequestSave={(payload) => saveFromModal(payload)}
        onRequestDelete={async (id) => {
          setOptimisticallyHiddenIds((prev) => new Set(prev).add(id));
          await deletePlace(id);
        }}
      />
      {selectedTripId && selectedTrip && (
        <TripLinkShareModal
          open={linkShareOpen}
          tripId={selectedTripId}
          tripName={selectedTrip.name}
          onClose={() => setLinkShareOpen(false)}
        />
      )}
      {selectedTripId && (
        <TripShareModal
          open={shareOpen}
          tripId={selectedTripId}
          onClose={() => setShareOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={onAddPlace}
        title="Add Item"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-5 z-40 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_16px_48px_-20px_rgba(15,92,86,0.65)] transition-transform duration-300 hover:-translate-y-1 active:scale-95 lg:bottom-6 lg:right-6"
        aria-label="Add New Item"
      >
        <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>
      <ConfirmDialog
        open={deletePlaceId !== null}
        title="Are you sure?"
        description="This will permanently delete this item."
        cancelText="Cancel"
        confirmText="Delete"
        tone="danger"
        loading={deleting}
        onCancel={() => setDeletePlaceId(null)}
        onConfirm={() => {
          const id = deletePlaceId;
          setDeletePlaceId(null);
          if (!id) return;
          setOptimisticallyHiddenIds((prev) => new Set(prev).add(id));
          void deletePlace(id);
        }}
      />
    </>
  );
}
