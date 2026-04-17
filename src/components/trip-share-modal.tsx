"use client";

import { Share2, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

type Role = "EDITOR" | "VIEWER";

type CollaboratorsResponse = {
  tripId: string;
  viewer: { userId: string; isOwner: boolean };
  owner: { id: string; name: string | null; email: string | null };
  collaborators: Array<{
    id: string;
    role: Role;
    user: { id: string; name: string | null; email: string | null };
  }>;
};

export function TripShareModal({
  open,
  tripId,
  onClose,
}: {
  open: boolean;
  tripId: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CollaboratorsResponse | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/collaborators`, {
        cache: "no-store",
      });
      const json = (await res.json()) as Partial<CollaboratorsResponse> & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json as CollaboratorsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    void refresh();
  }, [open, tripId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const rows = useMemo(() => {
    if (!data) return [];
    const out: Array<
      | { kind: "owner"; label: string; sub: string; badge: string }
      | {
          kind: "collab";
          id: string;
          label: string;
          sub: string;
          role: Role;
        }
    > = [];
    out.push({
      kind: "owner",
      label: data.owner.name ?? "Owner",
      sub: data.owner.email ?? "",
      badge: "Owner",
    });
    for (const c of data.collaborators) {
      out.push({
        kind: "collab",
        id: c.id,
        label: c.user.name ?? c.user.email ?? "Collaborator",
        sub: c.user.email ?? "",
        role: c.role,
      });
    }
    return out;
  }, [data]);

  async function invite() {
    const e = email.trim();
    if (!e) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, role }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Invite failed");
      setEmail("");
      setRole("VIEWER");
      await refresh();
      toast.success("Collaborator invited");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invite failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function setCollaboratorRole(collaboratorId: string, next: Role) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/collaborators`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaboratorId, role: next }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Update failed");
      await refresh();
      toast.success("Role updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/trips/${tripId}/collaborators?collaboratorId=${encodeURIComponent(collaboratorId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Remove failed");
      await refresh();
      toast.success("Collaborator removed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remove failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  const isOwner = data?.viewer.isOwner ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/12 backdrop-blur-[8px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-[#FAF9F6] shadow-[0_24px_80px_-16px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.03)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/60 p-6 sm:p-8">
          <div>
            <p id={titleId} className="text-lg font-semibold tracking-tight text-zinc-900">
              Share trip
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Invite by email. Editors can add/edit items. Viewers are read-only.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="touch-manipulation -m-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}

          {!loading && data && (
            <>
              <div className="rounded-xl border border-zinc-100 bg-white/80 p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  People
                </p>
                <ul className="mt-3 divide-y divide-zinc-100">
                  {rows.map((r, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
                          {r.label}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{r.sub}</p>
                      </div>
                      {r.kind === "owner" ? (
                        <span className="rounded-md border border-zinc-200/90 bg-zinc-100/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                          Owner
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={r.role}
                            onChange={(e) =>
                              void setCollaboratorRole(r.id, e.target.value as Role)
                            }
                            disabled={!isOwner || saving}
                            className="min-h-9 rounded-lg border border-zinc-200/90 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 disabled:opacity-60"
                          >
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => setRemoveId(r.id)}
                              disabled={saving}
                              className="touch-manipulation flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-60"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {isOwner && (
                <div className="mt-5 rounded-xl border border-zinc-100 bg-white/80 p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Invite
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="min-h-11 flex-1 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="min-h-11 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-semibold text-zinc-800"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void invite()}
                    disabled={saving || !email.trim()}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Invite
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={removeId !== null}
        title="Are you sure?"
        description="They will lose access to this trip."
        cancelText="Cancel"
        confirmText="Remove"
        tone="danger"
        loading={saving}
        onCancel={() => setRemoveId(null)}
        onConfirm={() => {
          const id = removeId;
          setRemoveId(null);
          if (id) void removeCollaborator(id);
        }}
      />
    </div>
  );
}

