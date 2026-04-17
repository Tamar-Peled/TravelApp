"use client";

import { ChevronRight } from "lucide-react";
import type { BreadcrumbSegment } from "@/lib/trip-breadcrumb";

type BreadcrumbNavProps = {
  segments: BreadcrumbSegment[];
  onNavigateLibrary: () => void;
};

export function BreadcrumbNav({
  segments,
  onNavigateLibrary,
}: BreadcrumbNavProps) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1 text-[11px] font-medium tracking-tight text-zinc-500"
      aria-label="Breadcrumb"
    >
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const isLibrary = seg.key === "library";

        return (
          <span key={seg.key} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-zinc-300"
                strokeWidth={1.5}
                aria-hidden
              />
            )}
            {isLibrary ? (
              <button
                type="button"
                onClick={onNavigateLibrary}
                className="rounded-md px-1 py-0.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                {seg.label}
              </button>
            ) : (
              <span
                className={
                  isLast
                    ? "font-semibold text-zinc-800"
                    : "text-zinc-500"
                }
              >
                {seg.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
