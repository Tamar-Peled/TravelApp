import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  Folder,
  Inbox,
  Map,
} from "lucide-react";

export type NavId = "trips" | "inbox" | "map" | "trip-planner" | "trip";

export const NAV_ITEMS: {
  id: NavId;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}[] = [
  { id: "trips", label: "My Trips", icon: Folder },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "map", label: "Map", icon: Map, comingSoon: true },
  { id: "trip-planner", label: "Planner", icon: CalendarRange, comingSoon: true },
];
