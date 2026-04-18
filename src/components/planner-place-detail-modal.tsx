"use client";

import type { PlaceWithTrip } from "@/components/collection-landing";
import { ExternalLink, MapPin, X } from "lucide-react";
import { useEffect, useId, useMemo } from "react";

export function PlannerPlaceDetailModal({
  open,
  place,
  onClose,
}: {
  open: boolean;
  place: PlaceWithTrip | null;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const mapsUrl = useMemo(() => {
    if (!place) return null;
    if (typeof place.latitude === "number" && typeof place.longitude === "number") {
      return `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
    }
    const q = [place.title, place.city, place.country].filter(Boolean).join(" ");
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
  }, [place]);

  const locationLine = useMemo(() => {
    if (!place) return "—";
    const addr = place.formattedAddress?.trim();
    if (addr) return addr;
    const parts = [place.city, place.country].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return place.location?.trim() || "—";
  }, [place]);

  if (!open || !place) return null;

  const description = place.description?.trim() || null;
  const notes = place.notes?.trim() || null;
  const sourceUrl = place.sourceUrl?.trim() || null;

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/25 backdrop-blur-[8px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-100 bg-[#FAF9F6] shadow-[0_-20px_80px_-24px_rgba(15,23,42,0.35)] sm:max-h-[min(90dvh,880px)] sm:rounded-3xl sm:shadow-[0_24px_80px_-16px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-center justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-zinc-300/70" aria-hidden />
        </div>

        <div className="relative h-[220px] w-full shrink-0 bg-zinc-100 sm:h-[260px]">
          {place.photoReference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo?ref=${encodeURIComponent(place.photoReference)}&maxwidth=1200`}
              alt={place.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-50" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/45"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
          <h2
            id={titleId}
            className="text-balance text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl"
          >
            {place.title}
          </h2>
          <p className="mt-2 flex items-start gap-2 text-sm font-medium text-zinc-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden />
            <span>{locationLine}</span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Open link
              </a>
            ) : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Maps
              </a>
            ) : null}
          </div>

          {description ? (
            <section className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Description
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {description}
              </p>
            </section>
          ) : null}

          {notes ? (
            <section className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Notes
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {notes}
              </p>
            </section>
          ) : null}

          {!description && !notes ? (
            <p className="mt-6 text-sm text-zinc-400">No additional details for this place yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
