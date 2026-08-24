"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, X } from "lucide-react";
import type { Listing } from "@/lib/types";

interface Props {
  listing: Listing;
  onClose: () => void;
}

/** 1-click bid-up modal — re-uses checkout; server charges only the difference. */
export default function BidUpModal({ listing, onClose }: Props) {
  const router = useRouter();
  const [bidTarget, setBidTarget] = useState((Number(listing.current_bid) + 1).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const min = Number(listing.current_bid) + 0.01;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Raise your placement"
      onClick={onClose}
    >
      <div className="panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <TrendingUp className="h-4 w-4 text-[var(--gold)]" /> Raise placement
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-1 text-xs text-neutral-400">{listing.title}</p>
        <p className="mb-4 text-xs text-neutral-500">
          Current: <strong className="gold-text">${Number(listing.current_bid).toFixed(2)}</strong> · you pay the difference only
        </p>

        <label htmlFor="new-total" className="mb-1 block text-sm">
          New total ($)
        </label>
        <input
          id="new-total"
          type="number"
          step="0.01"
          min={min}
          value={bidTarget}
          onChange={(e) => setBidTarget(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
        <p className="mt-1 text-xs text-neutral-500">
          You will be charged: <strong className="gold-text">${delta.toFixed(2)}</strong>
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <button
          onClick={() => void go()}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] py-2.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Pay ${delta.toFixed(2)} & update placement
        </button>
      </div>
    </div>
  );
}
