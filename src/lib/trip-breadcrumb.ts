import type { Trip } from "@prisma/client";

export type BreadcrumbSegment = { label: string; key: string };

/** Build segments for high-tech folder path; trip title is shown separately in the page H1. */
export function buildTripBreadcrumb(
  trip: Pick<Trip, "id" | "name" | "region" | "city"> | null,
): BreadcrumbSegment[] {
  const root: BreadcrumbSegment = { label: "My Library", key: "library" };
  if (!trip) return [root];

  const segments: BreadcrumbSegment[] = [root];

  if (trip.region && trip.city) {
    segments.push({ label: trip.region, key: `region-${trip.id}` });
    segments.push({ label: trip.city, key: `city-${trip.id}` });
  } else if (trip.region) {
    segments.push({ label: trip.region, key: `region-${trip.id}` });
    segments.push({ label: trip.name, key: `trip-${trip.id}` });
  } else if (trip.city) {
    segments.push({ label: trip.city, key: `city-${trip.id}` });
    segments.push({ label: trip.name, key: `trip-${trip.id}` });
  } else {
    segments.push({ label: trip.name, key: `trip-${trip.id}` });
  }

  return segments;
}
