-- BipBop Enterprise 2026 v1.0 Growth Engine
create extension if not exists pgcrypto;

create table if not exists bb100_report_files (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  file_name text,
  fingerprint text,
  row_count integer default 0,
  column_count integer default 0,
  headers jsonb default '[]'::jsonb,
  delimiter text,
  source jsonb default '{}'::jsonb,
  is_duplicate boolean default false,
  imported_at timestamptz default now()
);

create table if not exists bb100_import_log (
  id uuid primary key default gen_random_uuid(),
  file_id uuid,
  report_type text,
  file_name text,
  fingerprint text,
  row_count integer default 0,
  column_count integer default 0,
  headers jsonb default '[]'::jsonb,
  delimiter text,
  source jsonb default '{}'::jsonb,
  is_duplicate boolean default false,
  success boolean default true,
  error_message text,
  imported_at timestamptz default now()
);

create table if not exists bb100_raw_rows (
  id uuid primary key default gen_random_uuid(),
  file_id uuid,
  report_type text not null,
  file_name text,
  row_index integer,
  row_data jsonb not null,
  fingerprint text,
  source jsonb default '{}'::jsonb,
  imported_at timestamptz default now()
);

create table if not exists bb100_ai_decisions (
  id uuid primary key default gen_random_uuid(),
  priority text,
  area text,
  title text,
  reason text,
  action text,
  estimated_impact text,
  source_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists bb100_cost_rules (
  id text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists bb100_settings (
  id text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_bb100_report_files_type on bb100_report_files(report_type);
create index if not exists idx_bb100_report_files_fingerprint on bb100_report_files(fingerprint);
create index if not exists idx_bb100_raw_rows_type on bb100_raw_rows(report_type);
create index if not exists idx_bb100_raw_rows_fingerprint on bb100_raw_rows(fingerprint);
create index if not exists idx_bb100_import_log_type on bb100_import_log(report_type);

alter table bb100_report_files enable row level security;
alter table bb100_import_log enable row level security;
alter table bb100_raw_rows enable row level security;
alter table bb100_ai_decisions enable row level security;
alter table bb100_cost_rules enable row level security;
alter table bb100_settings enable row level security;

drop policy if exists allow_bb100_report_files on bb100_report_files;
drop policy if exists allow_bb100_import_log on bb100_import_log;
drop policy if exists allow_bb100_raw_rows on bb100_raw_rows;
drop policy if exists allow_bb100_ai_decisions on bb100_ai_decisions;
drop policy if exists allow_bb100_cost_rules on bb100_cost_rules;
drop policy if exists allow_bb100_settings on bb100_settings;

create policy allow_bb100_report_files on bb100_report_files for all using (true) with check (true);
create policy allow_bb100_import_log on bb100_import_log for all using (true) with check (true);
create policy allow_bb100_raw_rows on bb100_raw_rows for all using (true) with check (true);
create policy allow_bb100_ai_decisions on bb100_ai_decisions for all using (true) with check (true);
create policy allow_bb100_cost_rules on bb100_cost_rules for all using (true) with check (true);
create policy allow_bb100_settings on bb100_settings for all using (true) with check (true);

notify pgrst, 'reload schema';
