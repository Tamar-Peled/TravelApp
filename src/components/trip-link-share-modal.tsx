"use client";

import { Copy, ExternalLink, LoaderCircle, Share2, X, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";

function isProbablyMobileUserAgent() {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function TripLinkShareModal({
  open,
  tripId,
  tripName,
  onClose,
}: {
  open: boolean;
  tripId: string;
  tripName: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [role, setRole] = useState<Role>("VIEWER");
  const [error, setError] = useState<string | null>(null);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [collaborators, setCollaborators] = useState<
    Array<{ id: string; role: Role; email: string; name: string | null }>
  >([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER");
  const [inviteSaving, setInviteSaving] = useState(false);

  const isMobile = isProbablyMobileUserAgent();
  const canNativeShare = isMobile && typeof navigator !== "undefined" && typeof navigator.share === "function";

  const shareUrl = useMemo(() => {
    if (!token) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/share/${token}`;
  }, [token]);

  const whatsappUrl = useMemo(() => {
    if (!shareUrl) return null;
    const text = `בואו לראות את הטיול שלנו ב! ${shareUrl}`;
    const encoded = encodeURIComponent(text);
    return isMobile
      ? `https://wa.me/?text=${encoded}`
      : `https://web.whatsapp.com/send?text=${encoded}`;
  }, [isMobile, shareUrl]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(null);
    (async () => {
      try {
        const res = await fetch(`/api/share/settings?tripId=${encodeURIComponent(tripId)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          token?: string | null;
          enabled?: boolean;
          role?: Role;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "Share failed");
        if (!cancelled) {
          setEnabled(Boolean(json.enabled));
          setRole((json.role as Role) || "VIEWER");
          setToken(json.token ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Share failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tripId]);

  async function refreshCollaborators() {
    setCollabLoading(true);
    setCollabError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/collaborators`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        error?: string;
        viewer?: { isOwner?: boolean };
        collaborators?: Array<{
          id: string;
          role: Role;
          user?: { name?: string | null; email?: string | null };
        }>;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load collaborators");
      setIsOwner(Boolean(json.viewer?.isOwner));
      setCollaborators(
        (json.collaborators ?? []).map((c) => ({
          id: c.id,
          role: c.role,
          email: c.user?.email ?? "",
          name: c.user?.name ?? null,
        })),
      );
    } catch (e) {
      setCollabError(e instanceof Error ? e.message : "Failed to load collaborators");
    } finally {
      setCollabLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCollaborators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tripId]);

  async function invite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Invite failed");
      toast.success("Collaborator invited");
      setInviteEmail("");
      setInviteRole("VIEWER");
      await refreshCollaborators();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviteSaving(false);
    }
  }

  async function remove(collaboratorId: string) {
    setInviteSaving(true);
    try {
      const res = await fetch(
        `/api/trips/${tripId}/collaborators?collaboratorId=${encodeURIComponent(collaboratorId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Remove failed");
      toast.success("Collaborator removed");
      await refreshCollaborators();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setInviteSaving(false);
    }
  }

  async function updateSettings(next: { enabled?: boolean; role?: Role }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/share/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          enabled: next.enabled ?? enabled,
          role: next.role ?? role,
        }),
      });
      const json = (await res.json()) as {
        enabled?: boolean;
        role?: Role;
        token?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Update failed");
      setEnabled(Boolean(json.enabled));
      setRole((json.role as Role) || "VIEWER");
      setToken(json.token ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function shareToApps() {
    if (!shareUrl) return;
    // MUST be called from a direct user gesture (button click).
    if (!canNativeShare) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: tripName,
        text: `Trip: ${tripName}`,
        url: shareUrl,
      });
    } catch {
      // Silent fallback: no red overlay / uncaught promise.
      await copyLink();
    }
  }

  if (!open) return null;

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
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-100 bg-[#FAF9F6] shadow-[0_24px_80px_-16px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.03)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/60 p-6">
          <div className="min-w-0">
            <p id={titleId} className="truncate text-lg font-semibold tracking-tight text-zinc-900">
              Share trip link
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Anyone with the link can view this trip (read-only).
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

        <div className="p-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
              Generating link…
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-4 rounded-xl border border-zinc-100 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Link sharing</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {enabled ? "Anyone with the link can access this trip." : "Disabled"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void updateSettings({ enabled: !enabled })}
                disabled={loading}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  enabled ? "bg-[var(--primary)]" : "bg-zinc-200"
                }`}
                aria-pressed={enabled}
                aria-label="Toggle link sharing"
              >
                <span
                  className={`inline-block h-6 w-6 translate-x-0.5 rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-[1.35rem]" : ""
                  }`}
                />
              </button>
            </div>

            <div className="mt-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Permission
                </span>
                <select
                  value={role}
                  onChange={(e) => void updateSettings({ role: e.target.value as Role })}
                  disabled={!enabled || loading}
                  className="min-h-11 w-full appearance-none rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)] disabled:opacity-60"
                >
                  <option value="VIEWER">Anyone with link can View</option>
                  <option value="EDITOR">Anyone with link can Edit</option>
                </select>
              </label>
            </div>
          </div>

          {enabled && shareUrl && (
            <>
              <div className="mt-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2 text-xs text-zinc-700">
                <p className="truncate">{shareUrl}</p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={() => void shareToApps()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)]"
                  >
                    <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Share to Apps
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
                >
                  <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Copy Link
                </button>

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
                  >
                    <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    {isMobile ? "WhatsApp" : "WhatsApp Web"}
                  </a>
                )}
              </div>
            </>
          )}

          <div className="mt-6 rounded-xl border border-zinc-100 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Participants
            </p>
            {collabLoading && (
              <p className="mt-2 text-sm text-zinc-500">Loading…</p>
            )}
            {collabError && (
              <p className="mt-2 text-sm text-red-600">{collabError}</p>
            )}
            {!collabLoading && !collabError && (
              <ul className="mt-3 divide-y divide-zinc-100">
                {collaborators.length === 0 ? (
                  <li className="py-3 text-sm text-zinc-500">No collaborators yet.</li>
                ) : (
                  collaborators.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {c.name ?? c.email ?? "Collaborator"}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-zinc-200/90 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                          {c.role === "EDITOR" ? "Editor" : "Viewer"}
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => void remove(c.id)}
                            disabled={inviteSaving}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-60"
                            aria-label="Remove collaborator"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                          </button>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}

            {isOwner && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Invite by email
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="min-h-11 flex-1 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:shadow-[0_0_0_3px_var(--primary-muted)]"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="min-h-11 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-semibold text-zinc-800"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void invite()}
                  disabled={inviteSaving || !inviteEmail.trim()}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(15,92,86,0.55)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Invite
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

