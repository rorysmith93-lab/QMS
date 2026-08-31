-- ============================================================================
-- QMS Rapid — SOP (Standard Operating Procedure) Builder
-- Run this in the Supabase SQL Editor, after document_authorization_schema.sql
-- and work_instructions_schema.sql.
--
-- SOPs get their own fixed-section builder (Purpose / Scope /
-- Responsibilities / Procedure / References) instead of being a free-form
-- file upload in Documents — that's what actually gives "controlling
-- format": every SOP has the same shape. Procedure steps can each
-- optionally link to a specific Work Instruction for the shop-floor detail.
--
-- No separate authorization system either — same as Work Instructions,
-- SOPs are gated by the existing document_category_settings /
-- document_authorizations matrix, reusing the 'procedure' category that
-- was already one of the five options there (Documents → Authorization →
-- Procedure now covers SOPs too).
-- ============================================================================

create table if not exists public.sops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  document_number text,
  purpose text,
  scope text,
  responsibilities text,
  -- Named reference_notes, not "references" — that's a reserved SQL
  -- keyword and would need quoting everywhere it's used.
  reference_notes text,
  status text not null default 'draft'
    check (status in ('draft', 'checked', 'approved', 'archived')),
  created_by uuid references public.profiles (id) on delete set null,
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sop_steps (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references public.sops (id) on delete cascade,
  -- Duplicated from sops.company_id, same reasoning as work_instruction_steps:
  -- keeps the RLS policies below simple and fast.
  company_id uuid not null references public.companies (id) on delete cascade,
  position integer not null,
  description text not null,
  -- Optional pointer to the Work Instruction with the shop-floor detail for
  -- this step. Set null (not cascade-deleted) if that work instruction is
  -- ever removed, so the step's own text survives.
  linked_work_instruction_id uuid references public.work_instructions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Immutable snapshots, taken only at the moment an approved SOP is revised
-- (see the reviseSop action) — the same instant Documents' "Create
-- revision" copies the current approved file before reopening a draft.
-- This is what lets someone keep editing an approved SOP's live fields
-- afterwards without silently losing what was actually approved.
create table if not exists public.sop_versions (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references public.sops (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version_number integer not null,
  title text not null,
  document_number text,
  purpose text,
  scope text,
  responsibilities text,
  reference_notes text,
  -- [{ position, description, linked_work_instruction_id, linked_work_instruction_title }]
  steps jsonb not null default '[]'::jsonb,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  snapshotted_by uuid references public.profiles (id) on delete set null,
  snapshotted_at timestamptz not null default now(),
  unique (sop_id, version_number)
);

create index if not exists sops_company_id_idx on public.sops (company_id);
create index if not exists sop_steps_sop_id_idx on public.sop_steps (sop_id);
create index if not exists sop_steps_company_id_idx on public.sop_steps (company_id);
create index if not exists sop_versions_sop_id_idx on public.sop_versions (sop_id);
create index if not exists sop_versions_company_id_idx on public.sop_versions (company_id);

alter table public.sops enable row level security;
alter table public.sop_steps enable row level security;
alter table public.sop_versions enable row level security;

drop policy if exists "sops_select_own_company" on public.sops;
create policy "sops_select_own_company"
  on public.sops for select
  using (company_id = public.current_company_id());

drop policy if exists "sops_insert_own_company" on public.sops;
create policy "sops_insert_own_company"
  on public.sops for insert
  with check (company_id = public.current_company_id());

drop policy if exists "sops_update_own_company" on public.sops;
create policy "sops_update_own_company"
  on public.sops for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "sops_delete_own_company" on public.sops;
create policy "sops_delete_own_company"
  on public.sops for delete
  using (company_id = public.current_company_id());

drop policy if exists "sop_steps_select_own_company" on public.sop_steps;
create policy "sop_steps_select_own_company"
  on public.sop_steps for select
  using (company_id = public.current_company_id());

drop policy if exists "sop_steps_insert_own_company" on public.sop_steps;
create policy "sop_steps_insert_own_company"
  on public.sop_steps for insert
  with check (company_id = public.current_company_id());

drop policy if exists "sop_steps_update_own_company" on public.sop_steps;
create policy "sop_steps_update_own_company"
  on public.sop_steps for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "sop_steps_delete_own_company" on public.sop_steps;
create policy "sop_steps_delete_own_company"
  on public.sop_steps for delete
  using (company_id = public.current_company_id());

drop policy if exists "sop_versions_select_own_company" on public.sop_versions;
create policy "sop_versions_select_own_company"
  on public.sop_versions for select
  using (company_id = public.current_company_id());

-- No update/delete policy — same reasoning as document_versions /
-- work_instruction_versions: once snapshotted, a version is permanent.
drop policy if exists "sop_versions_insert_own_company" on public.sop_versions;
create policy "sop_versions_insert_own_company"
  on public.sop_versions for insert
  with check (company_id = public.current_company_id());

-- Reuses the same set_updated_at() helper created in schema.sql.
drop trigger if exists sops_set_updated_at on public.sops;
create trigger sops_set_updated_at
  before update on public.sops
  for each row execute procedure public.set_updated_at();

drop trigger if exists sop_steps_set_updated_at on public.sop_steps;
create trigger sop_steps_set_updated_at
  before update on public.sop_steps
  for each row execute procedure public.set_updated_at();
