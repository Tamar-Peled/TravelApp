"use client";

import type { PlaceCategory, Role } from "@prisma/client";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type SharedPlace = {
  id: string;
  title: string;
  description: string | null;
  formattedAddress: string | null;
  photoReference: string | null;
  category: PlaceCategory | null;
  subLocation: string | null;
  sourceUrl: string | null;
};

export function SharedTripClient({
  token,
  tripName,
  role,
  initialPlaces,
}: {
  token: string;
  tripName: string;
  role: Role;
  initialPlaces: SharedPlace[];
}) {
  const canEdit = role === "EDITOR";
  const [places, setPlaces] = useState<SharedPlace[]>(initialPlaces);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [subLocation, setSubLocation] = useState("");
  const [category, setCategory] = useState<PlaceCategory | "">("");
  const [sourceUrl, setSourceUrl] = useState("");

  const subtitle = useMemo(() => {
    const count = places.length;
    return `${count} item${count === 1 ? "" : "s"} · ${
      canEdit ? "Anyone with link can edit" : "Read-only"
    }`;
  }, [canEdit, places.length]);

  async function addItem() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          subLocation: subLocation.trim() || null,
          category: category || null,
          sourceUrl: sourceUrl.trim() || null,
        }),
      });
      const json = (await res.json()) as { place?: SharedPlace; error?: string };
      if (!res.ok || !json.place) throw new Error(json.error || "Add failed");
      setPlaces((prev) => [json.place as SharedPlace, ...prev]);
      toast.success("Item added");
      setOpen(false);
      setTitle("");
      setSubLocation("");
      setCategory("");
      setSourceUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAF9F6] px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Shared trip
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {tripName}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              title="Add Item"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Add Item
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]"
            >
              <div className="h-32 w-full bg-zinc-100">
                {p.photoReference ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photo?ref=${encodeURIComponent(p.photoReference)}&maxwidth=900`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
                  {p.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                  {p.formattedAddress ?? "—"}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/12 backdrop-blur-[8px]"
            aria-label="Close dialog"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-100 bg-[#FAF9F6] shadow-[0_24px_80px_-16px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.03)]">
            <div className="border-b border-white/60 p-5">
              <p className="text-lg font-semibold tracking-tight text-zinc-900">
                Add item
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Anyone with the link can add items to this trip.
              </p>
            </div>
            <div className="p-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                />
              </label>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                    Category
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PlaceCategory | "")}
                    className="min-h-11 w-full appearance-none rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                  >
                    <option value="">Uncategorized</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="ACTIVITY">Activity</option>
                    <option value="VIEWPOINT">Viewpoint</option>
                    <option value="TRANSPORT">Transport</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                    Sub-location
                  </span>
                  <input
                    value={subLocation}
                    onChange={(e) => setSubLocation(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Source URL
                </span>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                />
              </label>
              <button
                type="button"
                onClick={() => void addItem()}
                disabled={saving || !title.trim()}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

