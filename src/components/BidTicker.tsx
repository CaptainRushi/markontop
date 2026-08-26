"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { categoryById } from "@/lib/categories";

interface TickerItem {
  id: string;
  amount_cents: number;
  listing_id: string;
  created_at: string;
  listings?: { target_url: string; category_id: string | null; title: string } | null;
}

export default function BidTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const supabase = getSupabaseBrowserClient();
    const fetchTicker = () =>
      supabase
        .from("bid_events")
        .select("id, amount_cents, listing_id, created_at, listings!inner(target_url, category_id, title)")
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          if (!error && data) setItems(data as unknown as TickerItem[]);
          // Fallback to listings if bid_events empty (pre-migration)
          if ((!data || data.length === 0) && !error) {
            supabase
              .from("listings")
              .select("id, title, target_url, current_bid, category_id, updated_at")
              .eq("is_active", true)
              .order("updated_at", { ascending: false })
              .limit(10)
              .then(({ data: fallback }) => {
                if (fallback && fallback.length > 0) {
                  setItems(
                    fallback.map((f: { id: string; current_bid: number; target_url: string; category_id: string | null; title: string; updated_at: string }) => ({
                      id: f.id,
                      amount_cents: Math.round(Number(f.current_bid) * 100),
                      listing_id: f.id,
                      created_at: f.updated_at,
                      listings: { target_url: f.target_url, category_id: f.category_id, title: f.title },
                    }))
                  );
                }
              });
          }
        });
    void fetchTicker();
    const ch = supabase.channel("ticker").on("postgres_changes", { event: "*", schema: "public", table: "bid_events" }, () => void fetchTicker()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  if (items.length === 0) return null;

  if (reduced) {
    return (
      <div className="border-y border-white/[0.06] bg-track px-4 py-3 sm:px-6">
        <p className="font-data text-[10px] font-medium uppercase tracking-[0.12em] text-paper/25">Recent activity</p>
        <ul className="mt-2 space-y-1">
          {items.slice(0, 5).map((it) => (
            <li key={it.id} className="font-data text-xs tracking-wide text-paper/40">
              {it.listings?.target_url ?? it.listing_id} — <span className="font-bold text-paper">${(it.amount_cents / 100).toFixed(2)}</span>
              {it.listings?.category_id && <span className="text-paper/25"> in {categoryById(it.listings.category_id)?.name}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const loop = [...items, ...items];
  return (
    <div
      className="relative overflow-hidden border-y border-white/[0.06] bg-track py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      tabIndex={0}
      role="region"
      aria-live="polite"
      aria-label="Recent bids"
    >
      <div className="flex w-max gap-8 motion-safe:animate-[ticker_30s_linear_infinite]" style={{ animationPlayState: paused ? "paused" : "running" }}>
        {loop.map((it, i) => (
          <span key={`${it.id}-${i}`} className="flex shrink-0 items-center gap-2 font-data text-[11px] tracking-wide text-paper/35 sm:text-xs">
            <span className="text-paper/60">{categoryById(it.listings?.category_id)?.name ?? "Board"} · {it.listings?.title ?? it.listing_id}</span>
            <span className="text-white/15">—</span>
            <span className="font-bold text-signal">${(it.amount_cents / 100).toFixed(2)}</span>
            <span className="mx-1 text-white/8">·</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
