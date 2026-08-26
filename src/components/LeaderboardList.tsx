"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Flag } from "lucide-react";
import type { Listing } from "@/lib/types";

interface Props {
  listings: Array<Listing & { rank: number }>;
  loading: boolean;
  rankOffset: number;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function LeaderboardList({ listings, loading, rankOffset, page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="overflow-hidden border border-white/[0.06] bg-track">
      {loading ? (
        <div className="divide-y divide-white/[0.06]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
              <div className="h-4 w-8 animate-pulse bg-white/[0.04]" />
              <div className="h-10 w-20 animate-pulse bg-white/[0.04]" />
              <div className="h-3 w-1/3 animate-pulse bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <p className="px-6 py-10 text-center font-data text-xs tracking-wide text-paper/25">No placements here yet — the board is wide open.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {listings.map((l, i) => (
            <li key={l.id} className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-5 sm:py-3.5">
              <span className="w-8 shrink-0 text-right font-display text-[14px] font-black tabular-nums text-paper/30 sm:w-10 sm:text-[15px]" style={{ fontStretch: "condensed" }}>#{rankOffset + i}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.banner_url} alt="" aria-hidden className="h-9 w-[72px] shrink-0 object-cover sm:h-10 sm:w-[84px]" style={{ borderRadius: 4 }} />
              <div className="min-w-0 flex-1">
                <a
                  href={`https://${l.target_url}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored nofollow"
                  className="flex items-center gap-1 truncate text-[13px] font-medium text-paper transition-colors group-hover:text-gold sm:text-sm"
                >
                  <span className="truncate">{l.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                </a>
                <p className="truncate font-data text-[11px] tracking-wide text-paper/25">{l.target_url}</p>
              </div>
              <span className="shrink-0 font-data text-[14px] font-bold tabular-nums text-paper sm:text-[15px]">${Number(l.current_bid).toFixed(2)}</span>
              <ReportButton listingId={l.id} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 sm:px-5">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center gap-1 px-2 py-1 font-data text-xs tracking-wide text-paper/35 transition-colors enabled:hover:text-paper disabled:opacity-20"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="font-data text-[11px] tracking-wide text-paper/20">
            {page} / {totalPages} · {total} placements
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 px-2 py-1 font-data text-xs tracking-wide text-paper/35 transition-colors enabled:hover:text-paper disabled:opacity-20"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReportButton({ listingId }: { listingId: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function report() {
    if (done || busy) return;
    setBusy(true);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, reason: "user_report" }),
    });
    if (res.ok) setDone(true);
    setBusy(false);
  }
  return (
    <button
      onClick={() => void report()}
      disabled={done || busy}
      aria-label="Report listing"
      title={done ? "Reported" : "Report listing"}
      className={`hidden shrink-0 p-1.5 transition-colors sm:flex ${done ? "text-signal" : "text-paper/20 hover:text-flag"}`}
    >
      <Flag className="h-3.5 w-3.5" />
    </button>
  );
}
