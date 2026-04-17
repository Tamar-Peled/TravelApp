"use client";

import { useEffect } from "react";

export function Toast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[60] flex justify-center px-4 lg:bottom-6">
      <div className="pointer-events-auto rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-zinc-800 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.35)] backdrop-blur">
        {message}
      </div>
    </div>
  );
}

