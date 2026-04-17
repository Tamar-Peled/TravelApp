"use client";

import { signIn } from "next-auth/react";
import { Compass } from "lucide-react";

export function MarketingLanding() {
  return (
    <div className="min-h-[100dvh] bg-[#FAF9F6]">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-20 pt-16 text-center sm:pt-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[var(--primary)] text-white shadow-[0_16px_48px_-20px_rgba(15,92,86,0.6)]">
          <Compass className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </div>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          TravelAI
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          From Inspiration to Itinerary in seconds.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg">
          Drop links, screenshots, or notes. Let AI organize your next adventure.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => void signIn("google")}
            className="touch-manipulation inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-gradient-to-b from-[#138a82] via-[var(--primary)] to-[#0a4540] px-8 py-3 text-[15px] font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_14px_36px_-18px_rgba(15,92,86,0.65),0_2px_6px_-2px_rgba(15,23,42,0.06)] transition-[transform,filter] duration-200 hover:brightness-[1.05] active:scale-[0.99]"
          >
            Sign in with Google
          </button>
        </div>

        <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: "Paste", desc: "Links and notes become structured items." },
            { title: "Upload", desc: "Screenshots → extracted places automatically." },
            { title: "Organize", desc: "Inbox to Trips, shared with collaborators." },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-zinc-100 bg-white/70 p-5 text-left shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] backdrop-blur"
            >
              <p className="text-sm font-semibold tracking-tight text-zinc-900">{c.title}</p>
              <p className="mt-1.5 text-sm text-zinc-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

