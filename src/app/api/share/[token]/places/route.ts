import { NextResponse } from "next/server";
import type { PlaceCategory } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = (await req.json()) as {
      title?: string;
      category?: PlaceCategory | null;
      subLocation?: string | null;
      sourceUrl?: string | null;
      description?: string | null;
    };

    const title = (body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const trip = await prisma.trip.findFirst({
      where: { shareToken: token },
      select: {
        id: true,
        userId: true,
        linkShareEnabled: true,
        linkShareRole: true,
      },
    });
    if (!trip || !trip.linkShareEnabled) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (trip.linkShareRole !== "EDITOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const created = await prisma.place.create({
      data: {
        userId: trip.userId,
        tripId: trip.id,
        title,
        category: body.category ?? null,
        subLocation: body.subLocation?.trim() || null,
        sourceUrl: body.sourceUrl?.trim() || null,
        description: body.description?.trim() || null,
      },
      select: {
        id: true,
        title: true,
        category: true,
        subLocation: true,
        sourceUrl: true,
        description: true,
        formattedAddress: true,
        photoReference: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ place: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

