"use client";

import type { PlaceCategory } from "@prisma/client";
import {
  BusFront,
  Camera,
  MapPin,
  Mountain,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/** Shared category labels and chip styles (collection grid, planner, add-place). */
export const CATEGORY_META: Record<
  string,
  { label: string; cls: string; Icon: LucideIcon }
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
  Food: {
    label: "Food",
    cls: "bg-orange-500/[0.10] text-orange-900/80",
    Icon: UtensilsCrossed,
  },
  Stay: { label: "Stay", cls: "bg-sky-500/[0.10] text-sky-900/80", Icon: MapPin },
  Nature: {
    label: "Nature",
    cls: "bg-emerald-500/[0.10] text-emerald-900/80",
    Icon: Mountain,
  },
  Culture: {
    label: "Culture",
    cls: "bg-violet-500/[0.10] text-violet-900/80",
    Icon: Camera,
  },
  Viewpoint: {
    label: "Viewpoint",
    cls: "bg-violet-500/[0.10] text-violet-900/80",
    Icon: Camera,
  },
};

export function CategoryPillReadonly({
  category,
  className = "",
}: {
  category: PlaceCategory | null;
  className?: string;
}) {
  if (!category) return null;
  const meta = CATEGORY_META[category];
  const Icon = meta?.Icon ?? MapPin;
  const label = meta?.label ?? String(category);
  const cls = meta?.cls ?? "bg-zinc-500/[0.08] text-zinc-700";
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold tracking-tight shadow-sm ${cls} ${className}`.trim()}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-85" strokeWidth={1.5} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
