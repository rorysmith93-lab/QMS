-- ============================================================================
-- QMS Rapid — "Read & understood" attestations (ISO 9001:2015 clause 7.3)
-- Run this in the Supabase SQL Editor, after documents_schema.sql,
-- sop_schema.sql, work_instruction_publishing_schema.sql, and
-- quality_policy_schema.sql.
--
-- Closes a gap flagged by the ISO 9001 gap analysis: the policy/procedures
-- were visible, and training was tracked, but nothing tied a specific
-- person to having acknowledged a specific VERSION of a specific
-- document. Four tables, not one polymorphic one — same choice as Change
-- Control's junction tables — each pointing at the real "this exact
-- version" row for its content type:
--   document_attestations           -> document_versions
--   sop_attestations                -> sop_versions
--   work_instruction_attestations   -> work_instruction_versions
--   quality_policy_attestations     -> quality_policies (each row already
--                                      IS a version, see quality_policy_schema.sql)
--
-- Insert-only, no update or delete — an attestation is a permanent record
-- of what was acknowledged and when, same reasoning as document_versions
-- itself. If a document is revised, the old attestation stays on record
-- against the OLD version; it simply stops counting as "current" once a
-- newer version exists, which is exactly the point.
-- ============================================================================

create table if not exists public.document_attestations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  document_version_id uuid not null references public.document_versions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  attested_at timestamptz not null default now(),
  unique (document_version_id, profile_id)
);

create table if not exists public.sop_attestations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  sop_version_id uuid not null references public.sop_versions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  attested_at timestamptz not null default now(),
  unique (sop_version_id, profile_id)
);

create table if not exists public.work_instruction_attestations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  work_instruction_version_id uuid not null references public.work_instruction_versions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  attested_at timestamptz not null default now(),
  unique (work_instruction_version_id, profile_id)
);

create table if not exists public.quality_policy_attestations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  quality_policy_id uuid not null references public.quality_policies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  attested_at timestamptz not null default now(),
  unique (quality_policy_id, profile_id)
);

create index if not exists document_attestations_version_idx on public.document_attestations (document_version_id);
create index if not exists sop_attestations_version_idx on public.sop_attestations (sop_version_id);
create index if not exists work_instruction_attestations_version_idx on public.work_instruction_attestations (work_instruction_version_id);
create index if not exists quality_policy_attestations_policy_idx on public.quality_policy_attestations (quality_policy_id);

alter table public.document_attestations enable row level security;
alter table public.sop_attestations enable row level security;
alter table public.work_instruction_attestations enable row level security;
alter table public.quality_policy_attestations enable row level security;

-- Same select/insert-only policy shape for all four — company-scoped,
-- exactly like every other table here. The server action is what sets
-- profile_id to the CALLER's own id (never trusted from client input),
-- same convention as created_by everywhere else in this app.
drop policy if exists "document_attestations_select_own_company" on public.document_attestations;
create policy "document_attestations_select_own_company"
  on public.document_attestations for select
  using (company_id = public.current_company_id());
drop policy if exists "document_attestations_insert_own_company" on public.document_attestations;
create policy "document_attestations_insert_own_company"
  on public.document_attestations for insert
  with check (company_id = public.current_company_id());

drop policy if exists "sop_attestations_select_own_company" on public.sop_attestations;
create policy "sop_attestations_select_own_company"
  on public.sop_attestations for select
  using (company_id = public.current_company_id());
drop policy if exists "sop_attestations_insert_own_company" on public.sop_attestations;
create policy "sop_attestations_insert_own_company"
  on public.sop_attestations for insert
  with check (company_id = public.current_company_id());

drop policy if exists "work_instruction_attestations_select_own_company" on public.work_instruction_attestations;
create policy "work_instruction_attestations_select_own_company"
  on public.work_instruction_attestations for select
  using (company_id = public.current_company_id());
drop policy if exists "work_instruction_attestations_insert_own_company" on public.work_instruction_attestations;
create policy "work_instruction_attestations_insert_own_company"
  on public.work_instruction_attestations for insert
  with check (company_id = public.current_company_id());

drop policy if exists "quality_policy_attestations_select_own_company" on public.quality_policy_attestations;
create policy "quality_policy_attestations_select_own_company"
  on public.quality_policy_attestations for select
  using (company_id = public.current_company_id());
drop policy if exists "quality_policy_attestations_insert_own_company" on public.quality_policy_attestations;
create policy "quality_policy_attestations_insert_own_company"
  on public.quality_policy_attestations for insert
  with check (company_id = public.current_company_id());
