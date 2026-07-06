-- BipBop Enterprise 6.0 Scalable Importer
create extension if not exists pgcrypto;

create table if not exists bb60_import_log (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  file_name text,
  row_count integer default 0,
  headers jsonb default '[]'::jsonb,
  fingerprint text,
  is_duplicate boolean default false,
  source jsonb default '{}'::jsonb,
  imported_at timestamptz default now()
);

create table if not exists bb60_raw_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  file_name text,
  row_index integer,
  row_data jsonb not null,
  fingerprint text,
  source jsonb default '{}'::jsonb,
  imported_at timestamptz default now()
);

create table if not exists bb60_settings (
  id text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_bb60_raw_reports_type on bb60_raw_reports(report_type);
create index if not exists idx_bb60_raw_reports_fingerprint on bb60_raw_reports(fingerprint);
create index if not exists idx_bb60_import_log_type on bb60_import_log(report_type);
create index if not exists idx_bb60_import_log_fingerprint on bb60_import_log(fingerprint);

alter table bb60_import_log enable row level security;
alter table bb60_raw_reports enable row level security;
alter table bb60_settings enable row level security;

drop policy if exists allow_bb60_import_log on bb60_import_log;
drop policy if exists allow_bb60_raw_reports on bb60_raw_reports;
drop policy if exists allow_bb60_settings on bb60_settings;

create policy allow_bb60_import_log on bb60_import_log for all using (true) with check (true);
create policy allow_bb60_raw_reports on bb60_raw_reports for all using (true) with check (true);
create policy allow_bb60_settings on bb60_settings for all using (true) with check (true);

notify pgrst, 'reload schema';
