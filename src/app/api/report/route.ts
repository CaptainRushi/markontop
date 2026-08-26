import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Report a listing for review. Rate-limited, anonymous allowed.
 * Writes to listing_reviews as flagged, or creates a pending review row.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`report:${ip}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429 });

  let body: { listing_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const listingId = (body.listing_id ?? "").trim();
  const reason = (body.reason ?? "user_report").trim().slice(0, 200);
  if (!listingId) return NextResponse.json({ error: "listing_id required." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("listing_reviews")
    .upsert({ listing_id: listingId, status: "flagged", reason }, { onConflict: "listing_id" });

  if (error) return NextResponse.json({ error: "Could not flag listing." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
