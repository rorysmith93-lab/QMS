-- ============================================================================
-- QMS Rapid — Root cause analysis pop-out tools (5 Whys, Fishbone, 8D)
-- Run this in the Supabase SQL Editor, after non_conformances_schema.sql.
-- ============================================================================

create table if not exists public.root_cause_analyses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  non_conformance_id uuid references public.non_conformances (id) on delete cascade,
  type text not null check (type in ('five_whys', 'fishbone', 'eight_d')),
  -- Shape depends on `type` — see src/lib/root-cause-tools.ts for the
  -- TypeScript side of this contract:
  --   five_whys: { problem: string, whys: string[] }
  --   fishbone:  { problem: string, manpower: string[], machine: string[],
  --                material: string[], method: string[],
  --                measurement: string[], environment: string[] }
  --   eight_d:   { team: string, d2..d8: string }
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one of each tool type per non-conformance — reopening the same
-- tool edits the existing analysis rather than creating a duplicate.
create unique index if not exists root_cause_analyses_nc_type_idx
  on public.root_cause_analyses (non_conformance_id, type)
  where non_conformance_id is not null;

create index if not exists root_cause_analyses_company_id_idx
  on public.root_cause_analyses (company_id);

alter table public.root_cause_analyses enable row level security;

drop policy if exists "root_cause_analyses_select_own_company" on public.root_cause_analyses;
create policy "root_cause_analyses_select_own_company"
  on public.root_cause_analyses for select
  using (company_id = public.current_company_id());

drop policy if exists "root_cause_analyses_insert_own_company" on public.root_cause_analyses;
create policy "root_cause_analyses_insert_own_company"
  on public.root_cause_analyses for insert
  with check (company_id = public.current_company_id());

drop policy if exists "root_cause_analyses_update_own_company" on public.root_cause_analyses;
create policy "root_cause_analyses_update_own_company"
  on public.root_cause_analyses for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "root_cause_analyses_delete_own_company" on public.root_cause_analyses;
create policy "root_cause_analyses_delete_own_company"
  on public.root_cause_analyses for delete
  using (company_id = public.current_company_id());

-- Reuses the same set_updated_at() helper created in schema.sql.
drop trigger if exists root_cause_analyses_set_updated_at on public.root_cause_analyses;
create trigger root_cause_analyses_set_updated_at
  before update on public.root_cause_analyses
  for each row execute procedure public.set_updated_at();
