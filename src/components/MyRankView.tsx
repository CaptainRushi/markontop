"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getRank } from "@/lib/ranking";
import { categoryById } from "@/lib/categories";
import type { Listing } from "@/lib/types";
import BidUpModal from "@/components/BidUpModal";

interface RankedRow extends Listing {
  rank: number | null;
  gapToNext: number | null;
  scopeSize: number;
}

export default function MyRankView() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [rows, setRows] = useState<RankedRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [modalListing, setModalListing] = useState<Listing | null>(null);
  const [outbidNotice, setOutbidNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadMine = useCallback(async (emailLower: string) => {
    setLoadingList(true);
    const supabase = getSupabaseBrowserClient();
    const { data: mine } = await supabase.from("listings").select("*").eq("owner_email", emailLower).order("current_bid", { ascending: false });

    if (!mine) {
      setLoadingList(false);
      return;
    }

    const scoped: Record<string, Array<Pick<Listing, "id" | "current_bid" | "created_at">>> = {};
    const categoryIds = [...new Set(mine.map((m) => m.category_id).filter(Boolean))] as string[];

    await Promise.all(
      categoryIds.map(async (cid) => {
        const { data: board } = await supabase.from("listings").select("id, current_bid, created_at").eq("category_id", cid).eq("is_active", true);
        if (board) scoped[cid] = board;
      })
    );

    setRows(
      (mine as Listing[]).map((m) => {
        const board = m.category_id ? scoped[m.category_id] ?? [] : [];
        return {
          ...m,
          rank: m.is_active ? getRank(m, board) : null,
          scopeSize: board.length,
          gapToNext: (() => {
            const above = board
              .filter((b) => Number(b.current_bid) > Number(m.current_bid))
              .sort((a, b) => Number(a.current_bid) - Number(b.current_bid))[0];
            return above ? Number(above.current_bid) - Number(m.current_bid) : null;
          })(),
        };
      })
    );
    setLoadingList(false);
  }, []);

  useEffect(() => {
    if (user?.email) void loadMine(user.email.toLowerCase());
  }, [user, loadMine]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setOtpSent(true);
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-20 text-paper/20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[420px] bg-paper px-6 py-8 text-ink sm:px-8">
        {otpSent ? (
          <div className="py-6 text-center">
            <p className="font-display text-lg font-black text-ink">Check your inbox</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink/50">
              We sent a sign-in link to <span className="font-medium text-ink">{email}</span>.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-black tracking-tight text-ink">Sign in to see your rank</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink/50">We&apos;ll email you a one-time magic link. No passwords.</p>
            <form onSubmit={(e) => void sendMagicLink(e)} className="mt-5 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email address"
                className="w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold focus:outline-none"
              />
              <button type="submit" className="w-full bg-ink px-4 py-2.5 text-sm font-bold tracking-wide text-paper hover:bg-ink-soft">
                Email me a sign-in link
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <p className="font-data text-xs tracking-wide text-paper/30">
            Signed in as <span className="font-medium text-paper/60">{user.email}</span>
          </p>
          <button
            onClick={() => void getSupabaseBrowserClient().auth.signOut()}
            className="font-data text-xs tracking-wide text-paper/30 underline decoration-white/15 underline-offset-2 hover:text-paper/60"
          >
            Sign out
          </button>
        </div>

        {outbidNotice && (
          <div className="border-l-2 border-auction-red bg-auction-red/10 px-4 py-3">
            <p className="text-xs font-bold text-auction-red">You&apos;ve been outbid.</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{outbidNotice}</p>
          </div>
        )}

        {loadingList ? (
          <div className="flex justify-center py-16 text-paper/20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-white/[0.06] bg-ink px-6 py-10 text-center">
            <p className="font-data text-xs tracking-wide text-paper/30">No placements for this email yet.</p>
            <a href="/submit" className="mt-3 inline-block bg-gold px-5 py-2 text-xs font-bold tracking-wide text-ink hover:bg-[#d4b06e]">
              Take your spot
            </a>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] border border-white/[0.06]">
            {/* Ledger header */}
            <div className="flex items-center gap-4 bg-white/[0.02] px-4 py-2 sm:px-5">
              <span className="w-10 shrink-0 font-data text-[10px] font-medium uppercase tracking-[0.12em] text-paper/25">Rank</span>
              <span className="flex-1 font-data text-[10px] font-medium uppercase tracking-[0.12em] text-paper/25">Listing</span>
              <span className="w-20 shrink-0 text-right font-data text-[10px] font-medium uppercase tracking-[0.12em] text-paper/25">Bid</span>
              <span className="hidden w-28 shrink-0 sm:block" />
            </div>

            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4">
                <span className="w-10 shrink-0 font-data text-sm font-bold tabular-nums text-paper/60">
                  {r.rank !== null ? `#${r.rank}` : "—"}
                </span>

                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.banner_url} alt="" className="hidden h-8 w-14 shrink-0 object-cover sm:block" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-paper">{r.title}</p>
                    <p className="truncate font-data text-[11px] tracking-wide text-paper/30">
                      {categoryById(r.category_id)?.name ?? "—"} · {r.target_url}
                    </p>
                  </div>
                </div>

                <span className="w-20 shrink-0 text-right font-data text-sm font-bold tabular-nums text-paper">
                  ${Number(r.current_bid).toFixed(2)}
                </span>

                <div className="hidden w-28 shrink-0 justify-end sm:flex">
                  {r.is_active ? (
                    <button
                      onClick={() => setModalListing(r)}
                      className="border border-gold px-3 py-1.5 font-data text-xs font-bold tracking-wide text-gold transition-colors hover:bg-gold hover:text-ink"
                    >
                      Raise bid
                    </button>
                  ) : (
                    <span className="font-data text-xs text-auction-red">Inactive</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile raise buttons */}
        {rows.length > 0 && (
          <div className="flex flex-col gap-2 sm:hidden">
            {rows
              .filter((r) => r.is_active)
              .map((r) => (
                <button
                  key={`m-${r.id}`}
                  onClick={() => setModalListing(r)}
                  className="w-full border border-gold py-2.5 font-data text-xs font-bold tracking-wide text-gold"
                >
                  Raise — {r.title}
                </button>
              ))}
          </div>
        )}
      </div>

      {modalListing && <BidUpModal listing={modalListing} onClose={() => setModalListing(null)} />}
    </>
  );
}
