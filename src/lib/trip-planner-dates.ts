import { format } from "date-fns";
import { MAX_PLANNER_DAYS } from "@/lib/planner-constants";

/** Inclusive day count from trip start→end, or null if either date missing. */
export function tripDateRangeDayCount(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const s = new Date(start).setHours(0, 0, 0, 0);
  const e = new Date(end).setHours(0, 0, 0, 0);
  const diff = Math.round((e - s) / 86400000) + 1;
  return Math.min(MAX_PLANNER_DAYS, Math.max(1, diff));
}

export function tripDayCalendarDate(
  tripStart: Date | string | null | undefined,
  dayNum: number,
): Date | null {
  if (!tripStart || dayNum < 1) return null;
  const d = new Date(tripStart);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (dayNum - 1));
  return d;
}

/** e.g. "Oct 12" for itinerary headers */
export function formatPlannerDayShortDate(d: Date): string {
  return format(d, "MMM d");
}
