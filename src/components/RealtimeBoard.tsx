"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { computeRanks } from "@/lib/ranking";
import { categoryById } from "@/lib/categories";
import type { Listing } from "@/lib/types";
import Podium from "@/components/podium/Podium";
import LeaderboardList from "@/components/LeaderboardList";
import EmptyStage from "@/components/EmptyStage";

const PAGE_SIZE = 25;

export default function RealtimeBoard({ categoryId }: { categoryId?: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const categoryName = categoryId ? categoryById(categoryId)?.name ?? "Category" : null;

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

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = `board-${categoryId ?? "global"}`;
    const handler = (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      void fetchPage(1);
      setPage(1);
    };
    const channel = supabase.channel(channelName).on("postgres_changes", { event: "*", schema: "public", table: "listings" }, handler).subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [categoryId, fetchPage]);

  const top3 = useMemo(() => computeRanks(listings).slice(0, 3), [listings]);
  const rest = useMemo(() => computeRanks(listings).slice(3), [listings]);
  const offsetOfFirstOnPage = (page - 1) * PAGE_SIZE;
  const isEmpty = !loading && listings.length === 0 && categoryId !== undefined;

  if (isEmpty) return <EmptyStage categoryName={categoryName!} />;

  return (
    <section aria-label={`${categoryName ?? "Global"} leaderboard`}>
      <Podium top3={top3} />

      <h2 className="mt-8 mb-3 font-data text-[11px] font-medium uppercase tracking-[0.14em] text-paper/25">The Board</h2>
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
