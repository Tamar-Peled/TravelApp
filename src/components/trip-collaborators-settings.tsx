"use client";

import { useState } from "react";

/** Mirrors Prisma Role; OWNER is not stored on TripCollaborator — it is Trip.ownerId */
type CollaboratorRole = "EDITOR" | "VIEWER";

type CollaboratorRow = {
  id: string;
  name: string;
  email: string;
  /** UI-only: OWNER rows have no role toggle */
  kind: "owner" | "collaborator";
  role: CollaboratorRole;
};

const INITIAL: CollaboratorRow[] = [
  {
    id: "u1",
    name: "You",
    email: "you@example.com",
    kind: "owner",
    role: "EDITOR",
  },
  {
    id: "u2",
    name: "Jordan Lee",
    email: "jordan@example.com",
    kind: "collaborator",
    role: "EDITOR",
  },
  {
    id: "u3",
    name: "Sam Chen",
    email: "sam@example.com",
    kind: "collaborator",
    role: "VIEWER",
  },
];

function RoleBadge({
  label,
  variant,
}: {
  label: string;
  variant: "owner" | "editor" | "viewer";
}) {
  const styles =
    variant === "owner"
      ? "border-zinc-200/90 bg-zinc-100/90 text-zinc-700"
      : variant === "editor"
        ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-800"
        : "border-sky-200/80 bg-sky-50/90 text-sky-800";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${styles}`}
    >
      {label}
    </span>
  );
}

export function TripCollaboratorsSettings() {
  const [rows, setRows] = useState<CollaboratorRow[]>(INITIAL);

  function setCollaboratorRole(id: string, role: CollaboratorRole) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id || row.kind === "owner") return row;
        return { ...row, role };
      }),
    );
  }

  return (
    <section
      className="w-full max-w-lg rounded-xl border border-zinc-100 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] sm:p-5"
      aria-labelledby="trip-collab-heading"
    >
      <h2
        id="trip-collab-heading"
        className="text-sm font-semibold tracking-tight text-zinc-900"
      >
        Trip settings · People
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Owners and editors can add places; viewers see the map and list only.{" "}
        <span className="sr-only">(UI preview — not persisted.)</span>
      </p>

      <ul className="mt-4 divide-y divide-zinc-100">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">
                {row.name}
              </p>
              <p className="truncate text-xs text-zinc-500">{row.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {row.kind === "owner" ? (
                  <RoleBadge label="Owner" variant="owner" />
                ) : row.role === "EDITOR" ? (
                  <RoleBadge label="Editor" variant="editor" />
                ) : (
                  <RoleBadge label="Viewer" variant="viewer" />
                )}
              </div>
            </div>

            {row.kind === "collaborator" && (
              <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  Role
                </span>
                <div
                  className="flex h-10 min-w-[152px] overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-50 p-0.5 shadow-sm"
                  role="group"
                  aria-label={`Role for ${row.name}`}
                >
                  <button
                    type="button"
                    aria-pressed={row.role === "EDITOR"}
                    onClick={() => setCollaboratorRole(row.id, "EDITOR")}
                    className={`touch-manipulation flex flex-1 items-center justify-center rounded-md px-2 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                      row.role === "EDITOR"
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    aria-pressed={row.role === "VIEWER"}
                    onClick={() => setCollaboratorRole(row.id, "VIEWER")}
                    className={`touch-manipulation flex flex-1 items-center justify-center rounded-md px-2 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                      row.role === "VIEWER"
                        ? "bg-white text-sky-800 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    Viewer
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
