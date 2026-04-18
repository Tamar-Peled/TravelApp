import { NextResponse } from "next/server";
import type { PlaceCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getTripAccess } from "@/lib/trip-access";
import { canAddPlaceToTrip, canViewTripContent } from "@/lib/trip-permissions";
import { MAX_PLANNER_DAYS } from "@/lib/planner-constants";

type PatchBody = {
  tripId?: string | null;
  description?: string | null;
  notes?: string | null;
  subLocation?: string | null;
  category?: PlaceCategory | null;
  plannerDay?: number | null;
  plannerOrder?: number | null;
  /** Cleared when unscheduling (plannerDay null). */
  timeSlot?: string | null;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as PatchBody;
    const userId = await requireUserId();

    const place = await prisma.place.findUnique({ where: { id } });
    if (!place) return NextResponse.json({ error: "Place not found" }, { status: 404 });

    if (place.tripId) {
      const access = await getTripAccess({ prisma, userId, tripId: place.tripId });
      if (!access) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
      const canView = canViewTripContent({
        userId,
        tripOwnerId: access.ownerId,
        collaboratorRole: access.role === "OWNER" ? null : access.role,
      });
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const canEdit = canAddPlaceToTrip({
        userId,
        tripOwnerId: access.ownerId,
        collaboratorRole: access.role === "OWNER" ? "EDITOR" : access.role,
      });
      if (!canEdit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (place.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (
      body.plannerDay !== undefined &&
      body.plannerDay !== null &&
        (!Number.isInteger(body.plannerDay) ||
          body.plannerDay < 1 ||
          body.plannerDay > MAX_PLANNER_DAYS)
    ) {
      return NextResponse.json({ error: "Invalid plannerDay" }, { status: 400 });
    }

    if (
      body.plannerOrder !== undefined &&
      body.plannerOrder !== null &&
      (!Number.isInteger(body.plannerOrder) || body.plannerOrder < 0)
    ) {
      return NextResponse.json({ error: "Invalid plannerOrder" }, { status: 400 });
    }

    // If moving between trips (or off-trip), validate target access too.
    if (body.tripId !== undefined && body.tripId !== place.tripId) {
      const nextTripId = body.tripId;
      if (nextTripId) {
        const access = await getTripAccess({ prisma, userId, tripId: nextTripId });
        if (!access) {
          return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        }
        const canAdd = canAddPlaceToTrip({
          userId,
          tripOwnerId: access.ownerId,
          collaboratorRole: access.role === "OWNER" ? "EDITOR" : access.role,
        });
        if (!canAdd) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        // moving off-trip: only the place owner can do this
        if (place.userId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const tripChanged =
      body.tripId !== undefined && body.tripId !== place.tripId;

    const unscheduling =
      !tripChanged && body.plannerDay === null;

    const updateData = {
      tripId: body.tripId === undefined ? undefined : body.tripId,
      description:
        body.description === undefined
          ? undefined
          : body.description?.trim() || null,
      notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
      subLocation:
        body.subLocation === undefined
          ? undefined
          : body.subLocation?.trim() || null,
      category: body.category === undefined ? undefined : body.category,
      plannerDay: tripChanged
        ? null
        : body.plannerDay === undefined
          ? undefined
          : body.plannerDay,
      plannerOrder: tripChanged
        ? null
        : unscheduling
          ? null
          : body.plannerOrder === undefined
            ? undefined
            : body.plannerOrder,
      timeSlot: tripChanged
        ? null
        : unscheduling
          ? null
          : body.timeSlot === undefined
            ? undefined
            : body.timeSlot,
    } as Prisma.PlaceUpdateInput;

    const updated = await prisma.place.update({
      where: { id },
      data: updateData,
      include: { trip: true },
    });

    return NextResponse.json({ place: updated });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update place" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await requireUserId();

    const place = await prisma.place.findUnique({ where: { id } });
    if (!place) return NextResponse.json({ error: "Place not found" }, { status: 404 });

    if (place.tripId) {
      const access = await getTripAccess({ prisma, userId, tripId: place.tripId });
      if (!access) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
      const canEdit = canAddPlaceToTrip({
        userId,
        tripOwnerId: access.ownerId,
        collaboratorRole: access.role === "OWNER" ? "EDITOR" : access.role,
      });
      if (!canEdit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (place.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.place.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete place" },
      { status: 500 },
    );
  }
}

