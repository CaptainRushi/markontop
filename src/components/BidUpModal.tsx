"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import type { Listing } from "@/lib/types";
import { previewRank } from "@/lib/ranking";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Props {
  listing: Listing;
  onClose: () => void;
}

export default function BidUpModal({ listing, onClose }: Props) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [bidTarget, setBidTarget] = useState((Number(listing.current_bid) + 1).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => overlayRef.current?.querySelector<HTMLElement>("input")?.focus(), 30);
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; clearTimeout(t); };
  }, [onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const root = overlayRef.current; if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  // ponytail: full category board — small boards in v1
  const [board, setBoard] = useState<Array<{ id: string; current_bid: number; created_at: string }>>([]);

  useEffect(() => {
    if (!listing.category_id) return;
    void getSupabaseBrowserClient()
      .from("listings")
      .select("id, current_bid, created_at")
      .eq("category_id", listing.category_id)
      .eq("is_active", true)
      .then(({ data }) => setBoard((data ?? []) as typeof board));
  }, [listing.category_id]);

  const bidNum = parseFloat(bidTarget || "0");
  const delta = Math.max(0, bidNum - Number(listing.current_bid));

  async function go() {
    setError(null);
    const target = bidNum;
    if (!(target > Number(listing.current_bid))) {
      return void setError(`Enter a total above $${Number(listing.current_bid).toFixed(2)}.`);
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: listing.title,
          target_url: listing.target_url,
          banner_url: listing.banner_url,
          description: listing.description ?? "",
          category_id: listing.category_id,
          owner_email: listing.owner_email,
          bid_target: target,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed.");
      router.push(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
      setBusy(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-track/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Raise your placement"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      onKeyDown={onKeyDown}
    >
      <div className="my-auto w-full max-w-sm bg-paper p-6 text-track shadow-[0_24px_64px_rgba(0,0,0,0.45)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-black tracking-tight text-track">Raise your bid</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-track/40 hover:text-track">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-track/60">
          {listing.title}
          <br />
          Current — <span className="font-data font-bold text-track">${Number(listing.current_bid).toFixed(2)}</span> · you pay the difference only
        </p>

        <label htmlFor="new-total" className="mt-4 mb-1 block text-xs font-medium tracking-wide text-track/60">
          Your bid
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-sm text-track/30">$</span>
          <input
            id="new-total"
            type="number"
            step="0.01"
            min={Number(listing.current_bid) + 0.01}
            value={bidTarget}
            onChange={(e) => setBidTarget(e.target.value)}
            className="w-full border border-track/15 bg-white py-2 pl-7 pr-3 font-data text-base font-bold tabular-nums text-track focus:border-gold focus:outline-none"
          />
        </div>
        <p className="mt-1.5 font-data text-xs tabular-nums text-track/40">
          {listing.category_id && bidNum >= Number(listing.current_bid) + 0.01 ? (
            <>
              Takes #{previewRank(bidNum, board, listing.id)} at ${bidNum.toFixed(2)} — you pay{" "}
              <span className="font-bold text-track">${delta.toFixed(2)}</span>
            </>
          ) : (
            <>
              You will be charged <span className="font-bold text-track">${delta.toFixed(2)}</span>
            </>
          )}
        </p>

        {error && (
          <p role="alert" className="mt-3 border-l-2 border-auction-red bg-auction-red/10 px-3 py-2 text-xs leading-relaxed text-auction-red">
            {error}
          </p>
        )}

        <button
          onClick={() => void go()}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 bg-track px-4 py-3 text-sm font-bold tracking-wide text-paper hover:bg-track-soft disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Pay ${delta.toFixed(2)} & update
        </button>
      </div>
    </div>
  );
}
