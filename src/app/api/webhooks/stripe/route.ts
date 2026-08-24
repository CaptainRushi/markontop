import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the ONLY place listings are written after payment.
 *
 * 1. Verifies the signature against the RAW request body.
 * 2. On checkout.session.completed, calls the atomic Postgres RPC
 *    `apply_paid_bid` which:
 *      - no-ops if stripe_session_id was already applied (idempotency)
 *      - upserts the listing (unique per normalized target_url)
 *      - raises current_bid to total_bid_target (never lowers it)
 *      - appends a 'succeeded' row to bid_transactions
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing webhook signature/secret." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text(); // raw body — required for signature check
    event = await getStripe().webhooks.constructEventAsync(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const m = session.metadata;

    if (!m?.target_url || !m.total_bid_target || !m.owner_email) {
      console.error("[stripe-webhook] completed session missing bid metadata:", session.id);
      return NextResponse.json({ received: true }); // ack; nothing we can apply
    }

    try {
      const admin = getSupabaseAdminClient();
      const { data, error } = await admin.rpc("apply_paid_bid", {
        p_stripe_session_id: session.id,
        p_amount_paid: ((session.amount_total ?? 0) / 100).toFixed(2),
        p_total_bid_target: m.total_bid_target,
        p_title: m.title,
        p_target_url: m.target_url,
        p_banner_url: m.banner_url ?? "",
        p_description: m.description || null,
        p_category_id: m.category_id || null,
        p_owner_email: m.owner_email,
      });

      if (error) {
        console.error("[stripe-webhook] apply_paid_bid failed:", session.id, error);
        return NextResponse.json({ error: "DB apply failed" }, { status: 500 }); // Stripe will retry
      }
      console.log(`[stripe-webhook] applied ${session.id} -> listing ${data}`);
    } catch (err) {
      console.error("[stripe-webhook] unexpected:", err);
      return NextResponse.json({ error: "Internal" }, { status: 500 });
    }
  }

  // checkout.session.expired / payment failures need no action under this flow
  // (no pending ledger rows are written before payment).

  return NextResponse.json({ received: true });
}
