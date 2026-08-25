"use client";

import type { Listing } from "@/lib/types";

export default function PodiumFallback({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));
  const order: Array<{ rank: number; h: string }> = [
    { rank: 2, h: "h-[148px] sm:h-[176px]" },
    { rank: 1, h: "h-[196px] sm:h-[236px]" },
    { rank: 3, h: "h-[118px] sm:h-[142px]" },
  ];

  const medal = (r: number) => (r === 1 ? "from-[#FFD23F] to-[#C6A15B]" : r === 2 ? "from-[#E8ECF2] to-[#9AA3B2]" : "from-[#E8A85C] to-[#8B4D1F]");
  const tint = (r: number) => (r === 1 ? "text-gold" : r === 2 ? "text-silver" : "text-bronze");

  return (
    <div className="relative overflow-hidden border border-white/[0.07] bg-track" role="img" aria-label="Top 3 placements">
      {/* subtle grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      {/* top hairline gold */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="relative flex items-end justify-center gap-3 px-4 py-8 sm:gap-4 sm:px-6 sm:py-9">
        {order.map(({ rank, h }) => {
          const l = byRank.get(rank);
          const isFirst = rank === 1;
          return (
            <div key={rank} className="flex w-[30%] max-w-[240px] flex-col items-center">
              {/* Rank badge */}
              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b ${medal(rank)} text-[11px] font-black text-track shadow-[0_2px_10px_rgba(0,0,0,0.4)] ${isFirst ? "ring-2 ring-gold/30" : ""}`}>
                {rank}
              </div>
              {/* Plinth */}
              <div
                className={`relative flex w-full ${h} flex-col overflow-hidden border bg-[#0f1216] ${isFirst ? "border-gold/30 shadow-[0_12px_32px_rgba(255,199,44,0.12)]" : "border-white/[0.06]"} `}
                style={{ borderRadius: 6 }}
              >
                {l ? (
                  <>
                    {/* image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.banner_url} alt={l.title} className="h-full w-full object-cover" loading="eager" />
                    {/* bottom fade for text legibility */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <p className="truncate text-xs font-bold leading-tight text-white drop-shadow">{l.title}</p>
                      <p className="truncate font-data text-[10px] tracking-wide text-white/60">{l.target_url}</p>
                    </div>
                    {/* top medal strip */}
                    <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${medal(rank)}`} />
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
                    <span className={`font-display text-3xl font-black ${tint(rank)} opacity-10`} style={{ fontStretch: "condensed" }}>{rank}</span>
                    <span className="font-data text-[10px] tracking-[0.14em] text-white/25">EMPTY</span>
                    <span className="max-w-[14ch] text-[11px] leading-tight text-white/30">No bid yet — be first</span>
                  </div>
                )}
              </div>
              {/* Number chip below riser */}
              <div className={`mt-2 flex h-6 w-full items-center justify-center text-xs font-black tracking-wide ${isFirst ? "bg-gold text-track" : rank === 2 ? "bg-silver text-track" : "bg-bronze text-white"}`} style={{ borderRadius: 4 }}>
                #{rank}
              </div>
            </div>
          );
        })}
      </div>
      {/* bottom reflection hint */}
      <div className="pointer-events-none h-6 bg-gradient-to-b from-white/[0.02] to-transparent" />
    </div>
  );
}
