import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getTripAccess } from "@/lib/trip-access";
import { canAddPlaceToTrip, canViewTripContent } from "@/lib/trip-permissions";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    const userId = await requireUserId();

    if (tripId) {
      const access = await getTripAccess({ prisma, userId, tripId });
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
    }

    const places = await prisma.place.findMany({
      where: {
        ...(tripId
          ? { tripId }
          : {
              OR: [
                { userId },
                {
                  trip: {
                    is: {
                      OR: [
                        { userId },
                        { collaborators: { some: { userId } } },
                      ],
                    },
                  },
                },
              ],
            }),
      },
      include: { trip: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ places });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to load places" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      tripId?: string | null;
      name?: string;
      city?: string | null;
      country?: string | null;
      subLocation?: string | null;
      category?:
        | "Food"
        | "Stay"
        | "Nature"
        | "Culture"
        | "Viewpoint"
        | "HOTEL"
        | "RESTAURANT"
        | "VIEWPOINT"
        | "ACTIVITY"
        | "TRANSPORT"
        | null;
      sourceUrl?: string | null;
      description?: string | null;
      notes?: string | null;
      formattedAddress?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      photoReference?: string | null;
    };
    const tripId = body.tripId ? body.tripId.trim() : null;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    const userId = await requireUserId();
    let ownerIdForPlace = userId;
    if (tripId) {
      const access = await getTripAccess({ prisma, userId, tripId });
      if (!access) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
      const canAdd = canAddPlaceToTrip({
        userId,
        tripOwnerId: access.ownerId,
        collaboratorRole: access.role === "OWNER" ? null : access.role,
      });
      if (!canAdd) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      ownerIdForPlace = access.ownerId;
    }

    const place = await prisma.place.create({
      data: {
        userId: ownerIdForPlace,
        tripId,
        title: name,
        description: body.description?.trim() || null,
        notes: body.notes?.trim() || null,
        city: body.city?.trim() || null,
        country: body.country?.trim() || null,
        subLocation: body.subLocation?.trim() || null,
        category: body.category ?? null,
        sourceUrl: body.sourceUrl?.trim() || null,
        formattedAddress: body.formattedAddress?.trim() || null,
        latitude: typeof body.latitude === "number" ? body.latitude : null,
        longitude: typeof body.longitude === "number" ? body.longitude : null,
        photoReference: body.photoReference?.trim() || null,
        addedByUserId: userId,
      },
      include: { trip: true },
    });

    return NextResponse.json({ place });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create place" },
      { status: 500 },
    );
  }
}
