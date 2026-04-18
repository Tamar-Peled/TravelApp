import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getTripAccess } from "@/lib/trip-access";
import { canAddPlaceToTrip } from "@/lib/trip-permissions";
import { getOpenAIClient } from "@/lib/openai";
import { MAX_PLANNER_DAYS } from "@/lib/planner-constants";
import { buildSmartPlanSystemPrompt } from "@/lib/smart-plan-prompt";

const TIME_SLOTS = ["Morning", "Afternoon", "Evening"] as const;

type Assignment = {
  placeId: string;
  plannerDay: number;
  plannerOrder: number;
  timeSlot: (typeof TIME_SLOTS)[number];
};

function computeDefaultDayCount(
  trip: { startDate: Date | null; endDate: Date | null } | null,
  placeCount: number,
): number {
  let base = 5;
  if (trip?.startDate && trip?.endDate) {
    const s = new Date(trip.startDate).setHours(0, 0, 0, 0);
    const e = new Date(trip.endDate).setHours(0, 0, 0, 0);
    const diff = Math.round((e - s) / 86400000) + 1;
    base = Math.min(MAX_PLANNER_DAYS, Math.max(1, diff));
  }
  const fromPlaces = Math.min(MAX_PLANNER_DAYS, Math.max(1, Math.ceil(placeCount / 3)));
  return Math.min(MAX_PLANNER_DAYS, Math.max(base, fromPlaces));
}

function normalizeTimeSlot(v: unknown): (typeof TIME_SLOTS)[number] {
  const s = typeof v === "string" ? v : "";
  if (s === "Morning" || s === "Afternoon" || s === "Evening") return s;
  return "Morning";
}

function clampToAllowedDay(day: number, allowedSorted: number[]): number {
  if (!allowedSorted.length) return 1;
  if (allowedSorted.includes(day)) return day;
  return allowedSorted.reduce((best, d) =>
    Math.abs(d - day) < Math.abs(best - day) ? d : best,
  );
}

function heuristicPlan(placeIds: string[], allowedDays: number[]): Assignment[] {
  if (!placeIds.length || !allowedDays.length) return [];
  const sortedDays = [...new Set(allowedDays)].sort((a, b) => a - b);
  const out: Assignment[] = [];
  const orderByDay = new Map<number, number>();
  for (let i = 0; i < placeIds.length; i++) {
    const day = sortedDays[i % sortedDays.length];
    const o = orderByDay.get(day) ?? 0;
    out.push({
      placeId: placeIds[i],
      plannerDay: day,
      plannerOrder: o,
      timeSlot: TIME_SLOTS[o % TIME_SLOTS.length],
    });
    orderByDay.set(day, o + 1);
  }
  out.sort((a, b) =>
    a.plannerDay !== b.plannerDay
      ? a.plannerDay - b.plannerDay
      : a.plannerOrder !== b.plannerOrder
        ? a.plannerOrder - b.plannerOrder
        : TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot),
  );
  const byDay = new Map<number, Assignment[]>();
  for (const a of out) {
    const arr = byDay.get(a.plannerDay) ?? [];
    arr.push(a);
    byDay.set(a.plannerDay, arr);
  }
  const final: Assignment[] = [];
  for (const day of sortedDays) {
    const rows = byDay.get(day);
    if (!rows) continue;
    rows.sort(
      (a, b) =>
        TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot) ||
        a.plannerOrder - b.plannerOrder,
    );
    rows.forEach((r, idx) => final.push({ ...r, plannerOrder: idx }));
  }
  return final;
}

function normalizeAiAssignments(
  raw: unknown,
  validIds: string[],
  allowedDays: number[],
): Assignment[] {
  const sortedAllowed = [...new Set(allowedDays)].sort((a, b) => a - b);
  if (!Array.isArray(raw)) return heuristicPlan(validIds, allowedDays);
  const allowed = new Set(validIds);
  const seen = new Set<string>();
  const out: Assignment[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const placeId = typeof r.placeId === "string" ? r.placeId : null;
    if (!placeId || !allowed.has(placeId) || seen.has(placeId)) continue;
    let day = Math.trunc(Number(r.plannerDay ?? r.day));
    let order = Math.trunc(Number(r.plannerOrder ?? r.order ?? 0));
    if (day === 0 || !Number.isFinite(day) || day < 1) {
      day = sortedAllowed[0] ?? 1;
    }
    day = clampToAllowedDay(day, sortedAllowed);
    if (!Number.isFinite(order) || order < 0) order = 0;
    const timeSlot = normalizeTimeSlot(r.timeSlot);
    seen.add(placeId);
    out.push({ placeId, plannerDay: day, plannerOrder: order, timeSlot });
  }
  const missing = validIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    out.push(...heuristicPlan(missing, allowedDays));
  }
  out.sort((a, b) =>
    a.plannerDay !== b.plannerDay
      ? a.plannerDay - b.plannerDay
      : a.plannerOrder !== b.plannerOrder
        ? a.plannerOrder - b.plannerOrder
        : TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot),
  );
  return out;
}

/** Ensure plannerOrder is 0..n-1 within each (day, timeSlot) group. */
function stabilizePlannerOrders(assignments: Assignment[]): Assignment[] {
  const groups = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const key = `${a.plannerDay}|${a.timeSlot}`;
    const arr = groups.get(key) ?? [];
    arr.push(a);
    groups.set(key, arr);
  }
  const out: Assignment[] = [];
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.plannerOrder - b.plannerOrder);
    arr.forEach((a, i) => out.push({ ...a, plannerOrder: i }));
  }
  out.sort(
    (a, b) =>
      a.plannerDay !== b.plannerDay
        ? a.plannerDay - b.plannerDay
        : TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot) ||
          a.plannerOrder - b.plannerOrder,
  );
  return out;
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

    const body = (await req.json()) as {
      dayCount?: number;
      scope?: "all" | "specific_days";
      specificDays?: number[];
      instructions?: string;
    };
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        name: true,
        region: true,
        city: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const places = await prisma.place.findMany({
      where: { tripId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        notes: true,
        category: true,
        tag: true,
        location: true,
        city: true,
        country: true,
        subLocation: true,
        formattedAddress: true,
        latitude: true,
        longitude: true,
      },
    });

    const placeIds = places.map((p) => p.id);
    let dayCount =
      typeof body.dayCount === "number" && Number.isInteger(body.dayCount)
        ? body.dayCount
        : computeDefaultDayCount(trip, places.length);
    dayCount = Math.min(MAX_PLANNER_DAYS, Math.max(1, dayCount));

    const fullDayRange = Array.from({ length: dayCount }, (_, i) => i + 1);
    let allowedDays = fullDayRange;
    if (
      body.scope === "specific_days" &&
      Array.isArray(body.specificDays) &&
      body.specificDays.length > 0
    ) {
      allowedDays = [...new Set(body.specificDays)]
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= MAX_PLANNER_DAYS)
        .sort((a, b) => a - b);
      if (allowedDays.length === 0) {
        allowedDays = fullDayRange;
      }
    }

    if (placeIds.length === 0) {
      return NextResponse.json({ assignments: [], dayCount });
    }

    const payload = places.map((p) => ({
      placeId: p.id,
      title: p.title,
      description: p.description,
      notes: p.notes,
      category: p.category,
      tag: p.tag,
      city: p.city,
      country: p.country,
      subLocation: p.subLocation,
      location: p.formattedAddress ?? p.location,
      latitude: p.latitude,
      longitude: p.longitude,
    }));

    const instructions =
      typeof body.instructions === "string" ? body.instructions.trim() : "";
    const allowedDaysLabel = allowedDays.join(", ");

    let assignments: Assignment[];

    try {
      const client = getOpenAIClient();
      const systemContent = buildSmartPlanSystemPrompt(instructions);
      const userPayload = {
        tripName: trip.name,
        region: trip.region,
        city: trip.city,
        tripStartDate: trip.startDate?.toISOString() ?? null,
        tripEndDate: trip.endDate?.toISOString() ?? null,
        dayCount,
        allowedDays,
        allowedDaysLabel,
        places: payload,
      };
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContent },
          {
            role: "user",
            content: JSON.stringify(userPayload),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });
      const rawText = completion.choices[0]?.message?.content;
      let parsed: { assignments?: unknown };
      try {
        parsed = JSON.parse(rawText ?? "{}") as { assignments?: unknown };
      } catch {
        parsed = {};
      }
      assignments = stabilizePlannerOrders(
        normalizeAiAssignments(parsed.assignments, placeIds, allowedDays),
      );
    } catch (e) {
      console.error("[smart-plan] OpenAI or parse failed, using heuristic:", e);
      assignments = heuristicPlan(placeIds, allowedDays);
    }

    const validIdSet = new Set(placeIds);
    return NextResponse.json({
      dayCount,
      assignments: assignments
        .filter((a) => validIdSet.has(a.placeId))
        .map((a) => ({
          placeId: String(a.placeId).trim(),
          plannerDay: Math.min(
            dayCount,
            Math.max(1, Math.trunc(Number(a.plannerDay))),
          ),
          plannerOrder: Math.max(0, Math.trunc(Number(a.plannerOrder))),
          timeSlot: normalizeTimeSlot(a.timeSlot),
        })),
    });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Smart plan failed" }, { status: 500 });
  }
}
