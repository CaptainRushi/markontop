"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Crown, Loader2, MailCheck, TrendingUp } from "lucide-react";
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

  // Load own listings + compute exact deterministic ranks per scope.
  const loadMine = useCallback(async (emailLower: string) => {
    setLoadingList(true);
    const supabase = getSupabaseBrowserClient();
    const { data: mine } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_email", emailLower)
      .order("current_bid", { ascending: false });

    if (!mine) {
      setLoadingList(false);
      return;
    }

    const scoped: Record<string, Array<Pick<Listing, "id" | "current_bid" | "created_at">>> = {};
    const categoryIds = [...new Set(mine.map((m) => m.category_id).filter(Boolean))] as string[];

    await Promise.all(
      categoryIds.map(async (cid) => {
        const { data: board } = await supabase
          .from("listings")
          .select("id, current_bid, created_at")
          .eq("category_id", cid)
          .eq("is_active", true);
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
          gapToNext:
            board
              .filter((b) => Number(b.current_bid) > Number(m.current_bid))
              .sort((a, b) => Number(a.current_bid) - Number(b.current_bid))[0] !== undefined
              ? Number(
                  board
                    .filter((b) => Number(b.current_bid) > Number(m.current_bid))
                    .sort((a, b) => Number(a.current_bid) - Number(b.current_bid))[0].current_bid
                ) - Number(m.current_bid)
              : null,
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
      <div className="flex justify-center py-20 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="panel mx-auto max-w-md p-6">
        {otpSent ? (
          <div className="py-8 text-center">
            <MailCheck className="mx-auto mb-3 h-8 w-8 text-[var(--gold)]" />
            <h2 className="font-bold">Check your inbox</h2>
            <p className="mt-2 text-sm text-neutral-400">
              We sent a sign-in link to <strong>{email}</strong>. Click it to view your ranks.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold">Sign in to see your rank</h2>
            <p className="mt-1 text-sm text-neutral-400">
              We&apos;ll email you a one-time magic link. No passwords.
            </p>
            <form onSubmit={(e) => void sendMagicLink(e)} className="mt-4 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email address"
                className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--gold)] py-2.5 text-sm font-bold text-black hover:brightness-110"
              >
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            Signed in as <strong className="text-white">{user.email}</strong>
          </p>
          <button
            onClick={() => void getSupabaseBrowserClient().auth.signOut()}
            className="text-xs text-neutral-500 underline hover:text-white"
          >
            Sign out
          </button>
        </div>

        {loadingList ? (
          <div className="flex justify-center py-16 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="panel p-10 text-center text-sm text-neutral-400">
            No placements found for this email yet.{" "}
            <a href="/submit" className="gold-text underline">
              Place your first listing →
            </a>
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.banner_url} alt="" className="h-16 w-32 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 font-bold">
                  {r.title}
                  {r.rank === 1 && <Crown className="h-4 w-4 text-[var(--gold)]" />}
                </h3>
                <p className="text-xs text-neutral-500">
                  {categoryById(r.category_id)?.name} · since{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-mono font-bold gold-text">${Number(r.current_bid).toFixed(2)}</span>
                  {r.rank !== null && (
                    <span className="ml-3 text-neutral-400">
                      Rank #{r.rank} of {r.scopeSize}
                      {r.rank > 3 && r.gapToNext !== null && (
                        <> · ${(r.gapToNext + 0.01).toFixed(2)} more to climb</>
                      )}
                    </span>
                  )}
                  {!r.is_active && <span className="ml-2 text-red-400">(inactive)</span>}
                </p>
              </div>
              {r.is_active && (
                <button
                  onClick={() => setModalListing(r)}
                  className="flex items-center justify-center gap-2 self-stretch rounded-lg border border-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black sm:self-auto"
                >
                  <TrendingUp className="h-4 w-4" /> Raise bid
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {modalListing && <BidUpModal listing={modalListing} onClose={() => setModalListing(null)} />}
    </>
  );
}
