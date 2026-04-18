import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getTripAccess } from "@/lib/trip-access";
import { canAddPlaceToTrip } from "@/lib/trip-permissions";
import { MAX_PLANNER_DAYS } from "@/lib/planner-constants";

const TIME_SLOTS = ["Morning", "Afternoon", "Evening"] as const;
type TimeSlot = (typeof TIME_SLOTS)[number];

type Assignment = {
  placeId: string;
  plannerDay: number | null;
  plannerOrder: number | null;
  timeSlot: string | null;
};

function isTimeSlot(v: unknown): v is TimeSlot {
  return typeof v === "string" && TIME_SLOTS.includes(v as TimeSlot);
}

/** Normalize any client/AI casing (e.g. "morning", "MORNING ") to a DB-safe slot. */
function coerceTimeSlot(raw: unknown): TimeSlot {
  if (raw === undefined || raw === null || raw === "") return "Morning";
  const s = String(raw).trim();
  if (isTimeSlot(s)) return s;
  const lower = s.toLowerCase();
  if (lower === "morning") return "Morning";
  if (lower === "afternoon") return "Afternoon";
  if (lower === "evening") return "Evening";
  return "Morning";
}

/** Integer day 1…N or null (unscheduled). Rejects 0, strings that don't parse, floats. */
function parsePlannerDayInput(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n =
    typeof raw === "string" ? parseInt(String(raw).trim(), 10) : Number(raw);
  if (!Number.isFinite(n)) return null;
  const d = Math.trunc(n);
  if (d === 0) return null;
  if (d >= 1 && d <= MAX_PLANNER_DAYS) return d;
  return null;
}

function parsePlannerOrderInput(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return 0;
  const n = typeof raw === "string" ? parseInt(String(raw).trim(), 10) : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

/** Coerce client payloads so missing/loose types never reach Prisma. */
function normalizeAssignment(raw: unknown): Assignment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const placeId =
    typeof o.placeId === "string"
      ? o.placeId.trim()
      : typeof o.placeId === "number"
        ? String(o.placeId).trim()
        : "";
  if (!placeId) return null;

  const plannerDay = parsePlannerDayInput(o.plannerDay);

  if (plannerDay === null) {
    return { placeId, plannerDay: null, plannerOrder: null, timeSlot: null };
  }

  const plannerOrder = parsePlannerOrderInput(o.plannerOrder);

  const timeSlot = coerceTimeSlot(o.timeSlot);

  return { placeId, plannerDay, plannerOrder, timeSlot };
}

function devErr(e: unknown) {
  return process.env.NODE_ENV === "development" && e instanceof Error
    ? { debug: e.message }
    : {};
}

/** Final coercion immediately before Prisma — integers only for Int fields. */
function buildPrismaPlannerData(
  a: Assignment,
  tripId: string,
  index: number,
): {
  where: { id: string };
  data: {
    plannerDay: number | null;
    plannerOrder: number | null;
    timeSlot: string | null;
  };
} {
  let plannerDay: number | null =
    a.plannerDay === null ? null : parsePlannerDayInput(a.plannerDay);
  const plannerOrder =
    plannerDay === null ? null : parsePlannerOrderInput(a.plannerOrder);
  const timeSlot = plannerDay === null ? null : coerceTimeSlot(a.timeSlot);

  const data = {
    plannerDay,
    plannerOrder,
    timeSlot,
  };

  const payload = {
    where: { id: a.placeId },
    data,
  };

  console.log(
    "[planner/apply] dry-run",
    JSON.stringify({
      index,
      tripId,
      ...payload,
      dataTypes: {
        plannerDay: plannerDay === null ? "null" : typeof plannerDay,
        plannerOrder: plannerOrder === null ? "null" : typeof plannerOrder,
      },
    }),
  );

  return payload;
}

function normalizeAssignmentsPayload(raw: unknown): Assignment[] {
  if (!raw || typeof raw !== "object") return [];
  const assignments = (raw as { assignments?: unknown }).assignments;
  if (!Array.isArray(assignments)) return [];
  const seen = new Map<string, Assignment>();
  for (const row of assignments) {
    const a = normalizeAssignment(row);
    if (a) seen.set(a.placeId, a);
  }
  return [...seen.values()];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const tripId = rawId?.trim();
    if (!tripId) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const assignments = normalizeAssignmentsPayload(body);
    if (assignments.length === 0) {
      return NextResponse.json({ error: "assignments required" }, { status: 400 });
    }

    const placeIds = [...new Set(assignments.map((a) => a.placeId))];
    const places = await prisma.place.findMany({
      where: { id: { in: placeIds }, tripId },
      select: { id: true },
    });
    if (places.length !== placeIds.length) {
      console.error("[planner/apply] place/trip validation failed", {
        tripId,
        requested: placeIds.length,
        matched: places.length,
      });
      return NextResponse.json({ error: "Invalid places for trip" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i];
        const { where, data } = buildPrismaPlannerData(a, tripId, i);

        try {
          await tx.place.update({ where, data });
        } catch (rowErr) {
          console.error("Prisma Apply Error:", rowErr);
          console.error("[planner/apply] row context", {
            index: i,
            placeId: a.placeId,
            prismaPayload: data,
          });
          throw rowErr;
        }
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("Prisma Apply Error:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        "[planner/apply] PrismaClientKnownRequestError:",
        e.code,
        e.message,
        JSON.stringify(e.meta),
      );
    } else if (e instanceof Prisma.PrismaClientValidationError) {
      console.error("[planner/apply] PrismaClientValidationError:", e.message);
    } else {
      console.error("[planner/apply] unexpected:", e);
    }
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to apply planner", ...devErr(e) },
      { status: 500 },
    );
  }
}
