"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { computeRanks } from "@/lib/ranking";
import { categoryById } from "@/lib/categories";
import type { Listing } from "@/lib/types";
import Podium from "@/components/podium/Podium";
import LeaderboardList from "@/components/LeaderboardList";

const PAGE_SIZE = 25;

/**
 * Live board: deterministic ranking (bid DESC, created_at ASC), 3D top-3
 * podium, paginated table for ranks 4+. Refetches on any Supabase Realtime
 * change to `listings` so displacements animate immediately.
 */
export default function RealtimeBoard({ categoryId }: { categoryId?: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const scopeLabel = categoryId ? categoryById(categoryId)?.name ?? "Category" : "All Categories";

  const fetchPage = useCallback(
    async (p: number) => {
      const supabase = getSupabaseBrowserClient();
      let q = supabase
        .from("listings")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("current_bid", { ascending: false })
        .order("created_at", { ascending: true });
      if (categoryId) q = q.eq("category_id", categoryId);

      const from = (p - 1) * PAGE_SIZE;
      const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (!error && data) {
        setListings(data as Listing[]);
        setTotal(count ?? data.length);
      }
      setLoading(false);
    },
    [categoryId]
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    void fetchPage(1);
  }, [fetchPage]);

  // Realtime: any INSERT/UPDATE/DELETE on listings refreshes the visible page.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = `board-${categoryId ?? "global"}`;
    const handler = (
      _payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ) => {
      void fetchPage(1);
      setPage(1);
    };
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        handler
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [categoryId, fetchPage]);

  const top3 = useMemo(() => computeRanks(listings).slice(0, 3), [listings]);
  const rest = useMemo(() => computeRanks(listings).slice(3), [listings]);

  const offsetOfFirstOnPage = (page - 1) * PAGE_SIZE;

  return (
    <section aria-label={`${scopeLabel} leaderboard`}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-bold">
          Top 3 — <span className="gold-text">{scopeLabel}</span>
        </h2>
        <span className="text-xs text-neutral-500">Live · updates in realtime</span>
      </div>

      <Podium top3={top3} />

      <h3 className="mt-10 mb-3 text-lg font-bold">The Board</h3>
      <LeaderboardList
        listings={rest}
        loading={loading}
        rankOffset={offsetOfFirstOnPage + 3}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(p) => {
          setPage(p);
          void fetchPage(p);
        }}
      />
    </section>
  );
}
