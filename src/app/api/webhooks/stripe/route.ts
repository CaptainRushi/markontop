import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single webhook endpoint for all Stripe events (Section 5 + 7 + 4).
 * - Verifies signature (Section 7, last bullet — not optional).
 * - Idempotent via processed_webhook_events + bid_events.stripe_payment_intent_id UNIQUE.
 * - payment_intent.succeeded → row-locking transaction (Section 4) via apply_bid_with_lock.
 * - charge.dispute.created → handle_chargeback (Section 6).
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = await getStripe().webhooks.constructEventAsync(raw, sig, secret);
  } catch (err) {
    console.error("[webhook] bad signature", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Idempotency: have we already processed this event.id?
  const { data: already } = await admin.from("processed_webhook_events").select("stripe_event_id").eq("stripe_event_id", event.id).maybeSingle();
  if (already) return NextResponse.json({ received: true, deduped: true });

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const m = pi.metadata;
      if (!m?.listing_id || !m.category_id || !m.total_bid_target) {
        console.error("[webhook] pi.succeeded missing metadata", pi.id);
      } else {
        const amountCents = Number(m.amount_cents ?? pi.amount);
        const totalBidCents = Math.round(parseFloat(m.total_bid_target) * 100);

        // The amount charged (pi.amount) is the delta for upgrades; total is what rank is based on.
        // For correctness, standings cares about total_bid_target, not charged delta.
        const { data, error } = await admin.rpc("apply_bid_with_lock", {
          p_listing_id: m.listing_id,
          p_category_id: m.category_id,
          p_amount_cents: totalBidCents,
          p_stripe_pi_id: pi.id,
          p_owner_email: m.owner_email ?? "",
          p_user_id: null,
          p_title: m.title ?? "Untitled",
          p_target_url: m.target_url ?? "",
          p_banner_url: m.banner_url ?? "",
          p_description: m.description ?? null,
        });

        if (error) {
          console.error("[webhook] apply_bid_with_lock failed", pi.id, error);
          return NextResponse.json({ error: "DB apply failed" }, { status: 500 });
        }

        const result = data as { ok: boolean; reason: string; refund: boolean; listing_id?: string } | null;
        if (result && !result.ok && result.refund) {
          // Race loser: payment succeeded but rank not awarded → refund the PaymentIntent
          try {
            await getStripe().refunds.create({ payment_intent: pi.id, reason: "requested_by_customer" });
            await admin.from("bid_events").update({ status: "refunded" }).eq("stripe_payment_intent_id", pi.id);
            console.log(`[webhook] race-loser refunded ${pi.id} reason=${result.reason}`);
          } catch (refundErr) {
            console.error("[webhook] refund failed", pi.id, refundErr);
          }
        } else {
          // Activate listing if it was pending_review and not flagged
          if (result?.ok) {
            await admin.from("listings").update({ is_active: true }).eq("id", m.listing_id).eq("is_active", false);
          }
          console.log(`[webhook] pi.succeeded ${pi.id} -> ${result?.reason ?? "ok"}`);
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await admin.from("bid_events").update({ status: "failed" }).eq("stripe_payment_intent_id", pi.id);
    } else if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = dispute.charge as string;
      // Resolve PI from charge
      try {
        const charge = await getStripe().charges.retrieve(chargeId);
        const piId = charge.payment_intent as string;
        if (piId) await admin.rpc("handle_chargeback", { p_stripe_pi_id: piId });
        console.log(`[webhook] dispute handled ${dispute.id} -> pi ${piId}`);
      } catch (e) {
        console.error("[webhook] dispute lookup failed", e);
      }
    } else if (event.type === "checkout.session.completed") {
      // Backward compat: old Checkout flow still supported during rollout
      const session = event.data.object as Stripe.Checkout.Session;
      const m = session.metadata;
      if (m?.target_url && m.total_bid_target) {
        const totalCents = Math.round(parseFloat(m.total_bid_target) * 100);
        // Map Checkout session to a synthetic bid via same lock path
        // Use session.id as PI id for idempotency (Checkout sessions are also unique)
        await admin.rpc("apply_bid_with_lock", {
          p_listing_id: crypto.randomUUID(),
          p_category_id: m.category_id ?? "other",
          p_amount_cents: totalCents,
          p_stripe_pi_id: `cs_${session.id}`,
          p_owner_email: m.owner_email ?? "",
          p_user_id: null,
          p_title: m.title ?? "Untitled",
          p_target_url: m.target_url ?? "",
          p_banner_url: m.banner_url ?? "",
          p_description: m.description ?? null,
        });
      }
    }

    // Mark event as processed (after successful handling)
    await admin.from("processed_webhook_events").insert({ stripe_event_id: event.id }).then(() => {}, () => {});

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] unhandled", err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
