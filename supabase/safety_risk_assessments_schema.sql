-- ============================================================================
-- Safety Management System (SMS) — Risk Assessment Builder (ISO 45001 HIRA)
-- Run this in the Supabase SQL Editor, after schema.sql, safety_documents_schema.sql,
-- and safety_incidents_schema.sql (for public.set_updated_at()).
--
-- Same "structured builder" shape as sop_schema.sql: a meta row
-- (risk_assessments), a relational child table of repeatable rows
-- (risk_assessment_hazards — one row per hazard, not JSONB), and an
-- immutable snapshot-on-revise table (risk_assessment_versions).
--
-- Authorization/versioning workflow reuses the EXISTING Safety Documents
-- matrix under the 'risk_assessment' category (already one of
-- SAFETY_DOCUMENT_CATEGORIES) — no new authorization tables here.
-- ============================================================================

-- 1. RISK ASSESSMENTS ------------------------------------------------------------
create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  title text not null,
  document_number text,
  area_or_process text,
  assessor text,
  assessment_date date not null default current_date,
  review_due_date date,

  status text not null default 'draft'
    check (status in ('draft', 'checked', 'approved', 'archived')),
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists risk_assessments_company_id_idx on public.risk_assessments (company_id);

alter table public.risk_assessments enable row level security;

drop policy if exists "risk_assessments_select_own_company" on public.risk_assessments;
create policy "risk_assessments_select_own_company"
  on public.risk_assessments for select
  using (company_id = public.current_company_id());

drop policy if exists "risk_assessments_insert_own_company" on public.risk_assessments;
create policy "risk_assessments_insert_own_company"
  on public.risk_assessments for insert
  with check (company_id = public.current_company_id());

drop policy if exists "risk_assessments_update_own_company" on public.risk_assessments;
create policy "risk_assessments_update_own_company"
  on public.risk_assessments for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "risk_assessments_delete_own_company" on public.risk_assessments;
create policy "risk_assessments_delete_own_company"
  on public.risk_assessments for delete
  using (company_id = public.current_company_id());

drop trigger if exists risk_assessments_set_updated_at on public.risk_assessments;
create trigger risk_assessments_set_updated_at
  before update on public.risk_assessments
  for each row execute procedure public.set_updated_at();

-- 2. HAZARDS ------------------------------------------------------------------
-- One row per hazard. Likelihood/severity are each 1-5 (a 5x5 matrix);
-- *_score are Postgres GENERATED columns — the product can never drift
-- from its own inputs, and it's directly queryable/sortable/exportable
-- with no application-level recomputation.
create table if not exists public.risk_assessment_hazards (
  id uuid primary key default gen_random_uuid(),
  risk_assessment_id uuid not null references public.risk_assessments (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  position integer not null,

  hazard_description text not null,
  who_might_be_harmed text,
  existing_controls text,

  initial_likelihood integer not null default 3 check (initial_likelihood between 1 and 5),
  initial_severity integer not null default 3 check (initial_severity between 1 and 5),
  initial_score integer generated always as (initial_likelihood * initial_severity) stored,

  additional_controls text,

  residual_likelihood integer not null default 1 check (residual_likelihood between 1 and 5),
  residual_severity integer not null default 1 check (residual_severity between 1 and 5),
  residual_score integer generated always as (residual_likelihood * residual_severity) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists risk_assessment_hazards_ra_id_idx on public.risk_assessment_hazards (risk_assessment_id);
create index if not exists risk_assessment_hazards_company_id_idx on public.risk_assessment_hazards (company_id);

alter table public.risk_assessment_hazards enable row level security;

drop policy if exists "risk_assessment_hazards_select_own_company" on public.risk_assessment_hazards;
create policy "risk_assessment_hazards_select_own_company"
  on public.risk_assessment_hazards for select
  using (company_id = public.current_company_id());

drop policy if exists "risk_assessment_hazards_insert_own_company" on public.risk_assessment_hazards;
create policy "risk_assessment_hazards_insert_own_company"
  on public.risk_assessment_hazards for insert
  with check (company_id = public.current_company_id());

drop policy if exists "risk_assessment_hazards_update_own_company" on public.risk_assessment_hazards;
create policy "risk_assessment_hazards_update_own_company"
  on public.risk_assessment_hazards for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "risk_assessment_hazards_delete_own_company" on public.risk_assessment_hazards;
create policy "risk_assessment_hazards_delete_own_company"
  on public.risk_assessment_hazards for delete
  using (company_id = public.current_company_id());

drop trigger if exists risk_assessment_hazards_set_updated_at on public.risk_assessment_hazards;
create trigger risk_assessment_hazards_set_updated_at
  before update on public.risk_assessment_hazards
  for each row execute procedure public.set_updated_at();

-- 3. VERSIONS (snapshot-on-revise, same shape/purpose as sop_versions) -------------
create table if not exists public.risk_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  risk_assessment_id uuid not null references public.risk_assessments (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version_number integer not null,

  title text not null,
  document_number text,
  area_or_process text,
  assessor text,
  assessment_date date,

  -- Flattened hazard rows as of the moment this was approved:
  -- [{ position, hazard_description, who_might_be_harmed, existing_controls,
  --    initial_likelihood, initial_severity, initial_score,
  --    additional_controls, residual_likelihood, residual_severity, residual_score }]
  hazards jsonb not null default '[]'::jsonb,

  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  snapshotted_by uuid references public.profiles (id) on delete set null,
  snapshotted_at timestamptz not null default now(),

  unique (risk_assessment_id, version_number)
);

create index if not exists risk_assessment_versions_ra_id_idx on public.risk_assessment_versions (risk_assessment_id);
create index if not exists risk_assessment_versions_company_id_idx on public.risk_assessment_versions (company_id);

alter table public.risk_assessment_versions enable row level security;

drop policy if exists "risk_assessment_versions_select_own_company" on public.risk_assessment_versions;
create policy "risk_assessment_versions_select_own_company"
  on public.risk_assessment_versions for select
  using (company_id = public.current_company_id());

drop policy if exists "risk_assessment_versions_insert_own_company" on public.risk_assessment_versions;
create policy "risk_assessment_versions_insert_own_company"
  on public.risk_assessment_versions for insert
  with check (company_id = public.current_company_id());

-- No update/delete policy — once snapshotted, a version is permanent,
-- same as sop_versions.

-- 4. LET SAFETY DOCUMENTS RECEIVE AUTO-GENERATED RISK ASSESSMENT PDFs --------------
-- Mirrors generated_documents_schema.sql's columns on the QMS `documents`
-- table, but on `safety_documents` — needed because syncGeneratedDocument()
-- only knows about QMS Documents, not Safety Documents (they're
-- deliberately separate tables, see safety_documents_schema.sql).
alter table public.safety_documents add column if not exists generated_from_type text;
alter table public.safety_documents add column if not exists generated_from_id uuid;

alter table public.safety_documents drop constraint if exists safety_documents_generated_from_type_check;
alter table public.safety_documents
  add constraint safety_documents_generated_from_type_check
    check (generated_from_type is null or generated_from_type in ('risk_assessment'));

create unique index if not exists safety_documents_generated_from_unique
  on public.safety_documents (generated_from_type, generated_from_id)
  where generated_from_type is not null;
