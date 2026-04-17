"use client";

import type { Place, PlaceCategory, Trip } from "@prisma/client";
import {
  BusFront,
  Camera,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  LayoutGrid,
  List,
  FolderPlus,
  MapPin,
  Mountain,
  Plus,
  Share2,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { buildTripBreadcrumb } from "@/lib/trip-breadcrumb";
import { PlaceDetailModal } from "@/components/place-detail-modal";
import { TripShareModal } from "@/components/trip-share-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

const INBOX_CRUMBS = [
  { label: "My Library", key: "library" },
  { label: "Inbox", key: "inbox" },
] as const;

export type PlaceWithTrip = Place & { trip: Trip | null };

export type PlaceCardData = {
  id: string;
  title: string;
  location: string;
  category: PlaceCategory | null;
  photoReference: string | null;
  sourceUrl: string | null;
};

const CATEGORY_META: Record<
  string,
  { label: string; cls: string; Icon: typeof MapPin }
> = {
  HOTEL: { label: "Hotel", cls: "bg-sky-500/[0.10] text-sky-900/80", Icon: MapPin },
  RESTAURANT: {
    label: "Restaurant",
    cls: "bg-orange-500/[0.10] text-orange-900/80",
    Icon: UtensilsCrossed,
  },
  VIEWPOINT: {
    label: "Viewpoint",
    cls: "bg-violet-500/[0.10] text-violet-900/80",
    Icon: Camera,
  },
  ACTIVITY: {
    label: "Activity",
    cls: "bg-emerald-500/[0.10] text-emerald-900/80",
    Icon: Mountain,
  },
  TRANSPORT: {
    label: "Transport",
    cls: "bg-zinc-500/[0.08] text-zinc-700",
    Icon: BusFront,
  },
};

function CategoryBadge({
  category,
  onChange,
}: {
  category: PlaceCategory | null;
  onChange: (next: PlaceCategory | null) => void;
}) {
  const meta = category ? CATEGORY_META[category] : null;
  return (
    <div
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <select
        value={category ?? ""}
        onChange={(e) =>
          onChange((e.target.value || null) as PlaceCategory | null)
        }
        className={`appearance-none rounded px-2 py-1 pr-6 font-mono text-[10px] font-semibold uppercase tracking-wide outline-none ring-1 ring-zinc-200/70 ${
          meta ? meta.cls : "bg-zinc-500/[0.06] text-zinc-700"
        }`}
      >
        <option value="">Uncategorized</option>
        {Object.keys(CATEGORY_META).map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500/70"
        strokeWidth={1.5}
      />
    </div>
  );
}

function PlaceCard({
  place,
  draggable,
  onOpen,
  onDelete,
  onUpdateCategory,
  onMoveToTrip,
}: {
  place: PlaceCardData;
  draggable: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onUpdateCategory: (next: PlaceCategory | null) => void;
  onMoveToTrip?: (placeId: string) => void;
}) {
  return (
    <article
      draggable={draggable}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/placeId", place.id);
        e.dataTransfer.effectAllowed = "move";
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
          {onMoveToTrip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToTrip(place.id);
              }}
              className="touch-manipulation relative z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/95 text-zinc-600 shadow-sm backdrop-blur hover:bg-white"
              aria-label="Move to Trip"
            >
              <FolderPlus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          )}
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
        <h3 className="mt-3 text-balance text-[16px] font-bold leading-snug tracking-tight text-zinc-900 sm:text-[17px]">
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
}: {
  place: PlaceCardData;
  onOpen: () => void;
  onDelete: () => void;
  onUpdateCategory: (next: PlaceCategory | null) => void;
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
      <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-xl bg-zinc-100">
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

      <div className="min-w-0 flex-1">
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
  mode: "inbox" | "trip";
  loading: boolean;
  error: string | null;
  onAddPlace: () => void;
  onNavigateLibrary: () => void;
  onRefresh: () => void;
};

export function CollectionLanding({
  places,
  trips = [],
  selectedTrip,
  selectedTripId,
  selectedTripCoverPhotoRef,
  mode,
  loading,
  error,
  onAddPlace,
  onNavigateLibrary,
  onRefresh,
}: CollectionLandingProps) {
  const cards = places.map(toCardData);
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
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
  const crumbs =
    mode === "trip" ? buildTripBreadcrumb(selectedTrip) : [...INBOX_CRUMBS];
  const isTripView = mode === "trip" && Boolean(selectedTripId && selectedTrip);
  const [view, setView] = useState<"grid" | "list">("grid");
  const pageSize = 12;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [moveMenuOpenForId, setMoveMenuOpenForId] = useState<string | null>(null);
  const [moveQuery, setMoveQuery] = useState("");
  const emptyTrip =
    isTripView && !loading && !error && cards.length === 0;
  const emptyLibrary =
    mode === "inbox" && !loading && !error && cards.length === 0;

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

  useEffect(() => {
    if (!isTripView || !selectedTripId) {
      setTripAccess({ isShared: false, canEdit: true, sharedWithText: null });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/trips/${selectedTripId}/collaborators`, {
          cache: "no-store",
        });
        const json = (await res.json()) as any;
        if (!res.ok) throw new Error(json.error || "Failed");
        const isOwner = json.viewer?.isOwner === true;
        const collaborator = (json.collaborators ?? []).find(
          (c: any) => c.user?.id && c.user.id === session?.user?.id,
        );
        const role = collaborator?.role as ("EDITOR" | "VIEWER" | undefined);
        const canEdit = isOwner || role === "EDITOR";
        const count = (json.collaborators ?? []).length;
        const sharedWithText =
          count > 0 ? `Shared with ${count} ${count === 1 ? "person" : "people"}` : null;
        if (!cancelled) {
          setTripAccess({
            isShared: count > 0,
            canEdit,
            sharedWithText,
          });
        }
      } catch {
        if (!cancelled) {
          setTripAccess({ isShared: false, canEdit: true, sharedWithText: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTripView, selectedTripId, session?.user?.id]);

  const grouped = useMemo(() => {
    if (!isTripView) return null;
    const groups = new Map<string, PlaceCardData[]>();
    for (const c of visibleCards) {
      const key = c.category ?? "Uncategorized";
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return [...groups.entries()];
  }, [visibleCards, isTripView]);

  const displayedCards = useMemo(
    () => visibleCards.slice(0, visibleCount),
    [visibleCards, visibleCount],
  );

  const groupedDisplayedCards = useMemo(() => {
    const groups = new Map<string, PlaceCardData[]>();
    for (const c of displayedCards) {
      const key = c.category ?? "Uncategorized";
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return [...groups.entries()];
  }, [displayedCards]);

  const listGroups = useMemo(() => {
    const groups = new Map<string, PlaceCardData[]>();
    for (const c of displayedCards) {
      const key = c.category ?? "Uncategorized";
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return [...groups.entries()];
  }, [displayedCards]);

  const listGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of visibleCards) {
      const key = c.category ?? "Uncategorized";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [visibleCards]);

  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const collapseScope = useMemo(() => {
    return isTripView && selectedTripId ? `trip:${selectedTripId}` : `mode:${mode}`;
  }, [isTripView, selectedTripId, mode]);

  useEffect(() => {
    const key = `travelai:collapsedCats:${collapseScope}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setCollapsedCats({});
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        setCollapsedCats(parsed as Record<string, boolean>);
      } else {
        setCollapsedCats({});
      }
    } catch {
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

  const canLoadMore = visibleCards.length > visibleCount;

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, mode, selectedTripId]);

  // Default Grid for each trip; persist preference per scope (bonus).
  useEffect(() => {
    const scope = isTripView && selectedTripId ? `trip:${selectedTripId}` : `mode:${mode}`;
    const key = `travelai:view:${scope}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === "grid" || raw === "list") {
        setView(raw);
      } else {
        setView("grid");
      }
    } catch {
      setView("grid");
    }
    setVisibleCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripId, mode, isTripView]);

  useEffect(() => {
    const scope = isTripView && selectedTripId ? `trip:${selectedTripId}` : `mode:${mode}`;
    const key = `travelai:view:${scope}`;
    try {
      window.localStorage.setItem(key, view);
    } catch {
      // ignore
    }
  }, [view, selectedTripId, mode, isTripView]);

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
  }) {
    const prevOverride = optimisticOverrides.get(input.id);
    setOptimisticOverrides((prev) => {
      const next = new Map(prev);
      next.set(input.id, {
        description: input.description,
        notes: input.notes,
        category: input.category,
        tripId: input.tripId,
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

      // If moved out of current view, optimistically hide so it disappears immediately.
      const movedOutOfInbox = mode === "inbox" && input.tripId !== null;
      const movedOutOfTrip =
        mode === "trip" && Boolean(selectedTripId) && input.tripId !== selectedTripId;
      if (movedOutOfInbox || movedOutOfTrip) {
        setOptimisticallyHiddenIds((prev) => new Set(prev).add(input.id));
        toast.success(
          input.tripId
            ? `Moved to ${trips.find((t) => t.id === input.tripId)?.name ?? "trip"}`
            : "Moved to Inbox",
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

  async function moveItem(placeId: string, tripId: string | null) {
    const name = tripId ? trips.find((t) => t.id === tripId)?.name ?? "trip" : "Inbox";
    // snappy disappearance
    const movedOutOfInbox = mode === "inbox" && tripId !== null;
    const movedOutOfTrip =
      mode === "trip" && Boolean(selectedTripId) && tripId !== selectedTripId;
    if (movedOutOfInbox || movedOutOfTrip) {
      setOptimisticallyHiddenIds((prev) => new Set(prev).add(placeId));
    }
    try {
      const res = await fetch(`/api/places/${placeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Move failed");
      toast.success(`Moved to ${name}`);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Move failed");
      setOptimisticallyHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    }
  }

  return (
    <>
      <div
        key={selectedTripId ?? "library"}
        className="flex min-h-0 flex-1 flex-col px-4 pb-6 pt-1 transition-opacity duration-150 ease-out sm:px-6 sm:pb-8 sm:pt-2 lg:px-8 lg:pt-4"
      >
        <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 lg:mb-5">
          <BreadcrumbNav
            segments={crumbs}
            onNavigateLibrary={onNavigateLibrary}
          />
        </div>

        {isTripView && selectedTrip && (
          <div className="mb-6 overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)]">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                  Trip
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {selectedTrip.name}
                </p>
                <p className="mt-1.5 max-w-2xl text-sm text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
                  {visibleCards.length} items saved in {selectedTrip.name}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center lg:text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            {isTripView ? "Trip" : "Inbox"}
          </p>
          <div className="mt-1.5 flex flex-col items-center gap-3 sm:mt-2 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-3xl">
              {isTripView && selectedTrip ? selectedTrip.name : <>Inbox</>}
            </h1>
            <div className="flex items-center gap-2">
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
              {isTripView && selectedTripId && (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-white"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Share
                </button>
              )}
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-zinc-500 lg:mx-0">
            {isTripView
              ? "Items in this trip — add from TikTok, Instagram, or your notes."
              : "All new extractions land here first. Review, then move into trips."}
          </p>

          <button
            type="button"
            onClick={onAddPlace}
            className="group mt-5 hidden min-h-[48px] min-w-[200px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#138a82] via-[var(--primary)] to-[#0a4540] px-8 py-3 text-[15px] font-medium text-[var(--primary-foreground)] shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-8px_rgba(15,92,86,0.45),0_2px_6px_-2px_rgba(15,23,42,0.06)] transition-[transform,filter] duration-200 hover:brightness-[1.05] active:scale-[0.99] md:inline-flex"
          >
            <Plus
              className="h-4 w-4 opacity-95"
              strokeWidth={2}
              aria-hidden
            />
              Add New Item
          </button>
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
                {isTripView ? "Items in this trip" : "Unsorted items"}
              </h2>
              <p className="text-xs text-zinc-500">
                {cards.length} saved
              </p>
            </div>

            {emptyTrip && (
              <div className="rounded-xl border border-dashed border-zinc-200/90 bg-white/60 px-6 py-14 text-center text-sm text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                This trip is empty. Start adding places from TikTok, IG, or text!
              </div>
            )}

            {emptyLibrary && (
              <div className="rounded-xl border border-dashed border-zinc-200/90 bg-white/60 px-6 py-14 text-center text-sm text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                Inbox is empty. Start adding places from TikTok, IG, or text!
              </div>
            )}

            {!emptyTrip && !emptyLibrary && (
              <>
                {view === "list" ? (
                  <div className="space-y-4">
                    {listGroups.map(([cat, items]) => {
                      const meta = CATEGORY_META[cat] ?? null;
                      const label = meta?.label ?? cat;
                      const count = listGroupCounts.get(cat) ?? items.length;
                      const collapsed = Boolean(collapsedCats[cat]);
                      return (
                        <section key={cat}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="mb-2 flex w-full items-center justify-between rounded-xl border border-zinc-100 bg-white/70 px-3 py-2 text-left text-xs font-semibold text-zinc-700 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] hover:bg-white/80"
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
                            <div className="space-y-3 pt-0.5">
                              {items.map((place) => (
                                <PlaceRow
                                  key={place.id}
                                  place={place}
                                  onOpen={() => setOpenPlaceId(place.id)}
                                  onDelete={() => setDeletePlaceId(place.id)}
                                  onUpdateCategory={(next) => void updateCategory(place.id, next)}
                                />
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
                    {groupedDisplayedCards.map(([cat, items]) => {
                      const meta = CATEGORY_META[cat] ?? null;
                      const Icon = meta?.Icon ?? MapPin;
                      const label = meta?.label ?? cat;
                      const count = listGroupCounts.get(cat) ?? items.length;
                      const collapsed = Boolean(collapsedCats[cat]);
                      return (
                        <section key={cat}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="mb-4 flex w-full items-center justify-between rounded-2xl border border-zinc-100 bg-white/70 px-3 py-2.5 text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] hover:bg-white/80"
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
                            <div className="grid grid-cols-1 gap-6 pt-0.5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
                              {items.map((place) => (
                                <PlaceCard
                                  key={place.id}
                                  place={place}
                                  draggable={mode === "inbox"}
                                  onOpen={() => setOpenPlaceId(place.id)}
                                  onDelete={async () => {
                                    setDeletePlaceId(place.id);
                                  }}
                                  onMoveToTrip={
                                    mode === "inbox"
                                      ? (id) => {
                                          setMoveMenuOpenForId(id);
                                        }
                                      : undefined
                                  }
                                  onUpdateCategory={async (next) => {
                                    await updateCategory(place.id, next);
                                  }}
                                />
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
        className="fixed bottom-[88px] right-5 z-40 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_16px_48px_-20px_rgba(15,92,86,0.65)] transition-transform duration-300 hover:-translate-y-1 active:scale-95 lg:hidden"
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
      {moveMenuOpenForId && (
        <div
          className="fixed inset-0 z-[65]"
          onClick={() => {
            setMoveMenuOpenForId(null);
            setMoveQuery("");
          }}
        >
          <div
            className="absolute right-5 top-[96px] w-[280px] rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.35)] backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Move item to…
            </p>
            <input
              value={moveQuery}
              onChange={(e) => setMoveQuery(e.target.value)}
              placeholder="Search trips…"
              className="mt-2 min-h-10 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
            />
            <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  const id = moveMenuOpenForId;
                  setMoveMenuOpenForId(null);
                  setMoveQuery("");
                  void moveItem(id, null);
                }}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                <span>Inbox</span>
                <span className="text-xs text-zinc-400">Unsorted</span>
              </button>
              {trips
                .filter((t) =>
                  t.name.toLowerCase().includes(moveQuery.trim().toLowerCase()),
                )
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const id = moveMenuOpenForId;
                      setMoveMenuOpenForId(null);
                      setMoveQuery("");
                      void moveItem(id, t.id);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
