-- MarkOnTop — 0001_init.sql
-- Core tables, deterministic ranking index, realtime publication.

-- 1. Categories
create table if not exists categories (
  id text primary key,
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

insert into categories (id, name, slug) values
  ('saas-tools',            'SaaS Tools',                   'saas-tools'),
  ('ai-tools-agents',       'AI Tools & Agents',            'ai-tools-agents'),
  ('dev-tools-apis',        'Dev Tools & APIs',             'dev-tools-apis'),
  ('marketing-growth',      'Marketing & Growth Agencies',  'marketing-growth'),
  ('ecommerce-d2c',         'E-commerce/D2C Brands',        'ecommerce-d2c'),
  ('newsletters-content',   'Newsletters & Content Creators','newsletters-content'),
  ('design-creative',       'Design & Creative Tools',      'design-creative'),
  ('mobile-apps',           'Mobile Apps',                  'mobile-apps'),
  ('personal-brand',        'Personal Brand/Portfolio',     'personal-brand'),
  ('other',                 'Other',                        'other')
on conflict (id) do nothing;

-- 2. Listings
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_url text unique not null,
  banner_url text not null,
  description text,
  category_id text references categories(id) on delete set null,
  owner_email text not null,
  current_bid numeric(12,2) not null default 1.00 check (current_bid >= 1.00),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Bids / Transactions ledger
create table if not exists bid_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  stripe_session_id text unique not null,
  amount_paid numeric(12,2) not null,
  total_bid_target numeric(12,2) not null,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  created_at timestamptz default now()
);

-- Deterministic ranking index: bid_amount DESC, created_at ASC (earlier bid keeps higher rank on ties)
create index if not exists idx_listings_ranking
  on listings (category_id, current_bid desc, created_at asc);

-- Realtime: broadcast INSERT/UPDATE/DELETE on listings
drop publication if exists supabase_realtime_listing_placeholder;
do $$
begin
  -- add table to the realtime publication if not already present
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'listings'
  ) then
    alter publication supabase_realtime add table public.listings;
  end if;
end $$;
