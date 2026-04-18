"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

function reorderSheetRowId(day: number): string {
  return `reorder-sheet-day-${day}`;
}

function parseReorderSheetRowId(id: string): number | null {
  const m = /^reorder-sheet-day-(\d+)$/.exec(id);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function SortableDayReorderRow({
  id,
  line,
}: {
  id: string;
  line: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex touch-none list-none items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm"
      {...listeners}
      {...attributes}
    >
      <span
        className="shrink-0 cursor-grab text-zinc-400 active:cursor-grabbing"
        aria-hidden
      >
        <GripVertical className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-zinc-900">{line}</p>
    </li>
  );
}

export function PlannerReorderDaysSheet({
  open,
  mergedDayCount,
  dayPreviewLine,
  onClose,
  onApply,
}: {
  open: boolean;
  mergedDayCount: number;
  /** (bucketDay, visualIndex0) => display line — visualIndex0 is target position after apply */
  dayPreviewLine: (bucketDay: number, visualIndex0: number) => string;
  onClose: () => void;
  onApply: (perm: number[]) => void;
}) {
  const titleId = useId();
  const [order, setOrder] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setOrder(Array.from({ length: mergedDayCount }, (_, i) => i + 1));
  }, [open, mergedDayCount]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const a = parseReorderSheetRowId(String(active.id));
    const b = parseReorderSheetRowId(String(over.id));
    if (a == null || b == null) return;
    const oldIndex = order.indexOf(a);
    const newIndex = order.indexOf(b);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    setOrder((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  if (!open) return null;

  const sortableIds = order.map(reorderSheetRowId);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/25 backdrop-blur-[6px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(88dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-zinc-100 bg-[#FAF9F6] shadow-[0_-20px_80px_-24px_rgba(15,23,42,0.35)] sm:max-h-[min(80dvh,720px)] sm:rounded-3xl sm:shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3">
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-zinc-900">
            Organize days
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-3 text-sm text-zinc-600">
            Drag days into the order you want. Dates stay in trip order for fixed-date trips.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {order.map((bucketDay, visualIndex0) => (
                  <SortableDayReorderRow
                    key={reorderSheetRowId(bucketDay)}
                    id={reorderSheetRowId(bucketDay)}
                    line={dayPreviewLine(bucketDay, visualIndex0)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex gap-2 border-t border-zinc-200/80 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200/90 bg-white py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(order);
              onClose();
            }}
            className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            Apply order
          </button>
        </div>
      </div>
    </div>
  );
}
