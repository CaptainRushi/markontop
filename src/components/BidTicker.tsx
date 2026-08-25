"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { categoryById } from "@/lib/categories";

interface TickerItem {
  id: string;
  title: string;
  target_url: string;
  current_bid: number;
  category_id: string | null;
  updated_at: string;
}

export default function BidTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const supabase = getSupabaseBrowserClient();
    const fetch = () =>
      supabase
        .from("listings")
        .select("id,title,target_url,current_bid,category_id,updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setItems(data as TickerItem[]);
        });
    void fetch();
    const channel = supabase
      .channel("ticker")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => void fetch())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  // Reduced-motion: static vertical list
  if (reduced) {
    return (
      <div className="border-y border-white/[0.06] bg-track px-4 py-3 sm:px-6">
        <p className="font-data text-[10px] font-medium uppercase tracking-[0.12em] text-paper/25">Recent activity</p>
        <ul className="mt-2 space-y-1">
          {items.slice(0, 5).map((it) => (
            <li key={it.id} className="font-data text-xs tracking-wide text-paper/40">
              {it.target_url} — <span className="font-bold text-paper">${Number(it.current_bid).toFixed(2)}</span>
              {it.category_id && <span className="text-paper/25"> in {categoryById(it.category_id)?.name}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const loop = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden border-y border-white/[0.06] bg-track py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="marquee"
      aria-label="Recent bids"
    >
      <div
        className="flex w-max gap-8 motion-safe:animate-[ticker_30s_linear_infinite]"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {loop.map((it, i) => (
          <span key={`${it.id}-${i}`} className="flex shrink-0 items-center gap-2 font-data text-[11px] tracking-wide text-paper/35 sm:text-xs">
            <span className="text-paper/60">{it.target_url}</span>
            <span className="text-white/15">—</span>
            <span className="font-bold text-signal">${Number(it.current_bid).toFixed(2)}</span>
            {it.category_id && <span className="hidden text-paper/20 sm:inline">in {categoryById(it.category_id)?.name}</span>}
            <span className="mx-1 text-white/8">·</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
