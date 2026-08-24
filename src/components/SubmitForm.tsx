"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageUp, Loader2, UploadCloud } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CATEGORIES, ENTRY_FLOOR, TAKEOVER_INCREMENT } from "@/lib/categories";
import { isValidNormalizedUrl, normalizeUrl } from "@/lib/url";
import { minimumBidTarget } from "@/lib/ranking";

interface ExistingListing {
  owner_email: string;
  current_bid: number;
  title?: string;
}

const MAX_BANNER_BYTES = 3 * 1024 * 1024;

export default function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [email, setEmail] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [existing, setExisting] = useState<ExistingListing | null>(null);
  const [bidTarget, setBidTarget] = useState("1.00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeUrl(targetUrl);
  const urlValid = isValidNormalizedUrl(normalized);
  const minBid = minimumBidTarget(existing, email || undefined);
  const isUpgrade = !!existing && !!email && existing.owner_email.toLowerCase() === email.toLowerCase();

  const previewLine = (() => {
    const n = parseFloat(bidTarget);
    if (!n || Number.isNaN(n)) return null;
    if (isUpgrade) {
      const diff = Math.max(0, n - Number(existing!.current_bid));
      return `Raise to $${n.toFixed(2)} — pay $${diff.toFixed(2)} difference`;
    }
    if (existing) return `Takes slot at $${n.toFixed(2)} — pay full amount`;
    return `Lands on the board at $${n.toFixed(2)}`;
  })();

  async function checkUrl(url: string) {
    const n = normalizeUrl(url);
    if (!isValidNormalizedUrl(n)) return;
    setCheckingUrl(true);
    setExisting(null);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("listings").select("owner_email, current_bid, title").eq("target_url", n).maybeSingle();
    if (data) {
      setExisting(data as ExistingListing);
      setBidTarget((Number(data.current_bid) + TAKEOVER_INCREMENT).toFixed(2));
    }
    setCheckingUrl(false);
  }

  async function handleBanner(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return void setError("Banner must be an image (PNG/JPG/WebP).");
    if (file.size > MAX_BANNER_BYTES) return void setError("Banner must be under 3 MB.");
    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      setBannerUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return void setError("Title is required.");
    if (!urlValid) return void setError("Enter a valid site URL.");
    if (!bannerUrl) return void setError("Upload a banner first.");
    if (!CATEGORIES.some((c) => c.id === categoryId)) return void setError("Choose a category.");
    const n = parseFloat(bidTarget);
    if (!isUpgrade && existing === null && n < ENTRY_FLOOR) return void setError("Minimum entry is $1.00.");
    if (n < minBid - 0.001)
      return void setError(
        isUpgrade ? `Enter more than your current $${existing!.current_bid.toFixed(2)}.` : `Minimum for this slot is $${minBid.toFixed(2)}.`
      );
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          target_url: normalized,
          banner_url: bannerUrl,
          description,
          category_id: categoryId,
          owner_email: email,
          bid_target: n,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed.");
      router.push(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[560px] bg-paper px-6 py-6 text-ink sm:px-8 sm:py-7">
      {canceled && (
        <p className="mb-5 border-l-2 border-auction-red bg-auction-red/10 px-3 py-2 text-xs leading-relaxed text-auction-red">
          Payment didn&apos;t go through. Your rank hasn&apos;t changed. Try again or use a different card.
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="sf-title" className="mb-1 block text-xs font-medium tracking-wide text-ink/60">
            Listing title
          </label>
          <input
            id="sf-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="Acme Analytics"
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="sf-url" className="mb-1 block text-xs font-medium tracking-wide text-ink/60">
            Target URL
          </label>
          <input
            id="sf-url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            onBlur={(e) => void checkUrl(e.target.value)}
            required
            placeholder="https://example.com"
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold focus:outline-none"
          />
          {checkingUrl && (
            <p className="mt-1 flex items-center gap-1 font-data text-xs text-ink/40">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking board…
            </p>
          )}
          {existing && (
            <p className="mt-2 border-l-2 border-gold bg-gold/10 px-3 py-2 text-xs leading-relaxed text-ink/70">
              {isUpgrade ? (
                <>
                  Your listing at <span className="font-data font-bold">${Number(existing.current_bid).toFixed(2)}</span> — you only pay the difference.
                </>
              ) : (
                <>
                  Taken at <span className="font-data font-bold">${Number(existing.current_bid).toFixed(2)}</span> — minimum to claim it is{" "}
                  <span className="font-data font-bold">${minBid.toFixed(2)}</span>.
                </>
              )}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sf-cat" className="mb-1 block text-xs font-medium tracking-wide text-ink/60">
            Category — fixed after submission
          </label>
          <select
            id="sf-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
          >
            <option value="">Select…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sf-desc" className="mb-1 block text-xs font-medium tracking-wide text-ink/60">
            Description <span className="font-normal text-ink/30">(optional)</span>
          </label>
          <textarea
            id="sf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={280}
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium tracking-wide text-ink/60">Banner — preview at podium ratio</span>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-ink/20 bg-white px-4 py-6 text-center hover:border-gold/60">
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
                <span className="text-xs text-ink/40">Uploading…</span>
              </>
            ) : bannerUrl ? (
              <>
                <span className="font-data text-xs font-bold text-ledger">Banner ready ✓</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerUrl} alt="Preview" className="mt-1 max-h-20 w-auto object-cover" />
              </>
            ) : (
              <>
                <UploadCloud className="h-5 w-5 text-ink/30" />
                <span className="text-xs text-ink/40">Drop image or click — max 3 MB</span>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleBanner(f);
              }}
            />
          </label>
        </div>

        <div>
          <label htmlFor="sf-email" className="mb-1 block text-xs font-medium tracking-wide text-ink/60">
            Email — for receipts &amp; My Rank
          </label>
          <input
            id="sf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="sf-bid" className="mb-1 block text-xs font-medium tracking-wide text-ink/60">
            Your bid
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-sm text-ink/30">$</span>
            <input
              id="sf-bid"
              type="number"
              step="0.01"
              min={minBid}
              value={bidTarget}
              onChange={(e) => setBidTarget(e.target.value)}
              required
              className="w-full border border-ink/15 bg-white py-2 pl-7 pr-3 font-data text-base font-bold tabular-nums text-ink focus:border-gold focus:outline-none"
            />
          </div>
          {previewLine && <p className="mt-1.5 font-data text-xs tabular-nums text-ink/50">{previewLine}</p>}
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-auction-red bg-auction-red/10 px-3 py-2 text-xs leading-relaxed text-auction-red">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || uploading}
        className="mt-6 flex w-full items-center justify-center gap-2 bg-ink px-4 py-3 text-sm font-bold tracking-wide text-paper transition-colors hover:bg-ink-soft disabled:opacity-40"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…
          </>
        ) : (
          "Continue to payment"
        )}
      </button>

      <p className="mt-3 text-center text-[10px] leading-relaxed tracking-wide text-ink/30">No refunds. Placement held until outbid.</p>
    </form>
  );
}
