-- ============================================================================
-- QMS Rapid — Training & Competence records (ISO 9001 clause 7.2)
-- Run this in the Supabase SQL Editor, after quality_policy_schema.sql.
--
-- A straightforward append-only log: each row is one piece of evidence
-- that a specific person completed a specific piece of training. Whether
-- a record is still "valid" is computed from its expiry date rather than
-- stored, so it can never go stale. No update policy — mistakes get
-- deleted and re-logged rather than silently rewritten.
-- ============================================================================

create table if not exists public.training_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  -- Nullable so the record (and its history) survives if the person's
  -- account is ever removed — see profile-deletion note on other tables.
  profile_id uuid references public.profiles (id) on delete set null,

  training_title text not null,
  training_type text not null default 'other'
    check (training_type in ('induction', 'certification', 'refresher', 'external_course', 'other')),
  provider text,
  completed_date date not null default current_date,
  expiry_date date,
  notes text,

  -- The uploaded certificate/evidence file, if any — stored in the private
  -- "certificates" bucket below, same pattern as Document Control.
  certificate_path text,
  certificate_name text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.training_records add column if not exists certificate_path text;
alter table public.training_records add column if not exists certificate_name text;

create index if not exists training_records_company_id_idx on public.training_records (company_id);
create index if not exists training_records_profile_id_idx on public.training_records (profile_id);

alter table public.training_records enable row level security;

drop policy if exists "training_records_select_own_company" on public.training_records;
create policy "training_records_select_own_company"
  on public.training_records for select
  using (company_id = public.current_company_id());

drop policy if exists "training_records_insert_own_company" on public.training_records;
create policy "training_records_insert_own_company"
  on public.training_records for insert
  with check (company_id = public.current_company_id());

drop policy if exists "training_records_delete_own_company" on public.training_records;
create policy "training_records_delete_own_company"
  on public.training_records for delete
  using (company_id = public.current_company_id());

-- No update policy — a wrong entry is deleted and re-logged, not edited in
-- place, so there's never any ambiguity about what evidence was on file.

-- ----------------------------------------------------------------------------
-- Storage bucket for certificate/evidence uploads — private, same access
-- pattern as the "documents" bucket in documents_schema.sql: files live at
-- {company_id}/... paths and are only reachable via short-lived signed URLs
-- for logged-in users whose company owns the file.
-- ----------------------------------------------------------------------------
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
