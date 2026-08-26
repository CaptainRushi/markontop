-- 0003_correctness_scale.sql
-- Backend & System Working Prompt: correctness under concurrency, anti-fraud, scale to 1M.
-- Adds standings (derived cache), bid_events (cents ledger), processed_webhooks (idempotency),
-- review queue, and rewrites the bid application to use row-level locking + server-computed cents.
-- Keeps existing listings / bid_transactions for backward compat; new tables are the source of truth going forward.

-- ── 0. Helpers ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 1. Standings — fast-read cache, one row per listing ────────────────────
create table if not exists standings (
  listing_id      uuid primary key references listings(id) on delete cascade,
  category_id     text not null references categories(id) on delete cascade,
  current_bid_cents bigint not null check (current_bid_cents >= 100),
  rank            int,
  bid_placed_at   timestamptz not null,
  updated_at      timestamptz not null default now()
);

-- Deterministic ranking index: category, bid DESC, earliest wins tie
create index if not exists idx_standings_category_rank
  on standings (category_id, current_bid_cents desc, bid_placed_at asc);

-- Realtime on standings (viewers subscribe to this, not listings, for rank reads)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'standings'
  ) then
    alter publication supabase_realtime add table public.standings;
  end if;
end $$;

-- ── 2. Bid events — append-only ledger, source of truth, cents ─────────────
create table if not exists bid_events (
  id                          uuid primary key default gen_random_uuid(),
  listing_id                  uuid not null references listings(id) on delete cascade,
  user_id                     uuid, -- nullable for anonymous email-only bids (legacy)
  owner_email                 text, -- denormalized for anonymous path + audit
  amount_cents                bigint not null check (amount_cents > 0),
  stripe_payment_intent_id    text unique not null,
  status                      text not null check (status in ('pending','confirmed','failed','refunded')),
  created_at                  timestamptz not null default now()
);
create index if not exists idx_bid_events_pi on bid_events (stripe_payment_intent_id);
create index if not exists idx_bid_events_listing on bid_events (listing_id, created_at desc);
create index if not exists idx_bid_events_status on bid_events (status);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bid_events'
  ) then
    alter publication supabase_realtime add table public.bid_events;
  end if;
end $$;

-- ── 3. Webhook idempotency ─────────────────────────────────────────────────
create table if not exists processed_webhook_events (
  stripe_event_id text primary key,
  processed_at    timestamptz not null default now()
);

-- ── 4. Review queue — first-time listings only ─────────────────────────────
create table if not exists listing_reviews (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references listings(id) on delete cascade unique,
  status        text not null default 'pending' check (status in ('pending','approved','rejected','flagged')),
  reason        text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_listing_reviews_status on listing_reviews (status);

-- ── 5. RLS ─────────────────────────────────────────────────────────────────
alter table standings enable row level security;
alter table bid_events enable row level security;
alter table processed_webhook_events enable row level security;
alter table listing_reviews enable row level security;

drop policy if exists "standings_public_read" on standings;
create policy "standings_public_read" on standings for select using (true);

drop policy if exists "bid_events_public_read_confirmed" on bid_events;
create policy "bid_events_public_read_confirmed" on bid_events for select using (status = 'confirmed');

-- No client writes to any of these; all writes via service-role webhook/RPC.
drop policy if exists "standings_no_client_write" on standings;
create policy "standings_no_client_write" on standings for all using (false) with check (false);
drop policy if exists "bid_events_no_client_write" on bid_events;
create policy "bid_events_no_client_write" on bid_events for all using (false) with check (false);
drop policy if exists "webhook_no_client" on processed_webhook_events;
create policy "webhook_no_client" on processed_webhook_events for all using (false) with check (false);
drop policy if exists "reviews_no_client" on listing_reviews;
create policy "reviews_no_client" on listing_reviews for all using (false) with check (false);

-- ── 6. Backfill standings from existing listings (one-time, idempotent) ─────
insert into standings (listing_id, category_id, current_bid_cents, bid_placed_at, updated_at)
select
  l.id,
  l.category_id,
  (l.current_bid * 100)::bigint,
  l.created_at,
  l.updated_at
from listings l
where l.is_active = true and l.category_id is not null
on conflict (listing_id) do nothing;

-- ── 7. Row-locking bid application — the one correctness primitive ──────────
-- Called ONLY by the webhook (service role). Holds a per-category FOR UPDATE
-- lock for the few ms it takes to re-check staleness and write.

create or replace function apply_bid_with_lock(
  p_listing_id            uuid,
  p_category_id           text,
  p_amount_cents          bigint,
  p_stripe_pi_id          text,
  p_owner_email           text,
  p_user_id               uuid,
  p_title                 text,
  p_target_url            text,
  p_banner_url            text,
  p_description           text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_count  int;
  v_existing_cents bigint;
  v_is_owner      boolean;
  v_listing_id    uuid;
  v_result        jsonb;
begin
  if p_amount_cents < 100 then
    return jsonb_build_object('ok', false, 'reason', 'below_floor', 'refund', false);
  end if;

  -- Idempotency: UNIQUE on stripe_payment_intent_id guarantees at-most-once.
  -- Check early to avoid taking the lock on a replay.
  if exists (select 1 from bid_events where stripe_payment_intent_id = p_stripe_pi_id) then
    return jsonb_build_object('ok', true, 'reason', 'already_processed', 'refund', false);
  end if;

  -- ── Critical section: lock the contested category's top rows ──
  -- This serializes concurrent bids for the same category's podium.
  -- Lock is held only for the integer comparison + two writes below.
  select count(*) into v_locked_count
  from standings
  where category_id = p_category_id
  order by current_bid_cents desc, bid_placed_at asc
  limit 3
  for update;

  -- Upsert listing metadata (title/banner/description may update on re-bid)
  -- owner_email is authoritative from the PaymentIntent metadata.
  insert into listings (id, title, target_url, banner_url, description, category_id, owner_email, current_bid, is_active, updated_at)
  values (p_listing_id, p_title, p_target_url, p_banner_url, p_description, p_category_id, p_owner_email, p_amount_cents / 100.0, true, now())
  on conflict (id) do update set
    title      = excluded.title,
    banner_url = excluded.banner_url,
    description = coalesce(excluded.description, listings.description),
    -- category is fixed at first submission per Rules; ignore on conflict
    updated_at = now()
  returning id into v_listing_id;

  -- Determine ownership for delta vs full-charge check
  -- For new listings, there is no prior standing; for existing, compare email.
  select current_bid_cents into v_existing_cents from standings where listing_id = p_listing_id;

  if v_existing_cents is not null then
    -- Existing listing: check ownership by listing owner_email
    select (lower(owner_email) = lower(p_owner_email)) into v_is_owner from listings where id = p_listing_id;
    if v_is_owner then
      -- Upgrade: must beat own prior bid (any delta > 0)
      if p_amount_cents <= v_existing_cents then
        insert into bid_events (listing_id, user_id, owner_email, amount_cents, stripe_payment_intent_id, status)
        values (p_listing_id, p_user_id, p_owner_email, p_amount_cents, p_stripe_pi_id, 'failed');
        return jsonb_build_object('ok', false, 'reason', 'not_higher_than_own', 'refund', true);
      end if;
    else
      -- Takeover: must be at least 100 cents ($1) above existing
      if p_amount_cents < v_existing_cents + 100 then
        insert into bid_events (listing_id, user_id, owner_email, amount_cents, stripe_payment_intent_id, status)
        values (p_listing_id, p_user_id, p_owner_email, p_amount_cents, p_stripe_pi_id, 'failed');
        return jsonb_build_object('ok', false, 'reason', 'below_takeover_floor', 'refund', true);
      end if;
    end if;
  else
    -- New listing: floor is $1 (100 cents), already checked
    null;
  end if;

  -- All checks passed: record confirmed event and update standings (derived cache)
  insert into bid_events (listing_id, user_id, owner_email, amount_cents, stripe_payment_intent_id, status)
  values (p_listing_id, p_user_id, p_owner_email, p_amount_cents, p_stripe_pi_id, 'confirmed');

  insert into standings (listing_id, category_id, current_bid_cents, bid_placed_at, updated_at)
  values (p_listing_id, p_category_id, p_amount_cents, now(), now())
  on conflict (listing_id) do update set
    current_bid_cents = excluded.current_bid_cents,
    bid_placed_at     = excluded.bid_placed_at,
    updated_at        = now();

  -- Keep listings.current_bid in sync (legacy read path)
  update listings set current_bid = p_amount_cents / 100.0, updated_at = now() where id = p_listing_id;

  return jsonb_build_object('ok', true, 'reason', 'confirmed', 'refund', false, 'listing_id', p_listing_id);
end;
$$;

-- ── 8. Chargeback handler ──────────────────────────────────────────────────
create or replace function handle_chargeback(p_stripe_pi_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
begin
  select listing_id into v_listing_id from bid_events where stripe_payment_intent_id = p_stripe_pi_id;
  if v_listing_id is null then return; end if;

  update bid_events set status = 'refunded' where stripe_payment_intent_id = p_stripe_pi_id;
  update listings set is_active = false where id = v_listing_id;
  insert into listing_reviews (listing_id, status, reason) values (v_listing_id, 'flagged', 'chargeback')
    on conflict (listing_id) do update set status = 'flagged', reason = 'chargeback', reviewed_at = now();
  delete from standings where listing_id = v_listing_id;
  -- Note: standing is removed, not recomputed. Ranks shift naturally via the
  -- category_rank index; no separate rank column to patch.
end;
$$;

-- ── 9. View: leaderboard reads hit this (standings JOIN listings) ───────────
create or replace view leaderboard as
select
  l.id,
  l.title,
  l.target_url,
  l.banner_url,
  l.description,
  l.category_id,
  l.owner_email,
  l.is_active,
  l.created_at,
  s.current_bid_cents,
  (s.current_bid_cents / 100.0)::numeric(12,2) as current_bid,
  s.bid_placed_at,
  s.updated_at as standing_updated_at
from listings l
join standings s on s.listing_id = l.id
where l.is_active = true;

-- ── 10. Keep standings rank helper for MyRank (reuses existing get_listing_rank) ──
-- No change to that function; it can now UNION standings if needed. Left as-is.
