"use client";

import type { Place, PlaceCategory, Trip } from "@prisma/client";
import { ExternalLink, LoaderCircle, MapPin, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

export type PlaceWithTrip = Place & { trip: Trip | null };

type PlaceDetailModalProps = {
  open: boolean;
  place: PlaceWithTrip | null;
  trips?: Trip[];
  canEdit?: boolean;
  sharedWithText?: string | null;
  onRequestSave?: (input: {
    id: string;
    description: string;
    notes: string;
    category: PlaceCategory | null;
    tripId: string | null;
  }) => Promise<void>;
  onRequestDelete?: (id: string) => Promise<void>;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: (next: PlaceWithTrip) => void;
};

const CATEGORY_OPTIONS: PlaceCategory[] = [
  "HOTEL",
  "RESTAURANT",
  "VIEWPOINT",
  "ACTIVITY",
  "TRANSPORT",
  // legacy values remain in DB; keep available for now
  "Food",
  "Stay",
  "Nature",
  "Culture",
  "Viewpoint",
];

export function PlaceDetailModal({
  open,
  place,
  trips = [],
  canEdit = true,
  sharedWithText = null,
  onRequestSave,
  onRequestDelete,
  onClose,
  onDeleted,
  onUpdated,
}: PlaceDetailModalProps) {
  const titleId = useId();
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open || !place) return;
    setDescription(place.description ?? "");
    setNotes(place.notes ?? "");
    setCategory(place.category ?? null);
    setTripId(place.tripId ?? null);
    setError(null);
  }, [open, place]);

  const mapsUrl = useMemo(() => {
    if (!place) return null;
    if (typeof place.latitude === "number" && typeof place.longitude === "number") {
      return `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
    }
    const q = [place.title, place.city, place.country].filter(Boolean).join(" ");
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
  }, [place]);

  if (!open || !place) return null;

  async function save() {
    if (!place) return;
    if (onRequestSave) {
      setSaving(true);
      setError(null);
      try {
        await onRequestSave({
          id: place.id,
          description,
          notes,
          category,
          tripId,
        });
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Save failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${place.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          notes,
          category,
          tripId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onUpdated(data.place as PlaceWithTrip);
      toast.success("Saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!place) return;
    if (onRequestDelete) {
      // Close immediately; perform deletion in background.
      onClose();
      void onRequestDelete(place.id).catch((e) => {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${place.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      onDeleted();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[8px]"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        className="relative h-full w-full max-w-xl border-l border-zinc-100 bg-[#FAF9F6] shadow-[0_0_0_1px_rgba(15,23,42,0.03),-16px_0_60px_-20px_rgba(15,23,42,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <p id={titleId} className="truncate text-sm font-semibold tracking-tight text-zinc-900">
              {place.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {place.formattedAddress ?? [place.city, place.country].filter(Boolean).join(", ")}
            </p>
            {sharedWithText && (
              <p className="mt-1 truncate text-xs font-medium text-zinc-400">
                {sharedWithText}
              </p>
            )}
          </div>
          <button
            type="button"
            className="touch-manipulation flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="h-[220px] w-full bg-zinc-100">
          {place.photoReference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo?ref=${encodeURIComponent(place.photoReference)}&maxwidth=1200`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-50" />
          )}
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            {place.sourceUrl && (
              <a
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href={place.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                Source
              </a>
            )}
            {mapsUrl && (
              <a
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
                Maps
              </a>
            )}
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={!canEdit || saving}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200/80 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              Delete
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">
              Trip
            </span>
            <select
              value={tripId ?? ""}
              onChange={(e) => setTripId(e.target.value || null)}
              disabled={!canEdit || saving}
              className="min-h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_rgba(15,92,86,0.12)] disabled:opacity-60"
            >
              <option value="">Inbox</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">
              Category
            </span>
            <select
              value={category ?? ""}
              onChange={(e) =>
                setCategory((e.target.value || null) as PlaceCategory | null)
              }
              disabled={!canEdit || saving}
              className="min-h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_rgba(15,92,86,0.12)] disabled:opacity-60"
            >
              <option value="">Uncategorized</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">
              Description
            </span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit || saving}
              className="w-full resize-none rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_rgba(15,92,86,0.12)] disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">
              Notes
            </span>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your notes…"
              disabled={!canEdit || saving}
              className="w-full resize-none rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_rgba(15,92,86,0.12)] disabled:opacity-60"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={saving || !canEdit}
            className="touch-manipulation inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] disabled:opacity-60"
          >
            {!canEdit ? (
              "Read-only"
            ) : saving ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                Saving...
              </span>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </aside>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Are you sure?"
        description="This will permanently delete this item."
        cancelText="Cancel"
        confirmText="Delete"
        tone="danger"
        loading={saving}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          void del();
        }}
      />
    </div>
  );
}

