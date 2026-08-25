"use client";

import type { Listing } from "@/lib/types";

export default function PodiumFallback({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));

  const order: Array<{ rank: number; h: string; accent: string }> = [
    { rank: 2, h: "h-[112px] sm:h-[148px]", accent: "border-silver" },
    { rank: 1, h: "h-[152px] sm:h-[196px]", accent: "border-gold" },
    { rank: 3, h: "h-[86px] sm:h-[110px]", accent: "border-bronze" },
  ];

  return (
    <div className="flex items-end justify-center gap-2 bg-track px-3 py-6 sm:gap-3 sm:px-6 sm:py-7" role="img" aria-label="Top 3 placements">
      {order.map(({ rank, h, accent }) => {
        const l = byRank.get(rank);
        const isGold = rank === 1;
        return (
          <div key={rank} className="flex w-[30%] max-w-[220px] flex-col items-center">
            {/* Condensed number badge */}
            <span
              className={`font-display text-[10px] font-black tracking-[0.14em] ${rank === 1 ? "text-gold" : rank === 2 ? "text-silver" : "text-bronze"}`}
              style={{ fontStretch: "condensed" }}
            >
              #{rank}
            </span>
            <div className={`mt-1.5 flex w-full ${h} flex-col overflow-hidden border-t-[3px] bg-[#12151a] ${accent}`}>
              {l ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.banner_url} alt={l.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  <span className="font-display text-2xl font-black text-white/[0.06]" style={{ fontStretch: "condensed" }}>
                    {rank}
                  </span>
                  <span className="font-data text-[10px] tracking-wide text-white/10">EMPTY</span>
                </div>
              )}
            </div>
            {/* Riser number strip */}
            <div className={`flex h-6 w-full items-center justify-center ${isGold ? "bg-gold text-track" : rank === 2 ? "bg-silver text-track" : "bg-bronze text-white"}`}>
              <span className="font-display text-sm font-black" style={{ fontStretch: "condensed" }}>
                {rank}
              </span>
            </div>
            {l && <span className="mt-1.5 max-w-full truncate text-center font-data text-[10px] tracking-wide text-paper/30">{l.target_url}</span>}
          </div>
        );
      })}
    </div>
  );
}
