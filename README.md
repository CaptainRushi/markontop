# MarkOnTop

Deterministic pay-to-rank paid-placement billboard. **$1 entry floor**, **category boards**,
and a **realtime 3D top-3 podium** built with React Three Fiber.

> This is a deterministic paid-placement advertising service. Placement is purchased, not won.
> No lottery/gambling mechanics exist anywhere in the product or its rules.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind v4 + lucide-react
- **React Three Fiber / drei / three.js** — 3D podium with banner textures + animated rank swaps
- **Supabase** — Postgres (+ RLS), Magic Link auth, Realtime, Storage
- **Stripe** — Checkout Sessions + signature-verified webhook (single write path)
- **Vitest** — business-rule tests

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
npm run dev
```

### Database

Run both migrations in order against your Supabase project (SQL Editor or `supabase db push`):

1. `supabase/migrations/0001_init.sql` — categories, listings, bid_transactions,
   deterministic ranking index `(category_id, current_bid DESC, created_at ASC)`,
   adds `listings` to the `supabase_realtime` publication.
2. `supabase/migrations/0002_rls_and_ranking.sql` — RLS policies, the atomic
   idempotent RPC `apply_paid_bid`, exact-rank function `get_listing_rank`,
   and the public `banners` storage bucket + policies.

### Stripe

1. Add webhook endpoint: `<SITE_URL>/api/webhooks/stripe`
2. Events: at minimum `checkout.session.completed`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

## How ranking works (deterministic)

| Rule | Behavior |
| ---- | -------- |
| Entry | `$1.00` places a listing on the matching board |
| Ordering | `current_bid DESC, created_at ASC` — earlier payment wins ties |
| Takeover | Full payment of `>= holder + $1.00` claims an occupied slot |
| Upgrade | Re-bidding your own URL charges only the difference |
| Uniqueness | One listing per normalized URL (`https://www.Ex.com/a/` == `example.com/a`) |
| Persistence | No time decay — you hold rank until outbid |

All money math lives in [`src/lib/ranking.ts`](src/lib/ranking.ts) (pure, unit-tested).
The **server** computes what Stripe charges via `computeChargeAmount()` on every checkout;
client-side minimums are display-only.

### Payment flow

```
submit form → POST /api/checkout ──(validates + prices from live DB)──► Stripe Checkout Session
             ▲ metadata: title/url/banner/category/email/total_bid_target
webhook ◄── checkout.session.completed (signature verified vs raw body)
  └─ RPC apply_paid_bid: idempotency gate on stripe_session_id →
     upsert listing (never lowers current_bid) → ledger row 'succeeded'
Supabase Realtime → all boards refetch → podium blocks animate to new slots
```

## Tests

```bash
npm test        # tie-breaking, takeover deltas, upgrade pricing, URL normalization
npm run build   # typecheck + production build
```
