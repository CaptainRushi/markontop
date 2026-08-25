"use client";

import Link from "next/link";

export default function EmptyStage({ categoryName }: { categoryName: string }) {
  return (
    <div className="border border-white/[0.06] bg-track px-6 py-10 text-center sm:py-14">
      <div className="mx-auto flex max-w-[420px] items-end justify-center gap-2 sm:gap-3" aria-hidden>
        {[
          { h: "h-[66px] sm:h-[82px]" },
          { h: "h-[94px] sm:h-[114px]" },
          { h: "h-[46px] sm:h-[58px]" },
        ].map((b, i) => (
          <div key={i} className={`flex w-[30%] ${b.h} items-center justify-center border border-dashed border-white/[0.07] bg-white/[0.015]`}>
            <span className="font-display text-lg font-black text-white/[0.06]" style={{ fontStretch: "condensed" }}>
              {i === 0 ? 2 : i === 1 ? 1 : 3}
            </span>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-sm font-display text-lg font-black leading-tight text-paper sm:text-xl" style={{ fontStretch: "condensed" }}>
        No bids yet in {categoryName}.
        <br />
        <span className="text-paper/35">Be the first.</span>
      </p>
      <Link href="/submit" className="mt-6 inline-block bg-gold px-6 py-2.5 text-[12px] font-black tracking-[0.06em] text-track hover:bg-[#ffd24d]">
        TAKE #1 - $1.00
      </Link>
    </div>
  );
}
