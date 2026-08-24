"use client";

import type { Listing } from "@/lib/types";

/**
 * Lightweight HTML/CSS fallback rendered when WebGL is unavailable
 * (or the 3D scene fails to load). Mirrors the podium layout.
 */
export default function PodiumFallback({ top3 }: { top3: Array<Listing & { rank: number }> }) {
  const byRank = new Map(top3.map((l) => [l.rank, l]));
  const heights: Record<number, string> = { 1: "h-44", 2: "h-28", 3: "h-20" };

  return (
    <div className="flex h-64 items-end justify-center gap-6 px-4" role="img" aria-label="Top 3 placements">
      {[2, 1, 3].map((rank) => {
        const l = byRank.get(rank);
        return (
          <div key={rank} className="flex w-36 flex-col items-center">
            <span className="mb-2 text-xs font-semibold text-neutral-400">#{rank}</span>
            <div
              className={`flex w-full ${heights[rank]} items-end justify-center overflow-hidden rounded-t-lg border border-[var(--border)] bg-[#1b1b29]`}
            >
              {l ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.banner_url} alt={l.title} className="max-h-full w-full object-cover" />
              ) : (
                <span className="pb-3 text-2xl font-bold text-[var(--gold)] opacity-40">{rank}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
