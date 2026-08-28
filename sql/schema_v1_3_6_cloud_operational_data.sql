-- BipBop Enterprise 2026 v1.3.6 - dati operativi cloud autorevoli
-- Eseguire una sola volta nel SQL Editor di Supabase.
-- Non modifica le tabelle bb100_report_files, bb100_raw_rows o bb100_import_log.

create extension if not exists pgcrypto;

create table if not exists bb100_operational_data (
  dataset text not null check (dataset in ('economic_rules','product_costs','competitors','manual_sales','fba_items')),
  record_key text not null,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'app',
  migration_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (dataset, record_key)
);

create table if not exists bb100_operational_backups (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  reason text not null,
  snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists bb100_operational_migrations (
  id uuid primary key default gen_random_uuid(),
  source_fingerprint text not null unique,
  source_name text not null default 'bb100_rules',
  source_snapshot jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

create index if not exists idx_bb100_operational_data_updated
  on bb100_operational_data(dataset, updated_at desc) where deleted_at is null;
create index if not exists idx_bb100_operational_backups_operation
  on bb100_operational_backups(operation_id);

alter table bb100_operational_data enable row level security;
alter table bb100_operational_backups enable row level security;
alter table bb100_operational_migrations enable row level security;

drop policy if exists allow_bb100_operational_data on bb100_operational_data;
drop policy if exists allow_bb100_operational_backups on bb100_operational_backups;
drop policy if exists allow_bb100_operational_migrations on bb100_operational_migrations;
create policy allow_bb100_operational_data on bb100_operational_data for all using (true) with check (true);
create policy allow_bb100_operational_backups on bb100_operational_backups for all using (true) with check (true);
create policy allow_bb100_operational_migrations on bb100_operational_migrations for all using (true) with check (true);

create or replace function bb100_snapshot_rows(p_snapshot jsonb)
returns table(dataset text, record_key text, payload jsonb)
language sql immutable as $$
  select 'economic_rules', 'rules',
    coalesce(p_snapshot, '{}'::jsonb) - 'productCosts' - 'competitors' - 'manualSales' - 'fbaItems'
  union all
  select 'product_costs', key, value
    from jsonb_each(coalesce(p_snapshot->'productCosts', '{}'::jsonb))
  union all
  select 'competitors', coalesce(nullif(value->>'id',''), nullif(value->>'domain',''), md5(value::text)), value
    from jsonb_array_elements(coalesce(p_snapshot->'competitors', '[]'::jsonb))
  union all
  select 'manual_sales', coalesce(nullif(value->>'id',''), md5(value::text)), value
    from jsonb_array_elements(coalesce(p_snapshot->'manualSales', '[]'::jsonb))
  union all
  select 'fba_items', coalesce(nullif(value->>'id',''), nullif(upper(value->>'asin'),''), md5(value::text)), value
    from jsonb_array_elements(coalesce(p_snapshot->'fbaItems', '[]'::jsonb));
$$;

create or replace function bb100_migrate_operational_snapshot(
  p_snapshot jsonb,
  p_fingerprint text,
  p_source text default 'Mac ufficio / bb100_rules'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_migration_id uuid;
  v_existing jsonb;
  v_summary jsonb;
begin
  select summary into v_existing
    from bb100_operational_migrations
    where source_fingerprint = p_fingerprint and status = 'completed';
  if v_existing is not null then
    return v_existing || jsonb_build_object('idempotent', true);
  end if;

  v_migration_id := gen_random_uuid();
  insert into bb100_operational_backups(operation_id, reason, snapshot)
  select v_migration_id, 'backup pre-migrazione ' || p_source,
    coalesce(jsonb_agg(to_jsonb(d) order by d.dataset, d.record_key), '[]'::jsonb)
  from bb100_operational_data d where d.deleted_at is null;

  insert into bb100_operational_data(dataset, record_key, payload, source, migration_id, deleted_at, updated_at)
  select r.dataset, r.record_key, r.payload, p_source, v_migration_id, null, now()
  from (
    select distinct on (dataset, record_key) dataset, record_key, payload
    from bb100_snapshot_rows(p_snapshot)
    order by dataset, record_key
  ) r
  on conflict (dataset, record_key) do update set
    payload = excluded.payload,
    source = excluded.source,
    migration_id = excluded.migration_id,
    deleted_at = null,
    updated_at = now();

  update bb100_operational_data d set deleted_at = now(), updated_at = now(), migration_id = v_migration_id
  where d.deleted_at is null
    and d.dataset in ('economic_rules','product_costs','competitors','manual_sales','fba_items')
    and not exists (
      select 1 from bb100_snapshot_rows(p_snapshot) r
      where r.dataset = d.dataset and r.record_key = d.record_key
    );

  select jsonb_build_object(
    'migrationId', v_migration_id,
    'fingerprint', p_fingerprint,
    'idempotent', false,
    'counts', coalesce(jsonb_object_agg(dataset, count), '{}'::jsonb)
  ) into v_summary
  from (
    select dataset, count(distinct record_key)::int as count from bb100_snapshot_rows(p_snapshot) group by dataset
  ) q;

  insert into bb100_operational_migrations(id, source_fingerprint, source_name, source_snapshot, summary)
  values (v_migration_id, p_fingerprint, p_source, p_snapshot, v_summary);
  return v_summary;
end;
$$;

create or replace function bb100_replace_operational_dataset(p_dataset text, p_records jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_operation_id uuid := gen_random_uuid();
  v_count int;
begin
  if p_dataset not in ('economic_rules','product_costs','competitors','manual_sales','fba_items') then
    raise exception 'Dataset operativo non valido: %', p_dataset;
  end if;
  if jsonb_typeof(coalesce(p_records,'[]'::jsonb)) <> 'array' then
    raise exception 'p_records deve essere un array JSON';
  end if;

  insert into bb100_operational_backups(operation_id, reason, snapshot)
  select v_operation_id, 'backup pre-scrittura ' || p_dataset,
    coalesce(jsonb_agg(to_jsonb(d) order by d.record_key), '[]'::jsonb)
  from bb100_operational_data d where d.dataset = p_dataset and d.deleted_at is null;

  insert into bb100_operational_data(dataset, record_key, payload, source, deleted_at, updated_at)
  select p_dataset, x->>'record_key', x->'payload', 'app', null, now()
  from jsonb_array_elements(p_records) x
  where coalesce(x->>'record_key','') <> ''
  on conflict (dataset, record_key) do update set
    payload = excluded.payload, source = 'app', deleted_at = null, updated_at = now();

  update bb100_operational_data d set deleted_at = now(), updated_at = now()
  where d.dataset = p_dataset and d.deleted_at is null
    and not exists (
      select 1 from jsonb_array_elements(p_records) x where x->>'record_key' = d.record_key
    );

  select count(*) into v_count from bb100_operational_data
    where dataset = p_dataset and deleted_at is null;
  return jsonb_build_object('operationId',v_operation_id,'dataset',p_dataset,'count',v_count,'updatedAt',now());
end;
$$;

grant execute on function bb100_migrate_operational_snapshot(jsonb,text,text) to anon, authenticated;
grant execute on function bb100_replace_operational_dataset(text,jsonb) to anon, authenticated;
grant select, insert, update, delete on bb100_operational_data to anon, authenticated;
grant select, insert on bb100_operational_backups to anon, authenticated;
grant select, insert on bb100_operational_migrations to anon, authenticated;

notify pgrst, 'reload schema';
