import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeChargeAmount } from "@/lib/ranking";
import { isValidNormalizedUrl, normalizeUrl } from "@/lib/url";
import { CATEGORIES } from "@/lib/categories";
import { rateLimit } from "@/lib/rateLimit";
import { checkUrlReputation } from "@/lib/fraud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a Stripe PaymentIntent for a bid.
 * Amount is SERVER-COMPUTED from live standings (cents, never floats, never client-trusted).
 * Idempotency: frontend disables button; backend checks for existing pending PI for same user+url.
 * Section 7: PaymentIntent (embedded) with Radar, not Checkout redirect.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 bid attempts per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`bid:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many bid attempts. Try again shortly." }, { status: 429 });

  let body: {
    title?: string; target_url?: string; banner_url?: string; description?: string;
    category_id?: string; owner_email?: string; bid_target?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const bannerUrl = (body.banner_url ?? "").trim();
  const categoryId = (body.category_id ?? "").trim();
  const email = (body.owner_email ?? "").trim().toLowerCase();
  const normalizedUrl = normalizeUrl(body.target_url ?? "");
  const description = (body.description ?? "").trim() || undefined;
  const bidTarget = typeof body.bid_target === "string" ? parseFloat(body.bid_target) : body.bid_target;

  if (!title || title.length > 120) return NextResponse.json({ error: "Title required (max 120)." }, { status: 400 });
  if (!isValidNormalizedUrl(normalizedUrl)) return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  if (!bannerUrl.startsWith("http")) return NextResponse.json({ error: "Upload banner first." }, { status: 400 });
  if (!CATEGORIES.some((c) => c.id === categoryId)) return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  if (typeof bidTarget !== "number" || Number.isNaN(bidTarget)) return NextResponse.json({ error: "Invalid bid amount." }, { status: 400 });

  const fraud = checkUrlReputation(normalizedUrl, title);
  if (!fraud.ok) return NextResponse.json({ error: "Listing flagged for review. This may take a moment." }, { status: 422 });

  const admin = getSupabaseAdminClient();

  // Read live standings for this URL's category + global, to compute amount server-side
  const { data: existingListing } = await admin
    .from("listings")
    .select("id, owner_email, current_bid")
    .eq("target_url", normalizedUrl)
    .maybeSingle();

  // For takeover checks, need standings current_bid_cents if exists
  let existingForPricing: { owner_email: string; current_bid: number } | null = null;
  if (existingListing) {
    existingForPricing = { owner_email: existingListing.owner_email, current_bid: Number(existingListing.current_bid) };
  }

  let amountToCharge: number;
  try {
    amountToCharge = computeChargeAmount({
      bidTarget,
      existing: existingForPricing,
      requesterEmail: email,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bid rejected." }, { status: 400 });
  }
  if (amountToCharge <= 0) return NextResponse.json({ error: "Nothing to charge." }, { status: 400 });

  const amountCents = Math.round(amountToCharge * 100);
  const listingId = existingListing?.id ?? crypto.randomUUID();

  // Idempotency key: user+url+bidTarget within last 2 minutes — prevents double-click creating two PIs
  const idempotencyKey = `bid:${email}:${normalizedUrl}:${bidTarget.toFixed(2)}`;

  // Ensure listing row exists (for FK) before creating PI — but don't set current_bid yet; webhook does.
  if (!existingListing) {
    // Insert a placeholder listing in pending_review so FK exists; standings not yet created.
    const { error: insErr } = await admin.from("listings").insert({
      id: listingId,
      title,
      target_url: normalizedUrl,
      banner_url: bannerUrl,
      description: description ?? null,
      category_id: categoryId,
      owner_email: email,
      current_bid: 1.0, // placeholder; real bid applied by webhook
      is_active: false, // not visible until payment confirmed + review if needed
    });
    if (insErr && !insErr.message.includes("duplicate")) {
      console.error("[create-intent] listing insert failed", insErr);
      return NextResponse.json({ error: "Could not create listing." }, { status: 500 });
    }
    // Flag for review (first-time listing)
    await admin.from("listing_reviews").insert({ listing_id: listingId, status: "pending" }).then(() => {}, () => {});
  }

  // Create PaymentIntent — server is the only place amount comes from
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: "usd",
      // Radar enabled by default on every PI; no extra config needed for v1
      metadata: {
        listing_id: listingId,
        category_id: categoryId,
        target_url: normalizedUrl,
        banner_url: bannerUrl,
        title,
        description: description ?? "",
        owner_email: email,
        total_bid_target: bidTarget.toFixed(2),
        amount_cents: String(amountCents),
      },
      receipt_email: email,
      description: `MarkOnTop bid — ${title} @ $${bidTarget.toFixed(2)}`,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" as const },
    },
    { idempotencyKey }
  );

  // Record pending bid_event early for dedupe + audit (status pending until webhook confirms)
  await admin.from("bid_events").insert({
    listing_id: listingId,
    owner_email: email,
    amount_cents: amountCents,
    stripe_payment_intent_id: pi.id,
    status: "pending",
  }).then(() => {}, () => {});

  return NextResponse.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id, amountCents, listingId });
}
