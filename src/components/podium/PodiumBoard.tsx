"use client";

import type { Listing } from "@/lib/types";

export default function PodiumBoard({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));
  const order: Array<{ rank: number; h: string }> = [
    { rank: 2, h: "h-[158px] sm:h-[192px]" },
    { rank: 1, h: "h-[212px] sm:h-[268px]" },
    { rank: 3, h: "h-[128px] sm:h-[156px]" },
  ];

  const medalGrad: Record<number, string> = {
    1: "from-[#FFD23F] via-[#FFC72C] to-[#B88A1A]",
    2: "from-[#EEF1F6] via-[#C7CDD6] to-[#8E98A8]",
    3: "from-[#E8A85C] via-[#CD7F32] to-[#7A3E12]",
  };
  const ring: Record<number, string> = {
    1: "ring-gold/25 shadow-[0_16px_40px_rgba(255,199,44,0.22)]",
    2: "ring-white/10",
    3: "ring-white/10",
  };

  return (
    <div className="relative overflow-hidden border border-white/[0.07] bg-track" role="img" aria-label="Top 3 placements">
      {/* grid + vignette depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="relative flex items-end justify-center gap-2.5 px-3 py-7 sm:gap-4 sm:px-6 sm:py-9">
        {order.map(({ rank, h }) => {
          const l = byRank.get(rank);
          const isFirst = rank === 1;
          return (
            <div
              key={rank}
              className={`flex w-[30%] max-w-[260px] flex-col items-center ${isFirst ? "z-10" : ""}`}
              style={{ transform: isFirst ? "translateY(-6px)" : undefined }}
            >
              {/* Floating rank pill */}
              <div
                className={`mb-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-b px-2.5 text-[11px] font-black tracking-wide text-track shadow-[0_6px_16px_rgba(0,0,0,0.35)] ring-1 ${medalGrad[rank]} ${ring[rank]}`}
              >
                #{rank}
              </div>

              {/* Plinth */}
              <div
                className={`relative flex w-full ${h} flex-col overflow-hidden bg-[#0f1216] ring-1 ${isFirst ? "ring-gold/30" : "ring-white/[0.06]"} ${isFirst ? "shadow-[0_18px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,199,44,0.12)]" : "shadow-[0_10px_24px_rgba(0,0,0,0.35)]"}`}
                style={{ borderRadius: 8 }}
              >
                {/* Top medal cap */}
                <div className={`h-[5px] w-full bg-gradient-to-r ${medalGrad[rank]}`} />

                {l ? (
                  <>
                    {/* Banner */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.banner_url} alt={l.title} className="h-full w-full object-cover" loading="eager" />
                    {/* Scrim + text */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pt-10" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="truncate text-[13px] font-bold leading-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">{l.title}</p>
                      <p className="truncate font-data text-[10px] tracking-wide text-white/65">{l.target_url}</p>
                      <p className="mt-1 font-data text-xs font-bold tabular-nums text-white">
                        ${Number(l.current_bid).toFixed(2)}
                      </p>
                    </div>
                    {/* subtle inner highlight */}
                    <div className="pointer-events-none absolute inset-0 rounded-[8px] ring-1 ring-white/[0.06]" />
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
                    <span className="font-display text-4xl font-black leading-none tracking-tighter text-white/[0.06]" style={{ fontStretch: "condensed" }}>
                      {rank}
                    </span>
                    <span className="mt-2 font-data text-[10px] font-medium tracking-[0.14em] text-white/20">EMPTY</span>
                    <span className="mt-1 max-w-[14ch] text-xs leading-tight text-white/30">No bid yet — be first</span>
                    <span className="mt-3 inline-flex rounded-full bg-white/[0.06] px-2.5 py-1 font-data text-[10px] font-bold tracking-wide text-white/50">
                      $1.00 to claim
                    </span>
                  </div>
                )}
              </div>

              {/* Base plaque with big number */}
              <div
                className={`mt-2 flex h-7 w-full items-center justify-center gap-1.5 text-xs font-black tracking-[0.08em] ${isFirst ? "bg-gold text-track" : rank === 2 ? "bg-silver text-track" : "bg-bronze text-white"}`}
                style={{ borderRadius: 6 }}
              >
                <span className="font-display text-sm" style={{ fontStretch: "condensed" }}>
                  {rank}
                </span>
                <span className="font-data text-[10px] opacity-70">PLACE</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* stage floor reflection hint */}
      <div className="pointer-events-none h-7 bg-gradient-to-b from-white/[0.03] via-white/[0.015] to-transparent" />
    </div>
  );
}
