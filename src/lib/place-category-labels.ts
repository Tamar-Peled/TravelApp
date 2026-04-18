import type { PlaceCategory } from "@prisma/client";

const LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  RESTAURANT: "Restaurant",
  VIEWPOINT: "Viewpoint",
  ACTIVITY: "Activity",
  TRANSPORT: "Transport",
  Food: "Food",
  Stay: "Stay",
  Nature: "Nature",
  Culture: "Culture",
  Viewpoint: "Viewpoint",
};

export function placeCategoryLabel(c: PlaceCategory | null | undefined): string {
  if (c == null) return "—";
  return LABELS[c] ?? String(c);
}
