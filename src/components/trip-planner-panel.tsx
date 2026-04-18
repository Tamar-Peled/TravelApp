"use client";

import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Trip } from "@prisma/client";
import {
  ArrowDownUp,
  ArrowLeft,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Ref } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { PlaceWithTrip } from "@/components/collection-landing";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SmartPlanModal, type SmartPlanScope } from "@/components/smart-plan-modal";
import { PlannerPlaceDetailModal } from "@/components/planner-place-detail-modal";
import { PlannerReorderDaysSheet } from "@/components/planner-reorder-days-sheet";
import {
  buildPlannerPdfDays,
  groupPlannerDaysIntoWeeks,
  PlannerTripPdfDocument,
} from "@/components/planner-pdf-document";
import { MAX_PLANNER_DAYS } from "@/lib/planner-constants";
import { CategoryPillReadonly } from "@/lib/place-category-meta";
import {
  formatPlannerDayShortDate,
  tripDateRangeDayCount,
  tripDayCalendarDate,
} from "@/lib/trip-planner-dates";

const PLANNER_SLOTS = ["Morning", "Afternoon", "Evening"] as const;
type PlannerSlot = (typeof PLANNER_SLOTS)[number];

function plannerCollisionDetection(
  args: Parameters<typeof closestCorners>[0],
) {
  if (args.active.data.current?.sortableType === "dayColumn") {
    return closestCenter(args);
  }
  const byPointer = pointerWithin(args);
  if (byPointer.length > 0) return byPointer;
  return closestCorners(args);
}

function plannerColSortableId(day: number): string {
  return `planner-col-${day}`;
}

/**
 * perm[newIdx] = old day number (1..n) whose column content moves to visual day newIdx+1.
 */
function remapDayColumns(
  items: Record<string, string[]>,
  labels: Record<string, string>,
  perm: number[],
): { nextItems: Record<string, string[]>; nextLabels: Record<string, string> } {
  const n = perm.length;
  const nextItems: Record<string, string[]> = {
    unscheduled: [...(items.unscheduled ?? [])],
  };
  for (let newDay = 1; newDay <= n; newDay++) {
    const oldDay = perm[newDay - 1];
    for (const s of PLANNER_SLOTS) {
      nextItems[daySlotKey(newDay, s)] = [...(items[daySlotKey(oldDay, s)] ?? [])];
    }
  }
  const nextLabels: Record<string, string> = {};
  for (let newDay = 1; newDay <= n; newDay++) {
    const oldDay = perm[newDay - 1];
    const v = labels[String(oldDay)]?.trim();
    if (v) nextLabels[String(newDay)] = v;
  }
  return { nextItems, nextLabels };
}

function daySlotKey(day: number, slot: PlannerSlot): string {
  return `day-${day}-${slot}`;
}

function parseDaySlotKey(key: string): { day: number; slot: PlannerSlot } | null {
  const m = /^day-(\d+)-(Morning|Afternoon|Evening)$/.exec(key);
  if (!m) return null;
  return { day: parseInt(m[1], 10), slot: m[2] as PlannerSlot };
}

function normalizeDbTimeSlot(t: string | null | undefined): PlannerSlot {
  if (t === "Afternoon" || t === "Evening" || t === "Morning") return t;
  return "Morning";
}

function parsePlannerDayLabels(
  trip: (Trip & { plannerDayLabels?: unknown }) | null,
): Record<string, string> {
  const raw = trip?.plannerDayLabels;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

function sortPlaces(a: PlaceWithTrip, b: PlaceWithTrip) {
  const o = (a.plannerOrder ?? 0) - (b.plannerOrder ?? 0);
  if (o !== 0) return o;
  return a.title.localeCompare(b.title);
}

function buildColumnState(
  places: PlaceWithTrip[],
  dayCount: number,
): Record<string, string[]> {
  const cols: Record<string, string[]> = { unscheduled: [] };
  for (let d = 1; d <= dayCount; d++) {
    for (const s of PLANNER_SLOTS) {
      cols[daySlotKey(d, s)] = [];
    }
  }
  cols.unscheduled = places
    .filter((p) => p.plannerDay == null || p.plannerDay < 1)
    .sort(sortPlaces)
    .map((p) => p.id);
  for (let d = 1; d <= dayCount; d++) {
    const onDay = places.filter((p) => p.plannerDay === d).sort(sortPlaces);
    for (const p of onDay) {
      const slot = normalizeDbTimeSlot(p.timeSlot);
      cols[daySlotKey(d, slot)].push(p.id);
    }
  }
  return cols;
}

function assignmentsToColumns(
  assignments: Array<{
    placeId: string;
    plannerDay: number;
    plannerOrder: number;
    timeSlot?: string | null;
  }>,
  dayCount: number,
): Record<string, string[]> {
  const cols: Record<string, string[]> = { unscheduled: [] };
  for (let d = 1; d <= dayCount; d++) {
    for (const s of PLANNER_SLOTS) {
      cols[daySlotKey(d, s)] = [];
    }
  }
  const sorted = [...assignments].sort((a, b) => {
    if (a.plannerDay !== b.plannerDay) return a.plannerDay - b.plannerDay;
    const sa = normalizeDbTimeSlot(a.timeSlot);
    const sb = normalizeDbTimeSlot(b.timeSlot);
    const diff = PLANNER_SLOTS.indexOf(sa) - PLANNER_SLOTS.indexOf(sb);
    if (diff !== 0) return diff;
    return a.plannerOrder - b.plannerOrder;
  });
  for (const a of sorted) {
    if (a.plannerDay < 1 || a.plannerDay > dayCount) {
      cols.unscheduled.push(a.placeId);
    } else {
      const slot = normalizeDbTimeSlot(a.timeSlot);
      cols[daySlotKey(a.plannerDay, slot)].push(a.placeId);
    }
  }
  return cols;
}

/**
 * Coerce AI / network payloads before building columns or calling planner/apply.
 * Drops unknown placeIds, dedupes, clamps days to 1…dayCount, integer order, known slots only.
 * Any trip place missing from the payload is placed in unscheduled (plannerDay 0).
 */
function sanitizeSmartPlanAssignments(
  raw: Array<{
    placeId?: unknown;
    plannerDay?: unknown;
    plannerOrder?: unknown;
    timeSlot?: unknown;
  }>,
  tripPlaces: PlaceWithTrip[],
  dayCount: number,
): Array<{
  placeId: string;
  plannerDay: number;
  plannerOrder: number;
  timeSlot?: string | null;
}> {
  const validIds = new Set(tripPlaces.map((p) => p.id));
  const seen = new Set<string>();
  const out: Array<{
    placeId: string;
    plannerDay: number;
    plannerOrder: number;
    timeSlot?: string | null;
  }> = [];

  for (const row of raw) {
    const placeId =
      typeof row.placeId === "string"
        ? row.placeId.trim()
        : typeof row.placeId === "number"
          ? String(row.placeId).trim()
          : "";
    if (!placeId || !validIds.has(placeId) || seen.has(placeId)) continue;

    let day = Math.trunc(Number(row.plannerDay));
    if (!Number.isFinite(day)) day = 1;
    day = Math.min(dayCount, Math.max(1, day));

    let order = Math.trunc(Number(row.plannerOrder ?? 0));
    if (!Number.isFinite(order) || order < 0) order = 0;

    const ts = row.timeSlot;
    const timeSlot =
      ts === "Morning" || ts === "Afternoon" || ts === "Evening"
        ? ts
        : typeof ts === "string"
          ? normalizeDbTimeSlot(ts)
          : null;

    seen.add(placeId);
    out.push({ placeId, plannerDay: day, plannerOrder: order, timeSlot });
  }

  let fallbackOrder = 0;
  for (const p of tripPlaces) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push({
        placeId: p.id,
        plannerDay: 0,
        plannerOrder: fallbackOrder++,
        timeSlot: null,
      });
    }
  }

  return out;
}

function columnsToAssignments(
  items: Record<string, string[]>,
  dayCount: number,
): {
  placeId: string;
  plannerDay: number | null;
  plannerOrder: number;
  timeSlot: string | null;
}[] {
  const out: {
    placeId: string;
    plannerDay: number | null;
    plannerOrder: number;
    timeSlot: string | null;
  }[] = [];
  (items.unscheduled ?? []).forEach((placeId, i) => {
    out.push({ placeId, plannerDay: null, plannerOrder: i, timeSlot: null });
  });
  for (let d = 1; d <= dayCount; d++) {
    let order = 0;
    for (const s of PLANNER_SLOTS) {
      const key = daySlotKey(d, s);
      for (const placeId of items[key] ?? []) {
        out.push({ placeId, plannerDay: d, plannerOrder: order++, timeSlot: s });
      }
    }
  }
  return out;
}

function findContainer(id: string, items: Record<string, string[]>): string | undefined {
  if (id in items) return id;
  return Object.keys(items).find((key) => items[key].includes(id));
}

/** When reordering day columns, `over` may be a slot key or a place id — resolve target day. */
function resolveTargetDayForColumnSwap(
  overIdStr: string,
  mergedItems: Record<string, string[]>,
  mergedDayCount: number,
): number | null {
  if (overIdStr.startsWith("planner-col-")) {
    const d = parseInt(overIdStr.replace("planner-col-", ""), 10);
    return Number.isFinite(d) && d >= 1 && d <= mergedDayCount ? d : null;
  }
  const slot = parseDaySlotKey(overIdStr);
  if (slot) return slot.day;
  const container = findContainer(overIdStr, mergedItems);
  if (!container || container === "unscheduled") return null;
  const parsed = parseDaySlotKey(container);
  return parsed?.day ?? null;
}

function maxPlannerDayFromPlaces(places: PlaceWithTrip[]): number {
  return places.reduce((m, p) => Math.max(m, p.plannerDay ?? 0), 0);
}

function shiftPlannerLabelsOnInsert(
  labels: Record<string, string>,
  afterDay: number,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(labels)) {
    const n = parseInt(k, 10);
    if (!Number.isFinite(n)) continue;
    if (n <= afterDay) next[k] = v;
    else next[String(n + 1)] = v;
  }
  return next;
}

function shiftPlannerLabelsOnDelete(
  labels: Record<string, string>,
  deletedDay: number,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(labels)) {
    const n = parseInt(k, 10);
    if (!Number.isFinite(n)) continue;
    if (n === deletedDay) continue;
    if (n > deletedDay) next[String(n - 1)] = v;
    else next[k] = v;
  }
  return next;
}

function insertDayAfterColumn(
  items: Record<string, string[]>,
  afterDay: number,
  oldCount: number,
): Record<string, string[]> | null {
  if (oldCount >= MAX_PLANNER_DAYS) return null;
  const newCount = oldCount + 1;
  const next: Record<string, string[]> = { unscheduled: [...(items.unscheduled ?? [])] };
  for (let d = 1; d <= afterDay; d++) {
    for (const s of PLANNER_SLOTS) {
      next[daySlotKey(d, s)] = [...(items[daySlotKey(d, s)] ?? [])];
    }
  }
  for (const s of PLANNER_SLOTS) {
    next[daySlotKey(afterDay + 1, s)] = [];
  }
  for (let d = afterDay + 2; d <= newCount; d++) {
    const src = d - 1;
    for (const s of PLANNER_SLOTS) {
      next[daySlotKey(d, s)] = [...(items[daySlotKey(src, s)] ?? [])];
    }
  }
  return next;
}

function deleteDayColumnState(
  items: Record<string, string[]>,
  deletedDay: number,
  totalDays: number,
): { next: Record<string, string[]>; newCount: number } | null {
  if (totalDays <= 1) return null;
  const newCount = totalDays - 1;
  const next: Record<string, string[]> = { unscheduled: [...(items.unscheduled ?? [])] };
  for (const s of PLANNER_SLOTS) {
    next.unscheduled.push(...(items[daySlotKey(deletedDay, s)] ?? []));
  }
  for (let d = 1; d < deletedDay; d++) {
    for (const s of PLANNER_SLOTS) {
      next[daySlotKey(d, s)] = [...(items[daySlotKey(d, s)] ?? [])];
    }
  }
  for (let d = deletedDay; d < totalDays; d++) {
    const src = d + 1;
    for (const s of PLANNER_SLOTS) {
      next[daySlotKey(d, s)] = [...(items[daySlotKey(src, s)] ?? [])];
    }
  }
  return { next, newCount };
}

function DayColumnTitle({
  day,
  trip,
  customLabel,
  onSave,
  onRequestDelete,
  canDelete,
  onInsertDayAfter,
  canAddDay,
}: {
  day: number;
  trip: Trip;
  customLabel: string;
  onSave: (day: number, label: string) => void;
  onRequestDelete: () => void;
  canDelete: boolean;
  onInsertDayAfter?: (day: number) => void;
  canAddDay?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(customLabel);

  const cal = tripDayCalendarDate(trip.startDate, day);
  const dateStr = cal ? formatPlannerDayShortDate(cal) : null;
  const defaultLine = dateStr ? `Day ${day} - ${dateStr}` : `Day ${day}`;

  useEffect(() => {
    setValue(customLabel);
  }, [customLabel, day]);

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          onSave(day, value.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setValue(customLabel);
            setEditing(false);
          }
        }}
        className="w-full rounded-xl border border-zinc-200/90 bg-white px-2 py-1.5 text-sm font-extrabold tracking-tight text-zinc-900 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-[var(--primary-muted)]"
        aria-label={`Rename day ${day}`}
      />
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-1">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 rounded-xl px-1 py-0.5 text-left text-sm font-extrabold tracking-tight text-zinc-900 transition-colors hover:bg-zinc-100/80"
      >
        {customLabel.trim() ? customLabel : defaultLine}
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="touch-manipulation rounded-lg p-1.5 text-zinc-500 opacity-100 transition-all hover:bg-zinc-100 hover:text-zinc-800 hover:opacity-100 lg:opacity-40 lg:group-hover/daycol:opacity-100"
          aria-label="Edit day title"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
        {onInsertDayAfter && canAddDay ? (
          <button
            type="button"
            onClick={() => onInsertDayAfter(day)}
            className="hidden touch-manipulation rounded-lg p-1.5 text-zinc-500 opacity-40 transition-all hover:bg-zinc-100 hover:text-zinc-800 hover:opacity-100 lg:flex lg:group-hover/daycol:opacity-100"
            aria-label={`Add day after day ${day}`}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canDelete}
          onClick={onRequestDelete}
          className="touch-manipulation rounded-lg p-1.5 text-zinc-500 opacity-100 transition-all hover:bg-red-50 hover:text-red-600 hover:opacity-100 disabled:pointer-events-none disabled:opacity-25 lg:opacity-40 lg:group-hover/daycol:opacity-100"
          aria-label="Delete day"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function PlannerCardShell({
  place,
  showCategory = true,
  presentation = "card",
  dragHandleProps,
  onOpen,
}: {
  place: PlaceWithTrip;
  showCategory?: boolean;
  presentation?: "card" | "overlay";
  dragHandleProps?: { ref?: Ref<HTMLButtonElement>; [key: string]: unknown };
  onOpen?: () => void;
}) {
  return (
    <div className="flex touch-none items-center gap-1 rounded-2xl border border-zinc-100 bg-white/90 p-2 pr-2 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md">
      {presentation === "card" ? (
        <button
          type="button"
          className="touch-manipulation shrink-0 cursor-grab rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...(dragHandleProps ?? {})}
        >
          <GripVertical className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-0.5 text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-default"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {place.photoReference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo?ref=${encodeURIComponent(place.photoReference)}&maxwidth=200`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <ImageIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          {showCategory ? (
            <div className="mb-1">
              <CategoryPillReadonly category={place.category ?? null} />
            </div>
          ) : null}
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">{place.title}</p>
        </div>
      </button>
    </div>
  );
}

function SortablePlannerItem({
  id,
  place,
  listKind,
  onRemoveFromDay,
  onOpenPlace,
}: {
  id: string;
  place: PlaceWithTrip;
  listKind: "unscheduled" | "day";
  onRemoveFromDay: (placeId: string) => void;
  onOpenPlace: (place: PlaceWithTrip) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="group relative min-w-0">
      <PlannerCardShell
        place={place}
        showCategory
        dragHandleProps={{ ...listeners, ...attributes }}
        onOpen={() => onOpenPlace(place)}
      />
      {listKind === "day" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemoveFromDay(place.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 z-20 flex h-7 w-7 touch-manipulation items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-500 shadow-sm opacity-100 transition-opacity hover:border-zinc-300 hover:bg-white hover:text-zinc-800 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Unschedule — move to pool"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function PlannerSlotBlock({
  id,
  label,
  placeIds,
  placeById,
  listKind,
  onRemoveFromDay,
  onOpenPlace,
}: {
  id: string;
  label: string;
  placeIds: string[];
  placeById: Map<string, PlaceWithTrip>;
  listKind: "unscheduled" | "day";
  onRemoveFromDay: (placeId: string) => void;
  onOpenPlace: (place: PlaceWithTrip) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="min-w-0">
      <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </p>
      <SortableContext items={placeIds} strategy={verticalListSortingStrategy}>
        <div
          className={`flex min-h-[72px] flex-col gap-2 rounded-2xl border border-dashed p-2 transition-colors ${
            isOver
              ? "border-emerald-400/75 bg-emerald-50/80"
              : "border-zinc-200/70 bg-zinc-50/50"
          }`}
        >
          {placeIds.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-zinc-400">Drop items here</p>
          ) : (
            placeIds.map((pid) => {
              const place = placeById.get(pid);
              if (!place) return null;
              return (
                <SortablePlannerItem
                  key={pid}
                  id={pid}
                  place={place}
                  listKind={listKind}
                  onRemoveFromDay={onRemoveFromDay}
                  onOpenPlace={onOpenPlace}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function PlannerDayColumn({
  day,
  trip,
  mergedItems,
  placeById,
  dayLabels,
  mergedDayCount,
  onSaveDayLabel,
  onRemoveFromDay,
  onOpenPlace,
  onInsertDayAfter,
  onRequestDeleteDay,
}: {
  day: number;
  trip: Trip;
  mergedItems: Record<string, string[]>;
  placeById: Map<string, PlaceWithTrip>;
  dayLabels: Record<string, string>;
  mergedDayCount: number;
  onSaveDayLabel: (day: number, label: string) => void;
  onRemoveFromDay: (placeId: string) => void;
  onOpenPlace: (place: PlaceWithTrip) => void;
  onInsertDayAfter: (afterDay: number) => void;
  onRequestDeleteDay: (day: number) => void;
}) {
  const custom = dayLabels[String(day)] ?? "";
  return (
    <div className="group/daycol relative flex w-[min(280px,calc(100vw-6rem))] shrink-0 flex-col rounded-3xl border border-zinc-100 bg-white/85 p-3 shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] backdrop-blur-md">
      <div className="relative z-30 mb-3 shrink-0">
        <DayColumnTitle
          day={day}
          trip={trip}
          customLabel={custom}
          onSave={onSaveDayLabel}
          onRequestDelete={() => onRequestDeleteDay(day)}
          canDelete={mergedDayCount > 1}
          onInsertDayAfter={onInsertDayAfter}
          canAddDay={mergedDayCount < MAX_PLANNER_DAYS}
        />
      </div>
      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {PLANNER_SLOTS.map((slot) => (
          <PlannerSlotBlock
            key={slot}
            id={daySlotKey(day, slot)}
            label={slot}
            placeIds={mergedItems[daySlotKey(day, slot)] ?? []}
            placeById={placeById}
            listKind="day"
            onRemoveFromDay={onRemoveFromDay}
            onOpenPlace={onOpenPlace}
          />
        ))}
      </div>
    </div>
  );
}

type PlannerDayColumnProps = {
  day: number;
  trip: Trip;
  mergedItems: Record<string, string[]>;
  placeById: Map<string, PlaceWithTrip>;
  dayLabels: Record<string, string>;
  mergedDayCount: number;
  onSaveDayLabel: (day: number, label: string) => void;
  onRemoveFromDay: (placeId: string) => void;
  onOpenPlace: (place: PlaceWithTrip) => void;
  onInsertDayAfter: (afterDay: number) => void;
  onRequestDeleteDay: (day: number) => void;
};

function SortablePlannerDayColumn({
  day,
  ...rest
}: PlannerDayColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plannerColSortableId(day),
    data: { sortableType: "dayColumn" as const },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 45 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative shrink-0 cursor-grab active:cursor-grabbing"
      title="Drag to reorder days"
      {...listeners}
      {...attributes}
    >
      <PlannerDayColumn day={day} {...rest} />
    </div>
  );
}

function UnscheduledColumn({
  placeIds,
  placeById,
  onRemoveFromDay,
  onOpenPlace,
}: {
  placeIds: string[];
  placeById: Map<string, PlaceWithTrip>;
  onRemoveFromDay: (placeId: string) => void;
  onOpenPlace: (place: PlaceWithTrip) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unscheduled" });
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 w-full max-w-[300px] shrink-0 flex-col rounded-3xl border border-zinc-100 bg-white/85 p-3 shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] backdrop-blur-md lg:max-w-none ${
        isOver
          ? "ring-2 ring-emerald-500/45 ring-offset-2 ring-offset-[#FAF9F6] [box-shadow:0_0_0_1px_rgba(16,185,129,0.12)]"
          : ""
      }`}
    >
      <SortableContext items={placeIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {placeIds.length === 0 ? (
            <p
              className={`rounded-2xl border border-dashed px-3 py-6 text-center text-xs transition-colors ${
                isOver
                  ? "border-emerald-400/70 bg-emerald-50/90 text-emerald-800/90"
                  : "border-zinc-200/90 bg-zinc-50/80 text-zinc-400"
              }`}
            >
              Drop items here
            </p>
          ) : (
            placeIds.map((pid) => {
              const place = placeById.get(pid);
              if (!place) return null;
              return (
                <SortablePlannerItem
                  key={pid}
                  id={pid}
                  place={place}
                  listKind="unscheduled"
                  onRemoveFromDay={onRemoveFromDay}
                  onOpenPlace={onOpenPlace}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TripPlannerPanel({
  trips,
  places,
  selectedTripId,
  onSelectTripForPlanner,
  onBackToTripItems,
  onRefresh,
}: {
  trips: Trip[];
  places: PlaceWithTrip[];
  selectedTripId: string | null;
  onSelectTripForPlanner: (tripId: string) => void;
  onBackToTripItems: () => void;
  onRefresh: () => void;
}) {
  const selectedTrip = useMemo(
    () =>
      (trips.find((t) => t.id === selectedTripId) as
        | (Trip & { plannerDayLabels?: unknown })
        | null) ?? null,
    [trips, selectedTripId],
  );
  const tripPlaces = useMemo(
    () => places.filter((p) => p.tripId === selectedTripId),
    [places, selectedTripId],
  );

  const maxAssignedDay = useMemo(
    () => tripPlaces.reduce((m, p) => Math.max(m, p.plannerDay ?? 0), 0),
    [tripPlaces],
  );

  const datedDayCount = useMemo(
    () => tripDateRangeDayCount(selectedTrip?.startDate, selectedTrip?.endDate),
    [selectedTrip?.startDate, selectedTrip?.endDate],
  );
  const hasTripDates = datedDayCount != null;

  const [plannerDayCountOffset, setPlannerDayCountOffset] = useState(0);
  useEffect(() => {
    setPlannerDayCountOffset(0);
  }, [selectedTripId]);

  const coreBase = useMemo(
    () => (hasTripDates ? datedDayCount! : Math.max(1, maxAssignedDay)),
    [hasTripDates, datedDayCount, maxAssignedDay],
  );

  const baseDayCount = useMemo(
    () =>
      Math.min(MAX_PLANNER_DAYS, Math.max(1, coreBase + plannerDayCountOffset)),
    [coreBase, plannerDayCountOffset],
  );

  const baseDayCountRef = useRef(baseDayCount);
  baseDayCountRef.current = baseDayCount;

  const dayLabels = useMemo(() => parsePlannerDayLabels(selectedTrip), [selectedTrip]);

  const [items, setItems] = useState<Record<string, string[]>>({});
  /** After Smart Plan, block resetting local grid from `tripPlaces` until save succeeds or trip changes. */
  const smartPlanUiLockedRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [smartModalOpen, setSmartModalOpen] = useState(false);
  const [smartLoading, setSmartLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [detailPlace, setDetailPlace] = useState<PlaceWithTrip | null>(null);
  const [dayPendingDelete, setDayPendingDelete] = useState<number | null>(null);
  const [activeColumnDay, setActiveColumnDay] = useState<number | null>(null);
  const [reorderSheetOpen, setReorderSheetOpen] = useState(false);

  const placeById = useMemo(() => new Map(tripPlaces.map((p) => [p.id, p])), [tripPlaces]);

  const mergedDayCount = useMemo(() => {
    let maxDay = baseDayCount;
    for (const k of Object.keys(items)) {
      const parsed = parseDaySlotKey(k);
      if (parsed) maxDay = Math.max(maxDay, parsed.day);
    }
    return Math.min(MAX_PLANNER_DAYS, Math.max(1, maxDay));
  }, [items, baseDayCount]);

  const mergedItems = useMemo(() => {
    const next: Record<string, string[]> = { unscheduled: [...(items.unscheduled ?? [])] };
    for (let d = 1; d <= mergedDayCount; d++) {
      for (const s of PLANNER_SLOTS) {
        const k = daySlotKey(d, s);
        next[k] = [...(items[k] ?? [])];
      }
    }
    return next;
  }, [items, mergedDayCount]);

  useEffect(() => {
    smartPlanUiLockedRef.current = false;
  }, [selectedTripId]);

  useEffect(() => {
    if (!selectedTripId) return;
    if (smartPlanUiLockedRef.current) return;
    const bc = baseDayCountRef.current;
    const m = maxPlannerDayFromPlaces(tripPlaces);
    setItems(
      buildColumnState(
        tripPlaces,
        Math.min(MAX_PLANNER_DAYS, Math.max(1, bc, m)),
      ),
    );
  }, [tripPlaces, selectedTripId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistColumns = useCallback(
    async (cols: Record<string, string[]>, dayCount: number): Promise<boolean> => {
      const tid = selectedTripId?.trim();
      if (!tid) {
        toast.error("No trip selected");
        return false;
      }
      const assignments = columnsToAssignments(cols, dayCount);
      if (assignments.length === 0) return false;
      try {
        const res = await fetch(
          `/api/trips/${encodeURIComponent(tid)}/planner/apply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignments }),
          },
        );
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error || "Save failed");
        smartPlanUiLockedRef.current = false;
        onRefresh();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
        return false;
      }
    },
    [selectedTripId, onRefresh],
  );

  const applyDayPermutation = useCallback(
    async (perm: number[]) => {
      if (perm.length !== mergedDayCount || mergedDayCount < 1) return;
      const { nextItems, nextLabels } = remapDayColumns(mergedItems, dayLabels, perm);
      setItems(nextItems);
      await persistColumns(nextItems, mergedDayCount);
      const tid = selectedTripId?.trim();
      if (!tid) return;
      try {
        const res = await fetch(`/api/trips/${encodeURIComponent(tid)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plannerDayLabels: nextLabels }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error || "Could not save day titles");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save day titles");
      }
    },
    [
      mergedItems,
      mergedDayCount,
      dayLabels,
      persistColumns,
      selectedTripId,
      onRefresh,
    ],
  );

  const saveDayLabel = useCallback(
    async (day: number, label: string) => {
      const tid = selectedTripId?.trim();
      if (!tid || !selectedTrip) return;
      const prev = parsePlannerDayLabels(selectedTrip);
      const next = { ...prev };
      if (!label) delete next[String(day)];
      else next[String(day)] = label;
      try {
        const res = await fetch(`/api/trips/${encodeURIComponent(tid)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plannerDayLabels: next }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error || "Could not save title");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save title");
      }
    },
    [selectedTripId, selectedTrip, onRefresh],
  );

  const movePlaceToUnscheduled = useCallback(
    (placeId: string) => {
      const next: Record<string, string[]> = { ...mergedItems };
      for (const key of Object.keys(next)) {
        if (parseDaySlotKey(key)) {
          next[key] = next[key].filter((id) => id !== placeId);
        }
      }
      const without = (next.unscheduled ?? []).filter((id) => id !== placeId);
      next.unscheduled = [...without, placeId];
      setItems(next);
      void persistColumns(next, mergedDayCount);
    },
    [mergedItems, persistColumns, mergedDayCount],
  );

  const exportPdf = useCallback(async () => {
    if (!selectedTrip) return;
    setPdfLoading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const headerLine = (d: number) => {
        const custom = dayLabels[String(d)]?.trim();
        if (custom) return custom;
        const cal = tripDayCalendarDate(selectedTrip.startDate, d);
        const ds = cal ? formatPlannerDayShortDate(cal) : null;
        return ds ? `Day ${d} - ${ds}` : `Day ${d}`;
      };
      const days = buildPlannerPdfDays({
        dayCount: mergedDayCount,
        mergedItems,
        placeById,
        daySlotKey,
        dayHeaderLine: headerLine,
      });
      const weeks = groupPlannerDaysIntoWeeks(days);
      let blob: Blob;
      try {
        blob = await pdf(
          <PlannerTripPdfDocument tripName={selectedTrip.name} weeks={weeks} />,
        ).toBlob();
      } catch (pdfErr) {
        console.warn("[pdf] export failed, retrying with same built-in fonts", pdfErr);
        blob = await pdf(
          <PlannerTripPdfDocument tripName={selectedTrip.name} weeks={weeks} />,
        ).toBlob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedTrip.name.replace(/[^\w\-]+/g, "_").slice(0, 72)}-itinerary.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create PDF");
    } finally {
      setPdfLoading(false);
    }
  }, [selectedTrip, mergedItems, mergedDayCount, placeById, dayLabels]);

  const dayReorderPreviewLine = useCallback(
    (bucketDay: number, visualIndex0: number) => {
      const custom = dayLabels[String(bucketDay)]?.trim();
      const pos = visualIndex0 + 1;
      const cal = tripDayCalendarDate(selectedTrip?.startDate ?? null, pos);
      const dateStr = cal ? formatPlannerDayShortDate(cal) : null;
      if (custom) return `Day ${pos}: ${custom}`;
      return dateStr ? `Day ${pos} - ${dateStr}` : `Day ${pos}`;
    },
    [dayLabels, selectedTrip?.startDate],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    if (id.startsWith("planner-col-")) {
      const d = parseInt(id.replace("planner-col-", ""), 10);
      setActiveColumnDay(Number.isFinite(d) ? d : null);
    } else {
      setActiveColumnDay(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeIdStr = String(active.id);
    setActiveId(null);
    setActiveColumnDay(null);

    if (activeIdStr.startsWith("planner-col-")) {
      if (!over) return;
      const overIdStr = String(over.id);
      const oldDay = parseInt(activeIdStr.replace("planner-col-", ""), 10);
      const overDay = resolveTargetDayForColumnSwap(
        overIdStr,
        mergedItems,
        mergedDayCount,
      );
      if (!Number.isFinite(oldDay) || overDay == null) return;
      const days = Array.from({ length: mergedDayCount }, (_, i) => i + 1);
      const oldIndex = days.indexOf(oldDay);
      const newIndex = days.indexOf(overDay);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const perm = arrayMove(days, oldIndex, newIndex);
      void applyDayPermutation(perm);
      return;
    }

    if (!over) return;

    const overIdStr = String(over.id);

    const activeContainer = findContainer(activeIdStr, mergedItems);
    let overContainer = findContainer(overIdStr, mergedItems);
    if (!overContainer && overIdStr in mergedItems) overContainer = overIdStr;
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const list = mergedItems[activeContainer];
      const oldIndex = list.indexOf(activeIdStr);
      const newIndex = list.indexOf(overIdStr);
      if (oldIndex === -1) return;
      if (newIndex === -1) {
        const next = {
          ...mergedItems,
          [activeContainer]: arrayMove(list, oldIndex, list.length - 1),
        };
        setItems(next);
        void persistColumns(next, mergedDayCount);
        return;
      }
      if (oldIndex !== newIndex) {
        const next = {
          ...mergedItems,
          [activeContainer]: arrayMove(list, oldIndex, newIndex),
        };
        setItems(next);
        void persistColumns(next, mergedDayCount);
      }
      return;
    }

    const next = { ...mergedItems };
    const fromList = [...next[activeContainer]];
    const toList = [...next[overContainer]];
    const fromIndex = fromList.indexOf(activeIdStr);
    if (fromIndex === -1) return;
    const [moved] = fromList.splice(fromIndex, 1);
    const overIndex = toList.indexOf(overIdStr);
    if (overIdStr in mergedItems && overContainer === overIdStr) {
      toList.push(moved);
    } else if (overIndex >= 0) {
      toList.splice(overIndex, 0, moved);
    } else {
      toList.push(moved);
    }
    next[activeContainer] = fromList;
    next[overContainer] = toList;
    setItems(next);
    void persistColumns(next, mergedDayCount);
  };

  async function runSmartPlan(opts: {
    scope: SmartPlanScope;
    specificDays: number[];
    instructions: string;
  }) {
    const tid = selectedTripId?.trim();
    if (!tid) {
      toast.error("No trip selected");
      return;
    }
    setSmartLoading(true);
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(tid)}/smart-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayCount: mergedDayCount,
          scope: opts.scope,
          specificDays: opts.specificDays,
          instructions: opts.instructions,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        assignments?: Array<{
          placeId: string;
          plannerDay: number;
          plannerOrder: number;
          timeSlot?: string | null;
        }>;
        dayCount?: number;
      };
      if (!res.ok) throw new Error(json.error || "Smart plan failed");
      const dc = typeof json.dayCount === "number" ? json.dayCount : mergedDayCount;
      const dayCount = Math.min(MAX_PLANNER_DAYS, Math.max(1, dc));
      const rawAssignments = json.assignments ?? [];
      if (rawAssignments.length === 0 && tripPlaces.length === 0) {
        toast.message("No items to plan");
        return;
      }
      const sanitized = sanitizeSmartPlanAssignments(rawAssignments, tripPlaces, dayCount);
      const nextCols = assignmentsToColumns(sanitized, dayCount);
      smartPlanUiLockedRef.current = true;
      setItems(nextCols);
      setSmartModalOpen(false);
      const saved = await persistColumns(nextCols, dayCount);
      if (saved) toast.success("Smart Plan applied and saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Smart plan failed");
    } finally {
      setSmartLoading(false);
    }
  }

  const insertDayAfter = useCallback(
    async (afterDay: number) => {
      if (mergedDayCount >= MAX_PLANNER_DAYS) {
        toast.error("Maximum day count reached");
        return;
      }
      const next = insertDayAfterColumn(mergedItems, afterDay, mergedDayCount);
      if (!next) {
        toast.error("Maximum day count reached");
        return;
      }
      const newCount = mergedDayCount + 1;
      const newLabels = shiftPlannerLabelsOnInsert(dayLabels, afterDay);
      setPlannerDayCountOffset((o) => o + 1);
      setItems(next);
      await persistColumns(next, newCount);
      const tid = selectedTripId?.trim();
      if (!tid) return;
      try {
        const res = await fetch(`/api/trips/${encodeURIComponent(tid)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plannerDayLabels: newLabels }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error || "Could not save day titles");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save day titles");
      }
    },
    [
      mergedItems,
      mergedDayCount,
      dayLabels,
      persistColumns,
      selectedTripId,
      onRefresh,
    ],
  );

  const confirmDeleteDayColumn = useCallback(async () => {
    if (dayPendingDelete == null) return;
    const day = dayPendingDelete;
    setDayPendingDelete(null);
    const r = deleteDayColumnState(mergedItems, day, mergedDayCount);
    if (!r) {
      toast.message("At least one day is required");
      return;
    }
    setPlannerDayCountOffset((o) => o - 1);
    setItems(r.next);
    const newLabels = shiftPlannerLabelsOnDelete(dayLabels, day);
    await persistColumns(r.next, r.newCount);
    const tid = selectedTripId?.trim();
    if (!tid) return;
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(tid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannerDayLabels: newLabels }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not save day titles");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save day titles");
    }
  }, [
    dayPendingDelete,
    mergedItems,
    mergedDayCount,
    dayLabels,
    persistColumns,
    selectedTripId,
    onRefresh,
  ]);

  const activePlace = activeId ? placeById.get(activeId) : null;

  const stickyHeaderClass =
    "sticky top-0 z-40 -mx-4 mb-2 flex flex-col gap-2 border-b border-zinc-200/70 bg-[#FAF9F6]/95 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top,0px))] backdrop-blur-md sm:-mx-6 sm:px-6";

  if (!selectedTripId || !selectedTrip) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:px-6">
        <div className={stickyHeaderClass}>
          <button
            type="button"
            onClick={onBackToTripItems}
            className="touch-manipulation inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-700 active:bg-zinc-100/70 lg:hidden"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Planner</p>
            <h1 className="text-balance text-2xl font-extrabold tracking-tight text-[var(--primary)] sm:text-3xl">
              Choose a trip
            </h1>
          </div>
        </div>
        {trips.length === 0 ? (
          <p className="text-sm text-zinc-500">Create a trip first, then open the planner.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelectTripForPlanner(t.id)}
                  className="w-full rounded-3xl border border-zinc-100 bg-white/90 p-4 text-left shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] backdrop-blur-md transition-colors hover:bg-white"
                >
                  <p className="font-semibold text-zinc-900">{t.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">Open planner</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const dayColumnIds = Array.from({ length: mergedDayCount }, (_, i) => i + 1);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#FAF9F6]">
      <div className={stickyHeaderClass}>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBackToTripItems}
            className="touch-manipulation inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-zinc-700 active:bg-zinc-100/70 lg:min-h-11 lg:min-w-11"
            aria-label="Back to items"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Planner</p>
            <p className="truncate text-base font-extrabold tracking-tight text-[var(--primary)]">
              {selectedTrip.name}
            </p>
          </div>
          <div className="ml-auto hidden shrink-0 flex-wrap items-center justify-end gap-1.5 lg:flex">
            <button
              type="button"
              disabled={mergedDayCount < 2}
              onClick={() => setReorderSheetOpen(true)}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-white disabled:opacity-40"
              aria-label="Reorder days"
            >
              <ArrowDownUp className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="whitespace-nowrap">Reorder</span>
            </button>
            <button
              type="button"
              disabled={pdfLoading || tripPlaces.length === 0}
              onClick={() => void exportPdf()}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="whitespace-nowrap">{pdfLoading ? "PDF…" : "Export"}</span>
            </button>
            <button
              type="button"
              disabled={smartLoading || tripPlaces.length === 0}
              onClick={() => setSmartModalOpen(true)}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="whitespace-nowrap">Smart Plan</span>
            </button>
          </div>
        </div>

        <div className="flex w-full min-w-0 items-center justify-between gap-1.5 lg:hidden">
          <h2 className="min-w-0 flex-1 text-base font-bold leading-tight tracking-tight text-zinc-900">
            Schedule
          </h2>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              disabled={mergedDayCount < 2}
              onClick={() => setReorderSheetOpen(true)}
              className="inline-flex h-8 w-8 min-h-0 items-center justify-center rounded-lg border border-zinc-200/50 bg-white/40 text-zinc-700 backdrop-blur-sm hover:bg-zinc-100/70 disabled:opacity-40"
              aria-label="Reorder days"
            >
              <ArrowDownUp className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              disabled={pdfLoading || tripPlaces.length === 0}
              onClick={() => void exportPdf()}
              className="inline-flex h-8 w-8 min-h-0 items-center justify-center rounded-lg border border-zinc-200/50 bg-white/40 text-zinc-700 backdrop-blur-sm hover:bg-zinc-100/70 disabled:opacity-40"
              aria-label={pdfLoading ? "Exporting PDF" : "Export to PDF"}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              disabled={smartLoading || tripPlaces.length === 0}
              onClick={() => setSmartModalOpen(true)}
              className="inline-flex h-8 min-h-0 items-center justify-center gap-0.5 rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2 text-[10px] font-bold text-[var(--primary)] backdrop-blur-sm hover:bg-[var(--primary)]/15 disabled:opacity-40"
              aria-label="Smart Plan"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="max-w-[4.5rem] truncate">Plan</span>
            </button>
          </div>
        </div>
      </div>

      <SmartPlanModal
        open={smartModalOpen}
        dayCount={mergedDayCount}
        loading={smartLoading}
        onClose={() => !smartLoading && setSmartModalOpen(false)}
        onRun={(opts) => void runSmartPlan(opts)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={plannerCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-0 min-w-0 flex-1 gap-0 overflow-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6">
          <aside className="hidden min-h-0 w-[300px] shrink-0 flex-col pr-3 pt-1 lg:flex">
            <UnscheduledColumn
              placeIds={mergedItems.unscheduled ?? []}
              placeById={placeById}
              onRemoveFromDay={movePlaceToUnscheduled}
              onOpenPlace={setDetailPlace}
            />
          </aside>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-1 lg:pl-1">
            <h2 className="mb-2 hidden text-2xl font-bold tracking-tight text-zinc-900 lg:block">
              Schedule
            </h2>

            <div className="mb-3 lg:hidden">
              <UnscheduledColumn
                placeIds={mergedItems.unscheduled ?? []}
                placeById={placeById}
                onRemoveFromDay={movePlaceToUnscheduled}
                onOpenPlace={setDetailPlace}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
              <div className="flex h-full min-h-[min(70vh,520px)] gap-4 pr-2">
                <SortableContext
                  items={dayColumnIds.map(plannerColSortableId)}
                  strategy={horizontalListSortingStrategy}
                >
                  {dayColumnIds.map((d) => (
                    <SortablePlannerDayColumn
                      key={d}
                      day={d}
                      trip={selectedTrip}
                      mergedItems={mergedItems}
                      placeById={placeById}
                      dayLabels={dayLabels}
                      mergedDayCount={mergedDayCount}
                      onSaveDayLabel={saveDayLabel}
                      onRemoveFromDay={movePlaceToUnscheduled}
                      onOpenPlace={setDetailPlace}
                      onInsertDayAfter={(after) => void insertDayAfter(after)}
                      onRequestDeleteDay={setDayPendingDelete}
                    />
                  ))}
                </SortableContext>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void insertDayAfter(mergedDayCount)}
              disabled={mergedDayCount >= MAX_PLANNER_DAYS}
              className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-[25] flex items-center gap-1.5 rounded-full border border-white/50 bg-white/25 px-3 py-2 text-xs font-semibold text-zinc-800 shadow-[0_8px_32px_-10px_rgba(15,23,42,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-transform hover:bg-white/35 active:scale-[0.98] disabled:opacity-45 lg:hidden"
              aria-label="Add day to schedule"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Add day
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activePlace ? (
            <PlannerCardShell place={activePlace} showCategory presentation="overlay" />
          ) : activeColumnDay != null ? (
            <div className="flex w-[min(280px,calc(100vw-6rem))] flex-col rounded-3xl border-2 border-dashed border-[var(--primary)]/50 bg-white/80 p-4 shadow-2xl backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Reorder
              </p>
              <p className="mt-1 line-clamp-3 text-sm font-extrabold leading-snug text-zinc-900">
                {(() => {
                  const d = activeColumnDay;
                  const custom = dayLabels[String(d)]?.trim();
                  const cal = tripDayCalendarDate(selectedTrip.startDate, d);
                  const dateStr = cal ? formatPlannerDayShortDate(cal) : null;
                  if (custom) return custom;
                  return dateStr ? `Day ${d} - ${dateStr}` : `Day ${d}`;
                })()}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <PlannerReorderDaysSheet
        open={reorderSheetOpen}
        mergedDayCount={mergedDayCount}
        dayPreviewLine={dayReorderPreviewLine}
        onClose={() => setReorderSheetOpen(false)}
        onApply={(perm) => void applyDayPermutation(perm)}
      />

      <PlannerPlaceDetailModal
        open={detailPlace != null}
        place={detailPlace}
        onClose={() => setDetailPlace(null)}
      />

      <ConfirmDialog
        open={dayPendingDelete != null}
        title="Delete this day?"
        description="Places on this day move back to the pool. Other days are renumbered. This cannot be undone."
        confirmText="Delete day"
        tone="danger"
        onCancel={() => setDayPendingDelete(null)}
        onConfirm={() => void confirmDeleteDayColumn()}
      />

    </div>
  );
}
