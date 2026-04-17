"use client";

import type { Place, PlaceCategory, Trip } from "@prisma/client";
import {
  BusFront,
  Camera,
  ChevronDown,
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
}: {
  place: PlaceCardData;
  draggable: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onUpdateCategory: (next: PlaceCategory | null) => void;
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
      className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-zinc-100 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.07),0_1px_2px_-1px_rgba(15,23,42,0.04)] transition-[box-shadow,transform,background-color] duration-150 ease-out hover:-translate-y-0.5 hover:bg-zinc-50/40 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.12)] active:translate-y-0 sm:min-h-[150px]"
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <CategoryBadge category={place.category} onChange={onUpdateCategory} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="touch-manipulation relative z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-50 group-hover:opacity-100"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <h3 className="mt-3 text-balance text-[16px] font-bold leading-snug tracking-tight text-zinc-900 sm:text-[17px]">
          {place.title}
        </h3>
        <p className="mt-1.5 text-sm text-zinc-500">{place.location}</p>
      </div>
    </article>
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
  selectedTrip: Trip | null;
  selectedTripId: string | null;
  mode: "inbox" | "trip";
  loading: boolean;
  error: string | null;
  onAddPlace: () => void;
  onNavigateLibrary: () => void;
  onRefresh: () => void;
};

export function CollectionLanding({
  places,
  selectedTrip,
  selectedTripId,
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
  }) {
    const prevOverride = optimisticOverrides.get(input.id);
    setOptimisticOverrides((prev) => {
      const next = new Map(prev);
      next.set(input.id, {
        description: input.description,
        notes: input.notes,
        category: input.category,
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
        className="flex min-h-0 flex-1 flex-col px-4 pb-6 pt-1 transition-opacity duration-150 ease-out sm:px-6 sm:pb-8 sm:pt-2 lg:px-8 lg:pt-4"
      >
        <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 lg:mb-5">
          <BreadcrumbNav
            segments={crumbs}
            onNavigateLibrary={onNavigateLibrary}
          />
        </div>

        <div className="text-center lg:text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            {isTripView ? "Trip" : "Inbox"}
          </p>
          <div className="mt-1.5 flex flex-col items-center gap-3 sm:mt-2 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-3xl">
              {isTripView && selectedTrip ? selectedTrip.name : <>Inbox</>}
            </h1>
            {isTripView && selectedTripId && (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Share
              </button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-zinc-500 lg:mx-0">
            {isTripView
              ? "Places in this trip — add from TikTok, Instagram, or your notes."
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
                {isTripView ? "Places in this trip" : "Unsorted places"}
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
                {isTripView && grouped ? (
                  <div className="space-y-10">
                    {grouped.map(([cat, items]) => {
                      const meta = CATEGORY_META[cat] ?? null;
                      const Icon = meta?.Icon ?? MapPin;
                      return (
                        <section key={cat}>
                          <div className="mb-4 flex items-center gap-2">
                            <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                            <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
                              {meta?.label ?? cat}
                            </h3>
                            <span className="text-xs text-zinc-400">
                              {items.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
                            {items.map((place) => (
                              <PlaceCard
                                key={place.id}
                                place={place}
                                draggable={false}
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
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
                    {visibleCards.map((place) => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        draggable={mode === "inbox"}
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
        onRequestSave={(payload) => {
          // close immediately, do the work in background
          setOpenPlaceId(null);
          void saveFromModal(payload);
        }}
        onRequestDelete={(id) => {
          // close immediately, optimistically hide, delete in background
          setOpenPlaceId(null);
          setOptimisticallyHiddenIds((prev) => new Set(prev).add(id));
          void deletePlace(id);
        }}
      />
      {selectedTripId && (
        <TripShareModal
          open={shareOpen}
          tripId={selectedTripId}
          onClose={() => setShareOpen(false)}
        />
      )}
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
