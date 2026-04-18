import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  Folder,
  Map,
} from "lucide-react";

export type NavId = "trips" | "map" | "trip-planner" | "trip";

export const NAV_ITEMS: {
  id: NavId;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}[] = [
  { id: "trips", label: "My Trips", icon: Folder },
  { id: "map", label: "Map", icon: Map },
  { id: "trip-planner", label: "Planner", icon: CalendarRange },
];
