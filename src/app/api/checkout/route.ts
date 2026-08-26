import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeChargeAmount } from "@/lib/ranking";
import { isValidNormalizedUrl, normalizeUrl } from "@/lib/url";
import { CATEGORIES } from "@/lib/categories";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckoutBody {
  title?: string;
  target_url?: string;
  banner_url?: string;
  description?: string;
  category_id?: string;
  owner_email?: string;
  bid_target?: number | string;
}

/**
 * Creates a Stripe Checkout Session for a paid placement.
 *
 * Server-side pricing is authoritative:
 *  - New URL        -> charge full bid target (min $1.00)
 *  - Same-owner URL -> charge difference (new total - current_bid)
 *  - Other-owner URL-> full bid target, must be >= current_bid + $1.00
 *
 * The webhook (not this route) applies the bid after payment succeeds.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`checkout:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  try {
    const body = (await req.json()) as CheckoutBody;

    const title = (body.title ?? "").trim();
    const bannerUrl = (body.banner_url ?? "").trim();
    const categoryId = (body.category_id ?? "").trim();
    const email = (body.owner_email ?? "").trim().toLowerCase();
    const normalizedUrl = normalizeUrl(body.target_url ?? "");
    const description = (body.description ?? "").trim() || undefined;
    const bidTarget = typeof body.bid_target === "string" ? parseFloat(body.bid_target) : body.bid_target;

    if (!title || title.length > 120) {
      return NextResponse.json({ error: "Title is required (max 120 chars)." }, { status: 400 });
    }
    if (!isValidNormalizedUrl(normalizedUrl)) {
      return NextResponse.json({ error: "Enter a valid site URL." }, { status: 400 });
    }
    if (!bannerUrl.startsWith("http")) {
      return NextResponse.json({ error: "Upload a banner image first." }, { status: 400 });
    }
    if (!CATEGORIES.some((c) => c.id === categoryId)) {
      return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid contact email is required." }, { status: 400 });
    }
    if (typeof bidTarget !== "number" || Number.isNaN(bidTarget)) {
      return NextResponse.json({ error: "Invalid bid amount." }, { status: 400 });
    }

    // Fresh DB state decides the price — never trust client-side math.
    const admin = getSupabaseAdminClient();
    const { data: existing } = await admin
      .from("listings")
      .select("owner_email, current_bid")
      .eq("target_url", normalizedUrl)
      .maybeSingle();

    let amountToCharge: number;
    try {
      amountToCharge = computeChargeAmount({
        bidTarget,
        existing: existing ? { owner_email: existing.owner_email, current_bid: Number(existing.current_bid) } : null,
        requesterEmail: email,
      });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Bid rejected." }, { status: 400 });
    }

    if (amountToCharge <= 0) {
      return NextResponse.json({ error: "Nothing to charge for this bid." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountToCharge * 100),
            product_data: {
              name: `MarkOnTop paid placement — ${title}`,
              description:
                existing && existing.owner_email.toLowerCase() === email
                  ? `Upgrade to $${bidTarget.toFixed(2)} (paying $${amountToCharge.toFixed(2)} difference)`
                  : `Placement bid of $${bidTarget.toFixed(2)} for ${normalizedUrl}`,
            },
          },
        },
      ],
      metadata: {
        title,
        target_url: normalizedUrl,
        banner_url: bannerUrl,
        description: description ?? "",
        category_id: categoryId,
        owner_email: email,
        total_bid_target: bidTarget.toFixed(2),
      },
      success_url: `${siteUrl}/my-rank?checkout=success`,
      cancel_url: `${siteUrl}/submit?canceled=1`,
    };

    const session = await getStripe().checkout.sessions.create(params);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 500 });
  }
}
