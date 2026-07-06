-- BipBop Enterprise 7.0 Final
create extension if not exists pgcrypto;

create table if not exists bb70_report_files (
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

create table if not exists bb70_import_log (
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

create table if not exists bb70_raw_rows (
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

create table if not exists bb70_ai_context (
  id uuid primary key default gen_random_uuid(),
  context_type text,
  context_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists bb70_settings (
  id text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_bb70_report_files_type on bb70_report_files(report_type);
create index if not exists idx_bb70_report_files_fingerprint on bb70_report_files(fingerprint);
create index if not exists idx_bb70_raw_rows_type on bb70_raw_rows(report_type);
create index if not exists idx_bb70_raw_rows_fingerprint on bb70_raw_rows(fingerprint);
create index if not exists idx_bb70_import_log_type on bb70_import_log(report_type);

alter table bb70_report_files enable row level security;
alter table bb70_import_log enable row level security;
alter table bb70_raw_rows enable row level security;
alter table bb70_ai_context enable row level security;
alter table bb70_settings enable row level security;

drop policy if exists allow_bb70_report_files on bb70_report_files;
drop policy if exists allow_bb70_import_log on bb70_import_log;
drop policy if exists allow_bb70_raw_rows on bb70_raw_rows;
drop policy if exists allow_bb70_ai_context on bb70_ai_context;
drop policy if exists allow_bb70_settings on bb70_settings;

create policy allow_bb70_report_files on bb70_report_files for all using (true) with check (true);
create policy allow_bb70_import_log on bb70_import_log for all using (true) with check (true);
create policy allow_bb70_raw_rows on bb70_raw_rows for all using (true) with check (true);
create policy allow_bb70_ai_context on bb70_ai_context for all using (true) with check (true);
create policy allow_bb70_settings on bb70_settings for all using (true) with check (true);

notify pgrst, 'reload schema';
