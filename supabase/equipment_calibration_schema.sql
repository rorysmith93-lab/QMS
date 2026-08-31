-- ============================================================================
-- QMS Rapid — Equipment Calibration tracking (ISO 9001 clause 7.1.5)
-- Run this in the Supabase SQL Editor, after equipment_and_ppe_schema.sql.
--
-- Adds a "requires calibration" flag to the existing equipment library, and
-- an append-only calibration log per item — same insert-only pattern as
-- training_records: a wrong entry is deleted and re-logged, not edited in
-- place, so there's never any doubt about what evidence was on file.
-- ============================================================================

alter table public.equipment_items
  add column if not exists requires_calibration boolean not null default false;

create table if not exists public.equipment_calibrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  equipment_item_id uuid not null references public.equipment_items (id) on delete cascade,

  calibrated_date date not null default current_date,
  next_due_date date,
  performed_by text,
  result text not null default 'pass' check (result in ('pass', 'fail', 'adjusted')),
  notes text,

  -- Reuses the same private "certificates" bucket as training records —
  -- same company-scoped access pattern, no reason to duplicate the bucket.
  certificate_path text,
  certificate_name text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists equipment_calibrations_company_id_idx on public.equipment_calibrations (company_id);
create index if not exists equipment_calibrations_item_id_idx on public.equipment_calibrations (equipment_item_id);

alter table public.equipment_calibrations enable row level security;

drop policy if exists "equipment_calibrations_select_own_company" on public.equipment_calibrations;
create policy "equipment_calibrations_select_own_company"
  on public.equipment_calibrations for select
  using (company_id = public.current_company_id());

drop policy if exists "equipment_calibrations_insert_own_company" on public.equipment_calibrations;
create policy "equipment_calibrations_insert_own_company"
  on public.equipment_calibrations for insert
  with check (company_id = public.current_company_id());

drop policy if exists "equipment_calibrations_delete_own_company" on public.equipment_calibrations;
create policy "equipment_calibrations_delete_own_company"
  on public.equipment_calibrations for delete
  using (company_id = public.current_company_id());

-- No update policy — see training_records_schema.sql for the reasoning.

-- Make sure the "certificates" bucket exists even if training_records_schema.sql
-- hasn't been run yet — safe to run in either order.
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;

drop policy if exists "certificates_storage_select" on storage.objects;
create policy "certificates_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "certificates_storage_insert" on storage.objects;
create policy "certificates_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "certificates_storage_delete" on storage.objects;
create policy "certificates_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
