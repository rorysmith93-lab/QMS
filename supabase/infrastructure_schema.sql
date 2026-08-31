-- ============================================================================
-- QMS Rapid — Infrastructure & Asset register (ISO 9001:2015 clause 7.1.3)
-- Run this in the Supabase SQL Editor, after equipment_calibration_schema.sql.
--
-- Closes a gap flagged by the ISO 9001 gap analysis: 7.1.5 (measuring
-- equipment calibration) was already covered, but 7.1.3's broader scope —
-- buildings, IT systems, production machinery, vehicles — had no tracking
-- at all. Lives inside the existing Equipment area as a second tab rather
-- than its own nav item — same underlying idea (a physical/IT asset with a
-- maintenance due date), and the nav bar didn't need another entry. Same
-- append-only maintenance-log pattern as equipment_calibrations.
-- ============================================================================

create table if not exists public.infrastructure_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  category text not null default 'production_equipment'
    check (category in ('building', 'production_equipment', 'it_system', 'vehicle', 'other')),
  location text,
  requires_maintenance boolean not null default true,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists infrastructure_assets_company_id_idx on public.infrastructure_assets (company_id);

alter table public.infrastructure_assets enable row level security;

drop policy if exists "infrastructure_assets_select_own_company" on public.infrastructure_assets;
create policy "infrastructure_assets_select_own_company"
  on public.infrastructure_assets for select
  using (company_id = public.current_company_id());

drop policy if exists "infrastructure_assets_insert_own_company" on public.infrastructure_assets;
create policy "infrastructure_assets_insert_own_company"
  on public.infrastructure_assets for insert
  with check (company_id = public.current_company_id());

drop policy if exists "infrastructure_assets_update_own_company" on public.infrastructure_assets;
create policy "infrastructure_assets_update_own_company"
  on public.infrastructure_assets for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "infrastructure_assets_delete_own_company" on public.infrastructure_assets;
create policy "infrastructure_assets_delete_own_company"
  on public.infrastructure_assets for delete
  using (company_id = public.current_company_id());

drop trigger if exists infrastructure_assets_set_updated_at on public.infrastructure_assets;
create trigger infrastructure_assets_set_updated_at
  before update on public.infrastructure_assets
  for each row execute procedure public.set_updated_at();

-- Append-only maintenance log, same shape/reasoning as equipment_calibrations:
-- a wrong entry is deleted and re-logged, never edited in place.
create table if not exists public.infrastructure_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  infrastructure_asset_id uuid not null references public.infrastructure_assets (id) on delete cascade,

  performed_date date not null default current_date,
  next_due_date date,
  performed_by text,
  notes text,

  -- Reuses the same private "certificates" bucket as calibration/training —
  -- a maintenance invoice or service report is the same kind of evidence.
  certificate_path text,
  certificate_name text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists infra_maintenance_company_id_idx on public.infrastructure_maintenance_records (company_id);
create index if not exists infra_maintenance_asset_id_idx on public.infrastructure_maintenance_records (infrastructure_asset_id);

alter table public.infrastructure_maintenance_records enable row level security;

drop policy if exists "infra_maintenance_select_own_company" on public.infrastructure_maintenance_records;
create policy "infra_maintenance_select_own_company"
  on public.infrastructure_maintenance_records for select
  using (company_id = public.current_company_id());

drop policy if exists "infra_maintenance_insert_own_company" on public.infrastructure_maintenance_records;
create policy "infra_maintenance_insert_own_company"
  on public.infrastructure_maintenance_records for insert
  with check (company_id = public.current_company_id());

drop policy if exists "infra_maintenance_delete_own_company" on public.infrastructure_maintenance_records;
create policy "infra_maintenance_delete_own_company"
  on public.infrastructure_maintenance_records for delete
  using (company_id = public.current_company_id());

-- No update policy — same reasoning as equipment_calibrations / training_records.

-- Bucket already created by equipment_calibration_schema.sql / training_records_schema.sql,
-- but safe to run in any order.
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;
