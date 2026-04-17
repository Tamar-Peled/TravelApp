import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const trips = await prisma.trip.findMany({
      where: {
        OR: [
          { userId },
          { collaborators: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ trips });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to load trips" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      region?: string | null;
      city?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const userId = await requireUserId();

    const startDate =
      body.startDate && body.startDate.trim() ? new Date(body.startDate) : null;
    const endDate =
      body.endDate && body.endDate.trim() ? new Date(body.endDate) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate" },
        { status: 400 },
      );
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
    }

    const trip = await prisma.trip.create({
      data: {
        name,
        userId,
        region: body.region?.trim() || null,
        city: body.city?.trim() || null,
        startDate,
        endDate,
      },
    });
    return NextResponse.json({ trip });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 },
    );
  }
}
