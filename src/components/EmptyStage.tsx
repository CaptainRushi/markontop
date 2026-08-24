"use client";

import Link from "next/link";

export default function EmptyStage({ categoryName }: { categoryName: string }) {
  return (
    <div className="border border-white/[0.06] bg-ink px-6 py-12 text-center sm:py-16">
      {/* Three unlit podium outlines */}
      <div className="mx-auto flex max-w-[420px] items-end justify-center gap-2 sm:gap-3" aria-hidden>
        {[
          { h: "h-[68px] sm:h-[84px]", label: "2" },
          { h: "h-[96px] sm:h-[116px]", label: "1" },
          { h: "h-[48px] sm:h-[60px]", label: "3" },
        ].map((b) => (
          <div
            key={b.label}
            className={`flex w-[30%] ${b.h} items-center justify-center border border-dashed border-white/[0.08] bg-white/[0.015]`}
          >
            <span className="font-display text-lg font-black text-white/[0.07]">{b.label}</span>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-sm font-display text-lg font-black leading-tight text-paper sm:text-xl">
        No bids yet in {categoryName}.
        <br />
        <span className="text-paper/40">Be the first.</span>
      </p>

      <Link
        href="/submit"
        className="mt-6 inline-block bg-gold px-6 py-2.5 text-[13px] font-bold tracking-wide text-ink transition-colors hover:bg-[#d4b06e]"
      >
        Take #1 — $1.00
      </Link>
    </div>
  );
}
