-- BipBop Enterprise 3.0 Growth Engine
create extension if not exists pgcrypto;

create table if not exists bb30_import_log (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  file_name text,
  row_count integer default 0,
  headers jsonb default '[]'::jsonb,
  fingerprint text,
  is_duplicate boolean default false,
  period_start date,
  period_end date,
  imported_at timestamptz default now()
);

create table if not exists bb30_raw_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  file_name text,
  row_index integer,
  row_data jsonb not null,
  fingerprint text,
  imported_at timestamptz default now()
);

create table if not exists bb30_settings (
  id text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_bb30_raw_reports_type on bb30_raw_reports(report_type);
create index if not exists idx_bb30_raw_reports_file on bb30_raw_reports(file_name);
create index if not exists idx_bb30_import_log_type on bb30_import_log(report_type);
create index if not exists idx_bb30_import_log_fingerprint on bb30_import_log(fingerprint);

alter table bb30_import_log enable row level security;
alter table bb30_raw_reports enable row level security;
alter table bb30_settings enable row level security;

drop policy if exists allow_bb30_import_log on bb30_import_log;
drop policy if exists allow_bb30_raw_reports on bb30_raw_reports;
drop policy if exists allow_bb30_settings on bb30_settings;

create policy allow_bb30_import_log on bb30_import_log for all using (true) with check (true);
create policy allow_bb30_raw_reports on bb30_raw_reports for all using (true) with check (true);
create policy allow_bb30_settings on bb30_settings for all using (true) with check (true);

notify pgrst, 'reload schema';
