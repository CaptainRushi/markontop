"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Listing } from "@/lib/types";
import { categoryById } from "@/lib/categories";

interface TickerItem {
  id: string;
  title: string;
  target_url: string;
  current_bid: number;
  category_id: string | null;
  updated_at: string;
}

/**
 * BidTicker — scrolling mono line of recent Stripe-confirmed bids.
 * Pauses on hover/focus. Falls back to static list under reduced-motion.
 */
export default function BidTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("listings")
      .select("id,title,target_url,current_bid,category_id,updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setItems(data as TickerItem[]);
      });

    const channel = supabase
      .channel("ticker")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        supabase
          .from("listings")
          .select("id,title,target_url,current_bid,category_id,updated_at")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(10)
          .then(({ data }) => {
            if (data) setItems(data as TickerItem[]);
          });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  // Duplicate items for seamless loop
  const loop = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden border-y border-white/[0.06] bg-ink py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="marquee"
      aria-label="Recent bids"
    >
      <div
        className="flex w-max gap-8 motion-safe:animate-[ticker_32s_linear_infinite] motion-reduce:animate-none"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {loop.map((item, i) => {
          const cat = item.category_id ? categoryById(item.category_id)?.name : null;
          return (
            <span
              key={`${item.id}-${i}`}
              className="flex shrink-0 items-center gap-2 font-data text-[11px] tracking-wide text-paper/40 sm:text-xs"
            >
              <span className="text-paper/70">{item.target_url}</span>
              <span className="text-white/20">—</span>
              <span className="text-ledger">${Number(item.current_bid).toFixed(2)}</span>
              {cat && <span className="hidden text-paper/25 sm:inline">in {cat}</span>}
              <span className="mx-1 text-white/10">·</span>
            </span>
          );
        })}
      </div>

      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
