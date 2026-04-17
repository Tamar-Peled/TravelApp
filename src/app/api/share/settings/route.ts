import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId")?.trim();
    if (!tripId) return NextResponse.json({ error: "tripId is required" }, { status: 400 });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        userId: true,
        shareToken: true,
        linkShareEnabled: true,
        linkShareRole: true,
        name: true,
      },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (trip.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({
      enabled: trip.linkShareEnabled,
      role: trip.linkShareRole,
      token: trip.shareToken,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load share settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as {
      tripId?: string;
      enabled?: boolean;
      role?: Role;
    };
    const tripId = body.tripId?.trim();
    if (!tripId) return NextResponse.json({ error: "tripId is required" }, { status: 400 });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, userId: true, shareToken: true },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (trip.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        linkShareEnabled: body.enabled ?? undefined,
        linkShareRole: body.role ?? undefined,
        shareToken:
          body.enabled === true ? (trip.shareToken ?? randomUUID()) : undefined,
      },
      select: {
        linkShareEnabled: true,
        linkShareRole: true,
        shareToken: true,
      },
    });

    return NextResponse.json({
      enabled: updated.linkShareEnabled,
      role: updated.linkShareRole,
      token: updated.shareToken,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update share settings" }, { status: 500 });
  }
}

