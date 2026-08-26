"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CATEGORIES, ENTRY_FLOOR, TAKEOVER_INCREMENT } from "@/lib/categories";
import { isValidNormalizedUrl, normalizeUrl } from "@/lib/url";
import { minimumBidTarget, previewRank } from "@/lib/ranking";
import BidPaymentStep from "./BidPaymentStep";

const MAX_BANNER_BYTES = 3 * 1024 * 1024;
const stripePromise = typeof window !== "undefined" ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "") : null;

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export default function BidModal({ open, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [email, setEmail] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [existing, setExisting] = useState<{ owner_email: string; current_bid: number; title?: string } | null>(null);
  const [bidTarget, setBidTarget] = useState("1.00");
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [confirmed, setConfirmed] = useState<{ rank: number; category: string } | null>(null);
  const [board, setBoard] = useState<Array<{ id: string; current_bid: number; created_at: string }>>([]);

  useEffect(() => {
    if (!categoryId) return void setBoard([]);
    void getSupabaseBrowserClient()
      .from("listings")
      .select("id, current_bid, created_at")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .then(({ data }) => setBoard((data ?? []) as typeof board));
  }, [categoryId]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    // Focus first input
    const t = setTimeout(() => {
      const el = overlayRef.current?.querySelector<HTMLElement>("input, select, button");
      el?.focus();
    }, 30);
    return () => { window.removeEventListener("keydown", h); clearTimeout(t); };
  }, [open, onClose]);

  // Focus trap: cycle Tab within modal
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const root = overlayRef.current;
    if (!root) return;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  if (!open) return null;

  const normalized = normalizeUrl(targetUrl);
  const urlValid = isValidNormalizedUrl(normalized);
  const minBid = minimumBidTarget(existing, email || undefined);
  const isUpgrade = !!existing && !!email && existing.owner_email.toLowerCase() === email.toLowerCase();

  const canNextFrom1 = title.trim().length > 0 && urlValid && bannerUrl.length > 0 && CATEGORIES.some((c) => c.id === categoryId) && email.includes("@");
  const canNextFrom2 = (() => {
    const n = parseFloat(bidTarget);
    if (Number.isNaN(n)) return false;
    if (!isUpgrade && existing === null && n < ENTRY_FLOOR) return false;
    return n >= minBid - 0.001;
  })();

  const previewLine = (() => {
    const n = parseFloat(bidTarget);
    if (!n || Number.isNaN(n)) return null;
    const rank = previewRank(n, board);
    if (isUpgrade) {
      const diff = Math.max(0, n - Number(existing!.current_bid));
      return `Raise to $${n.toFixed(2)} — pay $${diff.toFixed(2)} difference · Lands at #${rank}`;
    }
    if (n < minBid - 0.001) return `Minimum for this slot is $${minBid.toFixed(2)}`;
    if (rank <= 3) return `Takes #${rank} at $${n.toFixed(2)}`;
    return `Lands at #${rank} for $${n.toFixed(2)}`;
  })();

  async function checkUrl(url: string) {
    const n = normalizeUrl(url);
    if (!isValidNormalizedUrl(n)) return;
    setCheckingUrl(true);
    setExisting(null);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("listings").select("owner_email, current_bid, title").eq("target_url", n).maybeSingle();
    if (data) {
      setExisting(data as typeof existing);
      setBidTarget((Number(data.current_bid) + TAKEOVER_INCREMENT).toFixed(2));
    }
    setCheckingUrl(false);
  }

  async function handleBanner(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return void setError("Banner must be an image.");
    if (file.size > MAX_BANNER_BYTES) return void setError("Banner must be under 3 MB.");
    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      setBannerUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setUploading(false); }
  }

  async function goToPayment() {
    setError(null);
    const n = parseFloat(bidTarget);
    if (!title.trim()) return void setError("Title is required.");
    if (!urlValid) return void setError("Enter a valid site URL.");
    if (!bannerUrl) return void setError("Upload a banner first.");
    if (!CATEGORIES.some((c) => c.id === categoryId)) return void setError("Choose a category.");
    if (!isUpgrade && existing === null && n < ENTRY_FLOOR) return void setError("Minimum entry is $1.00.");
    if (n < minBid - 0.001) return void setError(isUpgrade ? `Enter more than $${existing!.current_bid.toFixed(2)}.` : `Minimum is $${minBid.toFixed(2)}.`);
    setCreatingIntent(true);
    try {
      const res = await fetch("/api/bid/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, target_url: normalized, banner_url: bannerUrl, description, category_id: categoryId, owner_email: email, bid_target: n }),
      });
      const json = (await res.json()) as { clientSecret?: string; error?: string };
      if (!res.ok || !json.clientSecret) throw new Error(json.error ?? "Could not start payment.");
      setClientSecret(json.clientSecret);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
    } finally { setCreatingIntent(false); }
  }

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex overflow-y-auto bg-track/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="m-auto w-full max-w-sm bg-paper p-6 text-center text-track shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
          <p className="font-display text-lg font-black" style={{ fontStretch: "condensed" }}>Placed at #{confirmed.rank} in {confirmed.category}.</p>
          <div className="mt-4 flex gap-2">
            <a href="/" className="flex-1 bg-track px-4 py-2.5 text-center text-sm font-bold text-paper hover:bg-track/90">View leaderboard</a>
            <button onClick={onClose} className="flex-1 border border-track/15 px-4 py-2.5 text-sm font-bold text-track hover:bg-black/5">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex overflow-y-auto bg-track/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Place a bid"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      onKeyDown={onKeyDown}
    >
      <div className="m-auto flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-hidden bg-paper text-track shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-track/10 px-6 py-4">
          <h2 className="font-display text-lg font-black tracking-tight" style={{ fontStretch: "condensed" }}>Place your bid</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-track/40 hover:text-track"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex items-center gap-2 px-6 pt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step >= s ? "bg-track text-paper" : "border border-track/15 text-track/30"}`}>{s}</span>
              {s < 3 && <span className={`h-px w-6 ${step > s ? "bg-track" : "bg-track/10"}`} />}
            </div>
          ))}
          <span className="ml-2 font-data text-xs tracking-wide text-track/40">{step === 1 ? "Details" : step === 2 ? "Amount" : "Payment"}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div><label className="mb-1 block text-xs font-medium tracking-wide text-track/60">Listing title</label><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Acme Analytics" className="w-full border border-track/15 bg-white px-3 py-2 text-sm text-track placeholder:text-track/30 focus:border-gold focus:outline-none" /></div>
              <div><label className="mb-1 block text-xs font-medium tracking-wide text-track/60">Target URL</label><input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} onBlur={(e) => void checkUrl(e.target.value)} required placeholder="https://example.com" className="w-full border border-track/15 bg-white px-3 py-2 text-sm text-track placeholder:text-track/30 focus:border-gold focus:outline-none" />{checkingUrl && <p className="mt-1 flex items-center gap-1 font-data text-xs text-track/40"><Loader2 className="h-3 w-3 animate-spin" /> Checking board…</p>}{existing && <p className="mt-2 border-l-2 border-gold bg-gold/10 px-3 py-2 text-xs leading-relaxed text-track/70">{isUpgrade ? <>Your listing at <span className="font-data font-bold">${Number(existing.current_bid).toFixed(2)}</span> — you only pay the difference.</> : <>Taken at <span className="font-data font-bold">${Number(existing.current_bid).toFixed(2)}</span> — minimum is <span className="font-data font-bold">${minBid.toFixed(2)}</span>.</>}</p>}</div>
              <div><label className="mb-1 block text-xs font-medium tracking-wide text-track/60">Category — fixed after submission</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="w-full border border-track/15 bg-white px-3 py-2 text-sm text-track focus:border-gold focus:outline-none"><option value="">Select…</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><span className="mb-1 block text-xs font-medium tracking-wide text-track/60">Banner — podium aspect preview (600×300)</span><label className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-track/20 bg-white px-4 py-6 text-center hover:border-gold/60">{uploading ? <><Loader2 className="h-5 w-5 animate-spin text-track/40" /><span className="text-xs text-track/40">Uploading…</span></> : bannerUrl ? <><span className="font-data text-xs font-bold text-signal">Banner ready</span><div className="mt-1 max-h-20 w-full max-w-[220px] overflow-hidden rounded border border-track/10" style={{ aspectRatio: "2 / 1" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={bannerUrl} alt="Preview" className="h-full w-full object-cover" /></div></> : <><UploadCloud className="h-5 w-5 text-track/30" /><span className="text-xs text-track/40">Drop image or click — max 3 MB</span></>}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleBanner(f); }} /></label></div>
              <div><label className="mb-1 block text-xs font-medium tracking-wide text-track/60">Email — for receipts & My Rank</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className="w-full border border-track/15 bg-white px-3 py-2 text-sm text-track placeholder:text-track/30 focus:border-gold focus:outline-none" /></div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div><label htmlFor="bm-bid" className="mb-1 block text-xs font-medium tracking-wide text-track/60">Your bid</label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-data text-sm text-track/30">$</span><input id="bm-bid" type="number" step="0.01" min={minBid} value={bidTarget} onChange={(e) => setBidTarget(e.target.value)} required className="w-full border border-track/15 bg-white py-2 pl-7 pr-3 font-data text-lg font-bold tabular-nums text-track focus:border-gold focus:outline-none" /></div>{previewLine && <p className="mt-2 font-data text-xs tabular-nums text-track/50">{previewLine}</p>}<p className="mt-3 border-l-2 border-gold bg-gold/10 px-3 py-2 font-data text-xs text-track/60">Minimum for this slot: <span className="font-bold text-track">${minBid.toFixed(2)}</span></p></div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              {!clientSecret ? (
                <p className="font-data text-xs text-track/40">Preparing payment…</p>
              ) : stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                  <BidPaymentStep
                    onSuccess={() => {
                      const r = previewRank(parseFloat(bidTarget || "0"), board);
                      setConfirmed({ rank: r, category: CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId });
                    }}
                    onError={(msg) => setError(msg)}
                  />
                </Elements>
              ) : (
                <p className="border-l-2 border-flag bg-flag/10 px-3 py-2 font-data text-xs text-flag">Stripe publishable key not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
              )}
              <div className="border border-track/10 bg-white p-3 font-data text-xs text-track/60">
                <span className="font-bold text-track">${parseFloat(bidTarget || "0").toFixed(2)}</span> — {previewLine}
              </div>
            </div>
          )}
          {error && <p role="alert" className="mt-4 border-l-2 border-flag bg-flag/10 px-3 py-2 text-xs leading-relaxed text-flag">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-track/10 px-6 py-4">
          {step > 1 && step < 3 && <button onClick={() => setStep((s) => (s - 1) as Step)} className="border border-track/15 px-4 py-2.5 text-sm font-medium text-track hover:bg-black/5">Back</button>}
          {step === 3 && clientSecret && <button onClick={() => setStep(2)} className="border border-track/15 px-4 py-2.5 text-sm font-medium text-track hover:bg-black/5">Back</button>}
          <div className="flex-1" />
          {step === 1 && <button onClick={() => setStep(2)} disabled={!canNextFrom1} className="bg-track px-6 py-2.5 text-sm font-bold text-paper hover:bg-track/90 disabled:opacity-30">Next</button>}
          {step === 2 && <button onClick={() => void goToPayment()} disabled={!canNextFrom2 || creatingIntent} className="flex items-center gap-2 bg-track px-6 py-2.5 text-sm font-bold text-paper hover:bg-track/90 disabled:opacity-30">{creatingIntent && <Loader2 className="h-4 w-4 animate-spin" />} Next</button>}
        </div>
      </div>
    </div>
  );
}
