-- BipBop v13 Report Center - tabelle isolate
create extension if not exists pgcrypto;

create table if not exists bb13_transactions (
  id uuid primary key default gen_random_uuid(),
  asin text,
  title text,
  units numeric default 0,
  sales numeric default 0,
  net_sales numeric default 0,
  amazon_fees numeric default 0,
  price numeric default 0,
  imported_at timestamptz default now()
);

create table if not exists bb13_ad_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_id text,
  invoice_date text,
  paid_amount numeric default 0,
  invoiced_amount numeric default 0,
  status text,
  imported_at timestamptz default now()
);

create table if not exists bb13_ads_campaigns (
  id uuid primary key default gen_random_uuid(),
  channel text,
  campaign text,
  target text,
  spend numeric default 0,
  sales numeric default 0,
  orders numeric default 0,
  clicks numeric default 0,
  impressions numeric default 0,
  imported_at timestamptz default now()
);

create table if not exists bb13_search_terms (
  id uuid primary key default gen_random_uuid(),
  search_term text,
  campaign text,
  spend numeric default 0,
  sales numeric default 0,
  orders numeric default 0,
  imported_at timestamptz default now()
);

create table if not exists bb13_business_report (
  id uuid primary key default gen_random_uuid(),
  asin text,
  title text,
  sessions numeric default 0,
  page_views numeric default 0,
  units numeric default 0,
  sales numeric default 0,
  imported_at timestamptz default now()
);

create table if not exists bb13_inventory (
  id uuid primary key default gen_random_uuid(),
  asin text,
  sku text,
  quantity numeric default 0,
  title text,
  imported_at timestamptz default now()
);

create table if not exists bb13_costs (
  id uuid primary key default gen_random_uuid(),
  asin text,
  category text,
  production_cost numeric default 0,
  shipping_cost numeric default 0,
  packaging_cost numeric default 0,
  imported_at timestamptz default now()
);

alter table bb13_transactions enable row level security;
alter table bb13_ad_invoices enable row level security;
alter table bb13_ads_campaigns enable row level security;
alter table bb13_search_terms enable row level security;
alter table bb13_business_report enable row level security;
alter table bb13_inventory enable row level security;
alter table bb13_costs enable row level security;

drop policy if exists allow_bb13_transactions on bb13_transactions;
drop policy if exists allow_bb13_ad_invoices on bb13_ad_invoices;
drop policy if exists allow_bb13_ads_campaigns on bb13_ads_campaigns;
drop policy if exists allow_bb13_search_terms on bb13_search_terms;
drop policy if exists allow_bb13_business_report on bb13_business_report;
drop policy if exists allow_bb13_inventory on bb13_inventory;
drop policy if exists allow_bb13_costs on bb13_costs;

create policy allow_bb13_transactions on bb13_transactions for all using (true) with check (true);
create policy allow_bb13_ad_invoices on bb13_ad_invoices for all using (true) with check (true);
create policy allow_bb13_ads_campaigns on bb13_ads_campaigns for all using (true) with check (true);
create policy allow_bb13_search_terms on bb13_search_terms for all using (true) with check (true);
create policy allow_bb13_business_report on bb13_business_report for all using (true) with check (true);
create policy allow_bb13_inventory on bb13_inventory for all using (true) with check (true);
create policy allow_bb13_costs on bb13_costs for all using (true) with check (true);

notify pgrst, 'reload schema';
