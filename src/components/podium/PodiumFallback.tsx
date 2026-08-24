"use client";

import type { Listing } from "@/lib/types";

export default function PodiumFallback({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));

  const medalBorder: Record<number, string> = {
    1: "border-gold",
    2: "border-silver",
    3: "border-bronze",
  };
  const medalText: Record<number, string> = {
    1: "text-gold",
    2: "text-silver",
    3: "text-bronze",
  };

  // Order visually as 2 — 1 — 3 but stacked handling for mobile
  const order: Array<{ rank: number; h: string }> = [
    { rank: 2, h: "h-[110px] sm:h-[148px]" },
    { rank: 1, h: "h-[148px] sm:h-[192px]" },
    { rank: 3, h: "h-[84px] sm:h-[108px]" },
  ];

  return (
    <div
      className="flex items-end justify-center gap-2 bg-ink px-3 py-6 sm:gap-3 sm:px-6 sm:py-8"
      role="img"
      aria-label="Top 3 placements"
    >
      {order.map(({ rank, h }) => {
        const l = byRank.get(rank);
        return (
          <div key={rank} className="flex w-[30%] max-w-[220px] flex-col items-center">
            {/* Rank numeral — Fraunces, medal color */}
            <span className={`font-display text-[11px] font-black tracking-widest ${medalText[rank]}`}>
              #{rank}
            </span>
            <div
              className={`mt-1.5 flex w-full ${h} flex-col overflow-hidden border-t-2 bg-[#1e1a15] ${medalBorder[rank]}`}
            >
              {l ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.banner_url} alt={l.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className={`font-display text-2xl font-black opacity-15 ${medalText[rank]}`}>{rank}</span>
                </div>
              )}
            </div>
            {l && (
              <span className="mt-1.5 max-w-full truncate text-center font-data text-[10px] leading-none tracking-wide text-paper/40">
                {l.target_url}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
