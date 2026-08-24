"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
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

/** Clean, fast 2D paginated list for ranks 4+. */
export default function LeaderboardList({
  listings,
  loading,
  rankOffset,
  page,
  pageSize,
  total,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="panel overflow-hidden">
      {loading ? (
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded bg-neutral-800" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-500">
          No placements here yet — the board is wide open.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {listings.map((l, i) => (
            <li key={l.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <span className="w-9 shrink-0 text-center font-mono text-sm text-neutral-500">
                #{rankOffset + i}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={l.banner_url}
                alt=""
                aria-hidden
                className="h-10 w-20 shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={`https://${l.target_url}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored nofollow"
                  className="group flex items-center gap-1 truncate text-sm font-semibold hover:text-[var(--gold)]"
                >
                  {l.title}
                  <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                </a>
                <p className="truncate text-xs text-neutral-500">{l.target_url}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-bold gold-text">
                ${Number(l.current_bid).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center gap-1 rounded px-2 py-1 text-neutral-400 enabled:hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-xs text-neutral-500">
            Page {page} of {totalPages} · {total} placements
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 rounded px-2 py-1 text-neutral-400 enabled:hover:text-white disabled:opacity-30"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
