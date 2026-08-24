"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageUp, Loader2, ShieldAlert, UploadCloud } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CATEGORIES, TAKEOVER_INCREMENT, ENTRY_FLOOR } from "@/lib/categories";
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
  const [bidTarget, setBidTarget] = useState<string>("1.00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeUrl(targetUrl);
  const urlValid = isValidNormalizedUrl(normalized);

  // Live minimum calculation — mirrors server pricing exactly.
  const minBid = minimumBidTarget(existing, email || undefined);
  const isUpgrade =
    !!existing && !!email && existing.owner_email.toLowerCase() === email.toLowerCase();

  async function checkUrl(url: string) {
    const n = normalizeUrl(url);
    if (!isValidNormalizedUrl(n)) return;
    setCheckingUrl(true);
    setExisting(null);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("listings")
      .select("owner_email, current_bid, title")
      .eq("target_url", n)
      .maybeSingle();
    if (data) {
      setExisting(data as ExistingListing);
      setBidTarget((Number(data.current_bid) + (TAKEOVER_INCREMENT + 0)).toFixed(2));
    }
    setCheckingUrl(false);
  }

  async function handleBanner(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Banner must be an image (PNG/JPG/WebP).");
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setError("Banner must be under 3 MB.");
      return;
    }
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
    if (!bannerUrl) return void setError("Upload a banner image first.");
    if (!CATEGORIES.some((c) => c.id === categoryId)) return void setError("Choose a category.");

    const bidNum = parseFloat(bidTarget);
    if (!isUpgrade && existing === null && bidNum < ENTRY_FLOOR)
      return void setError("Minimum entry is $1.00.");
    if (bidNum < minBid - 0.001)
      return void setError(
        isUpgrade
          ? `Enter more than your current $${existing!.current_bid.toFixed(2)} placement.`
          : `This slot requires at least $${minBid.toFixed(2)}.`
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
          bid_target: bidNum,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed.");
      router.push(json.url); // Stripe Checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel mx-auto max-w-2xl space-y-5 p-6">
      {canceled && (
        <p className="rounded-md border border-yellow-700/40 bg-yellow-900/20 px-3 py-2 text-sm text-yellow-300">
          Checkout canceled — your placement was not charged.
        </p>
      )}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Listing title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          placeholder="Acme Analytics"
          className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium">
          Target URL <span className="text-neutral-500">(one listing per URL)</span>
        </label>
        <input
          id="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          onBlur={(e) => void checkUrl(e.target.value)}
          required
          placeholder="https://example.com"
          className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
        {checkingUrl && (
          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking board…
          </p>
        )}
        {existing && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-2 text-xs text-yellow-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {isUpgrade ? (
              <span>
                This is your listing at <strong>${Number(existing.current_bid).toFixed(2)}</strong>.
                Enter a higher total to upgrade — you only pay the difference.
              </span>
            ) : (
              <span>
                Taken by <strong>{existing.title}</strong> at $
                {Number(existing.current_bid).toFixed(2)}. To claim it you must place at least{" "}
                <strong>${minBid.toFixed(2)}</strong> and pay the full amount.
              </span>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="desc" className="mb-1 block text-sm font-medium">
          Description <span className="text-neutral-500">(optional)</span>
        </label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={280}
          className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium">
          Category <span className="text-neutral-500">(fixed after submission)</span>
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
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
        <span className="mb-1 block text-sm font-medium">Banner (1200×600+ recommended)</span>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-700 bg-black/30 px-3 py-4 text-sm text-neutral-400 hover:border-[var(--gold)]">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : bannerUrl ? (
            <>
              <ImageUp className="h-4 w-4 text-emerald-400" /> Banner uploaded ✓
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" /> Choose image (max 3 MB)
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
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="Banner preview" className="mt-2 h-24 w-auto rounded object-cover" />
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Your email <span className="text-neutral-500">(for receipts + “My Rank” access)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
      </div>

      <div>
        <label htmlFor="bid" className="mb-1 block text-sm font-medium">
          Placement amount (total bid)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">$</span>
            <input
              id="bid"
              type="number"
              step="0.01"
              min={minBid}
              value={bidTarget}
              onChange={(e) => setBidTarget(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 py-2 pl-7 pr-3 text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setBidTarget((prev) =>
                (parseFloat(prev || String(minBid)) + TAKEOVER_INCREMENT).toFixed(2)
              )
            }
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-neutral-400 hover:text-white"
          >
            +$1
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Minimum for this slot: <strong className="gold-text">${minBid.toFixed(2)}</strong>
          {isUpgrade && existing && (
            <>
              {" "}
              · You will be charged the difference:{" "}
              <strong className="gold-text">
                ${(Math.max(0, parseFloat(bidTarget || "0") - Number(existing.current_bid)) || 0).toFixed(2)}
              </strong>
            </>
          )}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…
          </>
        ) : (
          "Continue to payment"
        )}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-neutral-500">
        By submitting you agree to our deterministic paid-placement terms: no refunds, placement
        held until outbid, content subject to removal per prohibited-use rules.
      </p>
    </form>
  );
}
