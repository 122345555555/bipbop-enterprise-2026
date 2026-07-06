-- BipBop v14 Report Importer
create extension if not exists pgcrypto;

create table if not exists bb14_import_log (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  file_name text,
  row_count integer default 0,
  headers jsonb default '[]'::jsonb,
  imported_at timestamptz default now()
);

create table if not exists bb14_raw_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  file_name text,
  row_index integer,
  row_data jsonb not null,
  imported_at timestamptz default now()
);

create index if not exists idx_bb14_raw_reports_type on bb14_raw_reports(report_type);
create index if not exists idx_bb14_raw_reports_file on bb14_raw_reports(file_name);
create index if not exists idx_bb14_import_log_type on bb14_import_log(report_type);

alter table bb14_import_log enable row level security;
alter table bb14_raw_reports enable row level security;

drop policy if exists allow_bb14_import_log on bb14_import_log;
drop policy if exists allow_bb14_raw_reports on bb14_raw_reports;

create policy allow_bb14_import_log on bb14_import_log for all using (true) with check (true);
create policy allow_bb14_raw_reports on bb14_raw_reports for all using (true) with check (true);

notify pgrst, 'reload schema';
