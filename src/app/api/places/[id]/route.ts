import { NextResponse } from "next/server";
import type { PlaceCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getTripAccess } from "@/lib/trip-access";
import { canAddPlaceToTrip, canViewTripContent } from "@/lib/trip-permissions";

type PatchBody = {
  tripId?: string | null;
  description?: string | null;
  notes?: string | null;
  subLocation?: string | null;
  category?: PlaceCategory | null;
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

    // If moving between trips/inbox, validate target access too.
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
        // moving to Inbox: only the place owner can do this
        if (place.userId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const updated = await prisma.place.update({
      where: { id },
      data: {
        tripId: body.tripId === undefined ? undefined : body.tripId,
        description:
          body.description === undefined
            ? undefined
            : body.description?.trim() || null,
        notes:
          body.notes === undefined ? undefined : body.notes?.trim() || null,
        subLocation:
          body.subLocation === undefined
            ? undefined
            : body.subLocation?.trim() || null,
        category: body.category === undefined ? undefined : body.category,
      },
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

