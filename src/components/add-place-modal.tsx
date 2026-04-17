"use client";

import {
  BusFront,
  Camera,
  Link2,
  LoaderCircle,
  MapPin,
  Mountain,
  Pencil,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { PlaceCategory } from "@prisma/client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Category = PlaceCategory;

type ExtractResponse = {
  extracted: Array<{
    name: string;
    city: string;
    country: string;
    category: Category;
    description: string;
  }>;
  enriched: Array<{
    name: string;
    city: string;
    country: string;
    category: Category;
    description: string;
    sourceUrl: string | null;
    formattedAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    photoReference: string | null;
  }>;
  google: {
    found: boolean;
    status: string;
    placeId: string | null;
  };
};

type DraftPlace = {
  name: string;
  city: string;
  country: string;
  category: Category;
  description: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  photoReference: string | null;
  sourceUrl: string | null;
  selected: boolean;
};

type AddPlaceModalProps = {
  open: boolean;
  onClose: () => void;
  currentTripId: string | null;
  onCreated: () => void;
};

const CATEGORIES: Category[] = [
  "HOTEL",
  "RESTAURANT",
  "VIEWPOINT",
  "ACTIVITY",
  "TRANSPORT",
  "Food",
  "Stay",
  "Nature",
  "Culture",
  "Viewpoint",
];

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
  Food: { label: "Food", cls: "bg-orange-500/[0.10] text-orange-900/80", Icon: UtensilsCrossed },
  Stay: { label: "Stay", cls: "bg-sky-500/[0.10] text-sky-900/80", Icon: MapPin },
  Nature: { label: "Nature", cls: "bg-emerald-500/[0.10] text-emerald-900/80", Icon: Mountain },
  Culture: { label: "Culture", cls: "bg-violet-500/[0.10] text-violet-900/80", Icon: Camera },
  Viewpoint: { label: "Viewpoint", cls: "bg-violet-500/[0.10] text-violet-900/80", Icon: Camera },
};

export function AddPlaceModal({
  open,
  onClose,
  currentTripId,
  onCreated,
}: AddPlaceModalProps) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stage, setStage] = useState<
    "idle" | "extracting" | "preview" | "saving"
  >("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<string>("Working…");
  const [drafts, setDrafts] = useState<DraftPlace[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 5;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setStage("idle");
    setLoadingText("Working…");
    setDrafts([]);
    setEditingIndex(null);
    setInput("");
    setImageFile(null);
    setVisibleCount(pageSize);
  }, [open]);

  const canConfirm = useMemo(() => {
    return drafts.some((d) => d.selected && d.name.trim());
  }, [drafts]);

  const selectedCount = useMemo(
    () => drafts.filter((d) => d.selected && d.name.trim()).length,
    [drafts],
  );

  const anySelected = selectedCount > 0;

  function resolveTextOrUrl(raw: string): { sourceUrl?: string; text?: string } {
    const trimmed = raw.trim();
    try {
      const u = new URL(trimmed);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return { sourceUrl: trimmed };
      }
    } catch {
      // ignore
    }
    return { text: trimmed };
  }

  function computeLoadingLabel(from: string) {
    const trimmed = from.trim();
    if (imageFile && !trimmed) return "Reading your screenshot...";
    if (trimmed) {
      const parsed = resolveTextOrUrl(trimmed);
      if (parsed.sourceUrl) return "Searching link...";
      return "Identifying notes...";
    }
    if (imageFile) return "Reading your screenshot...";
    return "Working...";
  }

  async function runExtract(from: string) {
    setFormError(null);
    const trimmed = from.trim();
    if (!trimmed && !imageFile) {
      setFormError("Paste a link/text or upload a screenshot.");
      return;
    }
    setStage("extracting");
    setDrafts([]);
    setEditingIndex(null);
    setVisibleCount(pageSize);
    setLoadingText(computeLoadingLabel(from));

    try {
      const form = new FormData();
      if (trimmed) {
        const parsed = resolveTextOrUrl(trimmed);
        if (parsed.sourceUrl) form.set("sourceUrl", parsed.sourceUrl);
        if (parsed.text) form.set("text", parsed.text);
      }
      if (imageFile) form.set("image", imageFile);

      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await res.json()) as Partial<ExtractResponse> & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Extract failed");
      }
      const enriched = (data.enriched ?? []) as ExtractResponse["enriched"];
      const nextDrafts: DraftPlace[] = enriched.map((p, i) => ({
        name: p.name,
        city: p.city,
        country: p.country,
        category: p.category,
        description: p.description,
        formattedAddress: p.formattedAddress,
        latitude: p.latitude,
        longitude: p.longitude,
        photoReference: p.photoReference,
        sourceUrl: p.sourceUrl,
        selected: true,
      }));
      setDrafts(nextDrafts);
      setStage("preview");
    } catch (err) {
      setStage("idle");
      setFormError(err instanceof Error ? err.message : "Extract failed");
    }
  }

  async function confirmSave() {
    const selected = drafts.filter((d) => d.selected);
    if (selected.length === 0) return;
    setFormError(null);
    setStage("saving");

    try {
      const results = await Promise.all(
        selected.map(async (d) => {
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tripId: currentTripId, // Trip context or Inbox (null)
              name: d.name,
              city: d.city,
              country: d.country,
              category: d.category,
              sourceUrl: d.sourceUrl,
              description: d.description,
              notes: null,
              formattedAddress: d.formattedAddress,
              latitude: d.latitude,
              longitude: d.longitude,
              photoReference: d.photoReference,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Could not save place");
          return data;
        }),
      );
      void results;
      const dest = currentTripId ? "this trip" : "Inbox";
      toast.success(`Items added to ${dest}`);
      onCreated();
      onClose();
    } catch (err) {
      setStage("preview");
      const msg = err instanceof Error ? err.message : "Save failed";
      setFormError(msg);
      toast.error(msg);
    }
  }

  // Auto-trigger extract for typed text (debounced).
  useEffect(() => {
    if (!open) return;
    if (stage !== "idle") return;
    if (editingIndex !== null) return;
    const trimmed = input.trim();
    if (!trimmed) return;
    const t = window.setTimeout(() => {
      void runExtract(trimmed);
    }, 650);
    return () => {
      window.clearTimeout(t);
    };
  }, [open, input, stage, editingIndex]);

  // Auto-trigger extract when an image is uploaded.
  useEffect(() => {
    if (!open) return;
    if (stage !== "idle") return;
    if (!imageFile) return;
    void runExtract(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageFile]);

  if (!open) return null;

  const shownDrafts = drafts.slice(0, visibleCount);
  const canLoadMore = drafts.length > visibleCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/12 backdrop-blur-[8px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-[#FAF9F6] shadow-[0_24px_80px_-16px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.03)]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                id={titleId}
                className="text-lg font-semibold tracking-tight text-zinc-900"
              >
                Add New Item
              </p>
              <p
                id={descId}
                className="mt-1.5 text-sm leading-relaxed text-zinc-500"
              >
                Paste a TikTok / IG link (or any text) — we’ll extract items like hotels, restaurants, transport, and activities.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="touch-manipulation -m-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <label className="mt-6 block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Paste link or text
            </span>
            <textarea
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted) {
                  setInput(pasted);
                  setTimeout(() => {
                    void runExtract(pasted);
                  }, 0);
                }
              }}
              placeholder="https://… or “Tsukiji Outer Market in Tokyo…”"
              className="w-full resize-none rounded-2xl border border-zinc-200/90 bg-white/80 px-4 py-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-shadow focus:border-zinc-300 focus:bg-white focus:shadow-[0_0_0_3px_var(--primary-muted)]"
            />
          </label>

          <div className="mt-4">
            <div className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                Upload image (Optional)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImageFile(f);
                }}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
                >
                  <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Upload Image
                </button>
                <p className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                  {imageFile ? `Selected: ${imageFile.name}` : "PNG, JPG, or WebP"}
                </p>
              </div>
              {imageFile && (
                <p className="mt-1 text-xs text-zinc-500">
                  Attached: {imageFile.name}
                </p>
              )}
            </div>
          </div>

          {stage === "extracting" && (
            <div className="mt-5 rounded-xl border border-zinc-100 bg-white/80 p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 animate-pulse rounded-lg bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
                </div>
                <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100" />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {loadingText}
              </p>
            </div>
          )}

          {drafts.length > 0 && (stage === "preview" || stage === "saving") && (
            <div className="mt-5 rounded-xl border border-zinc-100 bg-white/80 p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Found places
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDrafts((prev) => {
                      const nextSelected = prev.some((p) => p.selected) ? false : true;
                      return prev.map((p) => ({ ...p, selected: nextSelected }));
                    });
                  }}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  {anySelected ? "Deselect All" : "Select All"}
                </button>
              </div>

              <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {shownDrafts.map((d, idx) => {
                  const meta = CATEGORY_META[d.category] ?? null;
                  const Icon = meta?.Icon ?? MapPin;
                  return (
                  <li key={`${d.name}-${idx}`} className="rounded-xl border border-zinc-100 bg-white p-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={d.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDrafts((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, selected: checked } : p)),
                          );
                        }}
                        className="mt-1 h-4 w-4 accent-[var(--primary)]"
                        aria-label={`Select ${d.name}`}
                      />
                      <div className="h-14 w-14 overflow-hidden rounded-lg bg-zinc-100">
                        {d.photoReference ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/photo?ref=${encodeURIComponent(d.photoReference)}&maxwidth=240`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-zinc-100" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ring-1 ring-zinc-200/70 ${
                              meta ? meta.cls : "bg-zinc-500/[0.06] text-zinc-700"
                            }`}
                          >
                            <Icon className="h-3 w-3" strokeWidth={1.5} />
                            {meta?.label ?? d.category}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold tracking-tight text-zinc-900">
                          {d.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {d.formattedAddress ?? `${d.city}, ${d.country}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                        className="touch-manipulation flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-zinc-600 hover:bg-zinc-50"
                        aria-label="Edit details"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    {editingIndex === idx && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-zinc-500">Name</span>
                          <input
                            value={d.name}
                            onChange={(e) =>
                              setDrafts((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)),
                              )
                            }
                            className="min-h-10 w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-zinc-500">City</span>
                          <input
                            value={d.city}
                            onChange={(e) =>
                              setDrafts((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, city: e.target.value } : p)),
                              )
                            }
                            className="min-h-10 w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-zinc-500">Country</span>
                          <input
                            value={d.country}
                            onChange={(e) =>
                              setDrafts((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, country: e.target.value } : p)),
                              )
                            }
                            className="min-h-10 w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-zinc-500">Category</span>
                          <select
                            value={d.category}
                            onChange={(e) =>
                              setDrafts((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, category: e.target.value as Category } : p)),
                              )
                            }
                            className="min-h-10 w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-zinc-500">Description</span>
                          <input
                            value={d.description}
                            onChange={(e) =>
                              setDrafts((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)),
                              )
                            }
                            className="min-h-10 w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                          />
                        </label>
                      </div>
                    )}
                  </li>
                  );
                })}
              </ul>

              {canLoadMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => Math.min(drafts.length, c + pageSize))}
                  className="mt-3 w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Load more
                </button>
              )}
            </div>
          )}

          {formError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-white/60 bg-[#FAF9F6]/95 p-6 backdrop-blur sm:p-8">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="touch-manipulation min-h-12 rounded-2xl border border-zinc-200/90 bg-white px-5 py-3 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 sm:min-h-11 sm:py-2.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmSave()}
              disabled={!canConfirm || stage === "saving" || stage === "extracting"}
              className="touch-manipulation min-h-12 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] shadow-[0_8px_24px_-6px_rgba(15,92,86,0.35)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60 sm:min-h-11 sm:py-2.5"
            >
              {stage === "saving" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                  Processing...
                </span>
              ) : (
                `Add ${selectedCount} Item${selectedCount === 1 ? "" : "s"}`
              )}
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Adds to{" "}
            <span className="font-semibold text-zinc-700">
              {currentTripId ? "this trip" : "Inbox"}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
