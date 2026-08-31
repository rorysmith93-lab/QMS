-- ============================================================================
-- QMS Rapid — Quality Policy & Objectives (ISO 9001 clauses 5.2 and 6.2)
-- Run this in the Supabase SQL Editor, after management_reviews_schema.sql.
--
-- Two tables:
--   quality_policies   — the policy statement itself. Insert-only, like
--                         document_versions — publishing a new one adds a
--                         new version rather than overwriting history, so
--                         you can always show what the policy said on any
--                         given date.
--   quality_objectives — the measurable goals set to support that policy
--                         (clause 6.2 requires objectives to be consistent
--                         with it), tracked to completion over time.
-- ============================================================================

alter table public.companies
  add column if not exists policy_sequence integer not null default 0;

create table if not exists public.quality_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer,

  statement text not null,
  effective_date date not null default current_date,
  approved_by text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.assign_policy_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seq integer;
begin
  if new.version is null then
    update public.companies
    set policy_sequence = policy_sequence + 1
    where id = new.company_id
    returning policy_sequence into seq;

    new.version := seq;
  end if;
  return new;
end;
$$;

drop trigger if exists quality_policies_assign_version on public.quality_policies;
create trigger quality_policies_assign_version
  before insert on public.quality_policies
  for each row execute procedure public.assign_policy_version();

create index if not exists quality_policies_company_id_idx on public.quality_policies (company_id);

alter table public.quality_policies enable row level security;

drop policy if exists "quality_policies_select_own_company" on public.quality_policies;
create policy "quality_policies_select_own_company"
  on public.quality_policies for select
  using (company_id = public.current_company_id());

drop policy if exists "quality_policies_insert_own_company" on public.quality_policies;
create policy "quality_policies_insert_own_company"
  on public.quality_policies for insert
  with check (company_id = public.current_company_id());

-- No update/delete policy — each edit is published as a new version instead,
-- so the policy's history can't be silently rewritten.

-- ----------------------------------------------------------------------------
-- Quality objectives — the measurable goals tracked against the policy.
-- ----------------------------------------------------------------------------
create table if not exists public.quality_objectives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  title text not null,
  target text,
  owner uuid references public.profiles (id) on delete set null,
  target_date date,
  status text not null default 'not_started'
    check (status in ('not_started', 'on_track', 'at_risk', 'achieved', 'missed')),
  progress_notes text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quality_objectives_company_id_idx on public.quality_objectives (company_id);

alter table public.quality_objectives enable row level security;

drop policy if exists "quality_objectives_select_own_company" on public.quality_objectives;
create policy "quality_objectives_select_own_company"
  on public.quality_objectives for select
  using (company_id = public.current_company_id());

drop policy if exists "quality_objectives_insert_own_company" on public.quality_objectives;
create policy "quality_objectives_insert_own_company"
  on public.quality_objectives for insert
  with check (company_id = public.current_company_id());

drop policy if exists "quality_objectives_update_own_company" on public.quality_objectives;
create policy "quality_objectives_update_own_company"
  on public.quality_objectives for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "quality_objectives_delete_own_company" on public.quality_objectives;
create policy "quality_objectives_delete_own_company"
  on public.quality_objectives for delete
  using (company_id = public.current_company_id());

drop trigger if exists quality_objectives_set_updated_at on public.quality_objectives;
create trigger quality_objectives_set_updated_at
  before update on public.quality_objectives
  for each row execute procedure public.set_updated_at();
