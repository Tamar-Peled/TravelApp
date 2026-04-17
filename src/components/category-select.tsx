"use client";

import type { PlaceCategory } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const OPTIONS: Array<{ value: PlaceCategory | null; label: string }> = [
  { value: null, label: "Uncategorized" },
  { value: "HOTEL", label: "Hotel" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "VIEWPOINT", label: "Viewpoint" },
  { value: "TRANSPORT", label: "Transport" },
];

export function CategorySelect({
  value,
  onChange,
  className,
}: {
  value: PlaceCategory | null;
  onChange: (next: PlaceCategory | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const current = useMemo(
    () => OPTIONS.find((o) => o.value === value) ?? OPTIONS[0],
    [value],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const menuEl = menuRef.current;
      if (
        e.target instanceof Node &&
        !el.contains(e.target) &&
        !(menuEl && menuEl.contains(e.target))
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }

    const compute = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const gap = 8; // matches ~0.5rem
      const maxHeight = Math.min(250, Math.max(120, window.innerHeight - r.bottom - gap - 12));
      setMenuPos({
        top: r.bottom + gap,
        left: r.left,
        width: Math.max(176, r.width), // 44 = w-44; allow button width if larger
        maxHeight,
      });
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="inline-flex min-h-8 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-zinc-800 shadow-sm transition-colors hover:bg-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{current.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} aria-hidden />
      </button>

      {open && typeof document !== "undefined" && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[9999] overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200/80 bg-white p-1 font-sans shadow-[0_24px_80px_-28px_rgba(15,23,42,0.35)]"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {OPTIONS.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold tracking-tight font-sans transition-colors ${
                      active
                        ? "bg-[var(--primary-muted)] text-[var(--primary)]"
                        : "text-zinc-800 hover:bg-[var(--primary-muted)]/70 hover:text-[var(--primary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

