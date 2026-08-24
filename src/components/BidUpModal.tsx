"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import type { Listing } from "@/lib/types";

interface Props {
  listing: Listing;
  onClose: () => void;
}

export default function BidUpModal({ listing, onClose }: Props) {
  const router = useRouter();
  const [bidTarget, setBidTarget] = useState((Number(listing.current_bid) + 1).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const delta = Math.max(0, parseFloat(bidTarget || "0") - Number(listing.current_bid));

  async function go() {
    setError(null);
    const target = parseFloat(bidTarget);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Raise your placement"
      onClick={onClose}
    >
      <div className="w-full max-w-sm bg-paper p-6 text-ink" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-black tracking-tight text-ink">Raise your bid</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-ink/60">
          {listing.title}
          <br />
          Current — <span className="font-data font-bold text-ink">${Number(listing.current_bid).toFixed(2)}</span> · you pay the difference only
        </p>

        <label htmlFor="new-total" className="mt-4 mb-1 block text-xs font-medium tracking-wide text-ink/60">
          Your bid
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-sm text-ink/30">$</span>
          <input
            id="new-total"
            type="number"
            step="0.01"
            min={Number(listing.current_bid) + 0.01}
            value={bidTarget}
            onChange={(e) => setBidTarget(e.target.value)}
            className="w-full border border-ink/15 bg-white py-2 pl-7 pr-3 font-data text-base font-bold tabular-nums text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <p className="mt-1.5 font-data text-xs tabular-nums text-ink/40">
          You will be charged <span className="font-bold text-ink">${delta.toFixed(2)}</span>
        </p>

        {error && (
          <p role="alert" className="mt-3 border-l-2 border-auction-red bg-auction-red/10 px-3 py-2 text-xs leading-relaxed text-auction-red">
            {error}
          </p>
        )}

        <button
          onClick={() => void go()}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 bg-ink px-4 py-3 text-sm font-bold tracking-wide text-paper hover:bg-ink-soft disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Pay ${delta.toFixed(2)} & update
        </button>
      </div>
    </div>
  );
}
