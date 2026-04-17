import type { Role } from "@prisma/client";

/**
 * OWNER = Trip.ownerId. Collaborators have Role EDITOR or VIEWER only.
 * Only OWNER or EDITOR may add places; VIEWER is read-only for map + list.
 */
export function canAddPlaceToTrip(input: {
  userId: string;
  tripOwnerId: string;
  collaboratorRole: Role | null;
}): boolean {
  if (input.userId === input.tripOwnerId) return true;
  if (input.collaboratorRole === "EDITOR") return true;
  return false;
}

export function canViewTripContent(input: {
  userId: string;
  tripOwnerId: string;
  collaboratorRole: Role | null;
}): boolean {
  if (input.userId === input.tripOwnerId) return true;
  if (input.collaboratorRole === "EDITOR" || input.collaboratorRole === "VIEWER") {
    return true;
  }
  return false;
}
