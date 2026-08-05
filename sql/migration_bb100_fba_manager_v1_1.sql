-- BipBop Enterprise 2026 v1.1 - migrazione additiva FBA Manager
-- Non modifica né elimina tabelle, dati, calcoli o import esistenti.

create extension if not exists pgcrypto;

create table if not exists bb100_fba_asin_status (
  asin text primary key,
  title text default '',
  status text not null default 'Da preparare'
    check (status in ('Da preparare','In produzione','Pronto','Inviato','Ricevuto da Amazon','Attivo FBA')),
  status_changed_at timestamptz not null default now(),
  sent_at timestamptz,
  received_at timestamptz,
  active_at timestamptz,
  carrier text,
  tracking text,
  shipment_id text,
  packages integer check (packages is null or packages > 0),
  weight_kg numeric(10,2) check (weight_kg is null or weight_kg > 0),
  quantity_sent integer check (quantity_sent is null or quantity_sent > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bb100_fba_status_history (
  id uuid primary key default gen_random_uuid(),
  asin text not null references bb100_fba_asin_status(asin) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_bb100_fba_status on bb100_fba_asin_status(status);
create index if not exists idx_bb100_fba_history_asin_changed on bb100_fba_status_history(asin,changed_at desc);
create index if not exists idx_bb100_fba_shipment_id on bb100_fba_asin_status(shipment_id);

alter table bb100_fba_asin_status enable row level security;
alter table bb100_fba_status_history enable row level security;

drop policy if exists allow_bb100_fba_asin_status on bb100_fba_asin_status;
drop policy if exists allow_bb100_fba_status_history on bb100_fba_status_history;
create policy allow_bb100_fba_asin_status on bb100_fba_asin_status for all using (true) with check (true);
create policy allow_bb100_fba_status_history on bb100_fba_status_history for all using (true) with check (true);

create or replace function bb100_set_fba_status(
  p_asin text,
  p_title text,
  p_status text,
  p_metadata jsonb default '{}'::jsonb
)
returns setof bb100_fba_asin_status
language plpgsql
as $$
declare
  v_previous text;
  v_changed_at timestamptz := now();
begin
  if nullif(trim(p_asin),'') is null then
    raise exception 'ASIN obbligatorio';
  end if;
  if p_status not in ('Da preparare','In produzione','Pronto','Inviato','Ricevuto da Amazon','Attivo FBA') then
    raise exception 'Stato FBA non valido: %', p_status;
  end if;

  select status into v_previous
  from bb100_fba_asin_status
  where asin=p_asin
  for update;

  if v_previous is null then v_previous := 'Da preparare'; end if;

  insert into bb100_fba_asin_status (
    asin,title,status,status_changed_at,sent_at,received_at,active_at,
    carrier,tracking,shipment_id,packages,weight_kg,quantity_sent,updated_at
  ) values (
    trim(p_asin),coalesce(p_title,''),p_status,v_changed_at,
    case when p_status='Inviato' then nullif(p_metadata->>'sent_at','')::timestamptz end,
    case when p_status='Ricevuto da Amazon' then v_changed_at end,
    case when p_status='Attivo FBA' then v_changed_at end,
    nullif(p_metadata->>'carrier',''),nullif(p_metadata->>'tracking',''),nullif(p_metadata->>'shipment_id',''),
    nullif(p_metadata->>'packages','')::integer,nullif(p_metadata->>'weight_kg','')::numeric,
    nullif(p_metadata->>'quantity_sent','')::integer,v_changed_at
  )
  on conflict (asin) do update set
    title=case when excluded.title<>'' then excluded.title else bb100_fba_asin_status.title end,
    status=excluded.status,
    status_changed_at=case when bb100_fba_asin_status.status<>excluded.status then v_changed_at else bb100_fba_asin_status.status_changed_at end,
    sent_at=case when excluded.status='Inviato' then coalesce(excluded.sent_at,v_changed_at) else bb100_fba_asin_status.sent_at end,
    received_at=case when excluded.status='Ricevuto da Amazon' then coalesce(bb100_fba_asin_status.received_at,v_changed_at) else bb100_fba_asin_status.received_at end,
    active_at=case when excluded.status='Attivo FBA' then coalesce(bb100_fba_asin_status.active_at,v_changed_at) else bb100_fba_asin_status.active_at end,
    carrier=coalesce(excluded.carrier,bb100_fba_asin_status.carrier),
    tracking=coalesce(excluded.tracking,bb100_fba_asin_status.tracking),
    shipment_id=coalesce(excluded.shipment_id,bb100_fba_asin_status.shipment_id),
    packages=coalesce(excluded.packages,bb100_fba_asin_status.packages),
    weight_kg=coalesce(excluded.weight_kg,bb100_fba_asin_status.weight_kg),
    quantity_sent=coalesce(excluded.quantity_sent,bb100_fba_asin_status.quantity_sent),
    updated_at=v_changed_at;

  if v_previous<>p_status then
    insert into bb100_fba_status_history(asin,from_status,to_status,changed_at,metadata)
    values(trim(p_asin),v_previous,p_status,v_changed_at,coalesce(p_metadata,'{}'::jsonb));
  end if;

  return query select * from bb100_fba_asin_status where asin=trim(p_asin);
end;
$$;

grant execute on function bb100_set_fba_status(text,text,text,jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
