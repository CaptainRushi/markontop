-- MarkOnTop — 0002_rls_and_ranking.sql
-- Row-Level Security, atomic paid-bid RPC, ranking helpers.

-- =========================================================
-- RLS
-- =========================================================
alter table categories enable row level security;
alter table listings enable row level security;
alter table bid_transactions enable row level security;

-- Public read: boards are public
drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read"
  on categories for select using (true);

-- Public read on active listings (leaderboard is public data; owner_email
-- exposure is intentional for a public bid board — same as outbid-style sites).
drop policy if exists "listings_public_read_active" on listings;
create policy "listings_public_read_active"
  on listings for select using (is_active = true);

-- Owners may read their own listings even when deactivated.
drop policy if exists "listings_owner_read" on listings;
create policy "listings_owner_read"
  on listings for select
  using (owner_email = coalesce(auth.jwt() ->> 'email', ''));

-- No client-side writes: all writes flow through the service-role webhook RPC.
drop policy if exists "listings_service_write" on listings;
create policy "listings_service_write"
  on listings for all
  using (false)
  with check (false);

drop policy if exists "bid_transactions_service_only" on bid_transactions;
create policy "bid_transactions_service_only"
  on bid_transactions for all
  using (false)
  with check (false);

-- =========================================================
-- Atomic, idempotent payment application (called by Stripe webhook with
-- service role). Returns the listing id that now holds the bid.
-- =========================================================
create or replace function apply_paid_bid(
  p_stripe_session_id text,
  p_amount_paid numeric,
  p_total_bid_target numeric,
  p_title text,
  p_target_url text,
  p_banner_url text,
  p_description text,
  p_category_id text,
  p_owner_email text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_existing_txn uuid;
begin
  -- Idempotency gate: if this Stripe session was already applied, no-op.
  select id into v_existing_txn
  from bid_transactions
  where stripe_session_id = p_stripe_session_id;

  if v_existing_txn is not null then
    select listing_id into v_listing_id
    from bid_transactions
    where id = v_existing_txn;
    return v_listing_id;
  end if;

  if p_total_bid_target < 1.00 then
    raise exception 'total_bid_target below $1.00 entry floor';
  end if;

  -- Upsert the listing (one listing per normalized URL).
  insert into listings (title, target_url, banner_url, description, category_id, owner_email, current_bid)
  values (p_title, p_target_url, p_banner_url, p_description, p_category_id, p_owner_email, p_total_bid_target)
  on conflict (target_url) do update set
    title        = excluded.title,
    banner_url   = excluded.banner_url,
    description  = coalesce(excluded.description, listings.description),
    category_id  = listings.category_id,          -- category is fixed at submission
    current_bid  = greatest(listings.current_bid, excluded.current_bid),
    is_active    = true,
    updated_at   = now()
  where excluded.current_bid > listings.current_bid   -- never let an out-of-order/lower webhook lower a rank
     or listings.is_active = false                    -- reactivation path still applies metadata
  returning id into v_listing_id;

  -- Conflict with a higher existing bid and no update happened? Record as failed ledger row.
  if v_listing_id is null then
    select id into v_listing_id from listings where target_url = p_target_url;
  end if;

  insert into bid_transactions (listing_id, stripe_session_id, amount_paid, total_bid_target, status)
  values (v_listing_id, p_stripe_session_id, p_amount_paid, p_total_bid_target, 'succeeded');

  return v_listing_id;
end;
$$;

-- Mark a session failed/expired (webhook checkout.session.expired / async failure).
create or replace function mark_transaction_failed(p_stripe_session_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update bid_transactions set status = 'failed'
  where stripe_session_id = p_stripe_session_id and status = 'pending';
$$;

-- =========================================================
-- Deterministic rank lookup: exact position of a listing
-- (bid DESC, created_at ASC). Scope: global ('global') or a category id.
-- =========================================================
create or replace function get_listing_rank(p_listing_id uuid, p_scope text default 'global')
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select l.id, l.category_id, l.current_bid, l.created_at
    from listings l where l.id = p_listing_id and l.is_active
  )
  select count(*) + 1
  from listings ranked
  join target t on true
  where ranked.is_active
    and (p_scope = 'global' or ranked.category_id = t.category_id)
    and (ranked.current_bid > t.current_bid
         or (ranked.current_bid = t.current_bid and ranked.created_at < t.created_at));
$$;

-- =========================================================
-- Storage: banners bucket (public read). Create once.
-- =========================================================
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

-- Public read of banners
drop policy if exists "banners_public_read" on storage.objects;
create policy "banners_public_read"
  on storage.objects for select
  using (bucket_id = 'banners');

-- Anyone may upload a banner pre-payment (validated app-side: type/size).
drop policy if exists "banners_anyone_insert" on storage.objects;
create policy "banners_anyone_insert"
  on storage.objects for insert
  with check (bucket_id = 'banners');
