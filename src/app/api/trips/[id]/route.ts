import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getTripAccess } from "@/lib/trip-access";
import { canAddPlaceToTrip } from "@/lib/trip-permissions";
import { MAX_PLANNER_DAYS } from "@/lib/planner-constants";

/** Coerce JSON labels to a plain string map so Prisma Json updates never receive arrays or invalid values. */
function sanitizePlannerDayLabels(
  raw: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (raw === null) return Prisma.DbNull;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const text =
      typeof v === "string"
        ? v.trim()
        : v != null && (typeof v === "number" || typeof v === "boolean")
          ? String(v).trim()
          : "";
    if (!text) continue;
    const day = Number.parseInt(k, 10);
    if (!Number.isFinite(day) || day < 1 || day > MAX_PLANNER_DAYS) continue;
    out[String(day)] = text;
  }
  return out;
}

function devErr(e: unknown) {
  return process.env.NODE_ENV === "development" && e instanceof Error
    ? { debug: e.message }
    : {};
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const tripId = rawId?.trim();
    if (!tripId) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    let body: {
      name?: string;
      plannerDayLabels?: Record<string, string> | null;
    };
    try {
      body = (await req.json()) as {
        name?: string;
        plannerDayLabels?: Record<string, string> | null;
      };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const nameTrim = body.name?.trim();
    const hasName = Boolean(nameTrim);
    const hasLabels = body.plannerDayLabels !== undefined;

    if (!hasName && !hasLabels) {
      return NextResponse.json(
        { error: "Provide name and/or plannerDayLabels" },
        { status: 400 },
      );
    }

    const userId = await requireUserId();
    const access = await getTripAccess({ prisma, userId, tripId });
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

    const data = {
      ...(hasName && nameTrim ? { name: nameTrim } : {}),
      ...(hasLabels
        ? {
            plannerDayLabels: sanitizePlannerDayLabels(body.plannerDayLabels),
          }
        : {}),
    } satisfies Prisma.TripUpdateInput;

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data,
    });
    return NextResponse.json({ trip }, { status: 200 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("PATCH /api/trips/[id] Prisma error:", e.code, e.message, e.meta);
    } else if (e instanceof Prisma.PrismaClientValidationError) {
      console.error("PATCH /api/trips/[id] Prisma validation:", e.message);
    } else {
      console.error("PATCH /api/trips/[id]:", e);
    }
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update trip", ...devErr(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tripId } = await params;
    const userId = await requireUserId();

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, userId: true },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (trip.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.place.deleteMany({ where: { tripId } });
      await tx.trip.delete({ where: { id: tripId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 },
    );
  }
}
