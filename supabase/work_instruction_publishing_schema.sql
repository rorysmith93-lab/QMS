-- ============================================================================
-- QMS Rapid — Work Instruction publishing (versions + PDF export support)
-- Run this in the Supabase SQL Editor, after work_instructions_schema.sql.
-- ============================================================================

create table if not exists public.work_instruction_versions (
  id uuid primary key default gen_random_uuid(),
  work_instruction_id uuid not null references public.work_instructions (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version_number integer not null,
  -- A full snapshot: the title/doc number at publish time, plus every
  -- step's text and its OWN copy of the step's photo (see the publish
  -- action) so this row never changes even if the draft is edited later.
  title text not null,
  document_number text,
  content jsonb not null default '[]'::jsonb,
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  unique (work_instruction_id, version_number)
);

alter table public.work_instructions
  add column if not exists current_published_version_id uuid;

alter table public.work_instructions
  drop constraint if exists work_instructions_current_published_version_fk;
alter table public.work_instructions
  add constraint work_instructions_current_published_version_fk
    foreign key (current_published_version_id)
    references public.work_instruction_versions (id) on delete set null;

create index if not exists work_instruction_versions_wi_id_idx
  on public.work_instruction_versions (work_instruction_id);
create index if not exists work_instruction_versions_company_id_idx
  on public.work_instruction_versions (company_id);

alter table public.work_instruction_versions enable row level security;

drop policy if exists "wi_versions_select_own_company" on public.work_instruction_versions;
create policy "wi_versions_select_own_company"
  on public.work_instruction_versions for select
  using (company_id = public.current_company_id());

-- Published versions are meant to be permanent records once created, same
-- as document_versions — so there are deliberately no update/delete
-- policies here, only insert (to publish) and select (to view).
drop policy if exists "wi_versions_insert_own_company" on public.work_instruction_versions;
create policy "wi_versions_insert_own_company"
  on public.work_instruction_versions for insert
  with check (company_id = public.current_company_id());
