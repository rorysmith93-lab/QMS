-- ============================================================================
-- QMS Rapid — Risk & Opportunity Register (ISO 9001:2015 clause 6.1)
-- Run this in the Supabase SQL Editor.
--
-- Closes a gap flagged by the ISO 9001 gap analysis: clause 6.1 ("actions
-- to address risks and opportunities") was previously only captured as a
-- one-line narrative field inside Management Review, with no standing
-- place to log a risk the moment it's identified, own it, and track it to
-- closure between reviews. This is that place — Management Review's
-- existing "risk_opportunity_effectiveness" field is untouched and still
-- works exactly as before, this just gives it something real to point at.
-- ============================================================================

create table if not exists public.quality_risks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  description text,
  -- Clause 6.1 explicitly covers BOTH — a risk to mitigate and an
  -- opportunity to pursue are treated as the same kind of planning item,
  -- just opposite in direction.
  type text not null default 'risk' check (type in ('risk', 'opportunity')),
  likelihood text check (likelihood in ('low', 'medium', 'high')),
  impact text check (impact in ('low', 'medium', 'high')),
  mitigating_action text,
  owner uuid references public.profiles (id) on delete set null,
  review_date date,
  status text not null default 'open' check (status in ('open', 'mitigating', 'closed')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quality_risks_company_id_idx on public.quality_risks (company_id);

alter table public.quality_risks enable row level security;

drop policy if exists "quality_risks_select_own_company" on public.quality_risks;
create policy "quality_risks_select_own_company"
  on public.quality_risks for select
  using (company_id = public.current_company_id());

drop policy if exists "quality_risks_insert_own_company" on public.quality_risks;
create policy "quality_risks_insert_own_company"
  on public.quality_risks for insert
  with check (company_id = public.current_company_id());

drop policy if exists "quality_risks_update_own_company" on public.quality_risks;
create policy "quality_risks_update_own_company"
  on public.quality_risks for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "quality_risks_delete_own_company" on public.quality_risks;
create policy "quality_risks_delete_own_company"
  on public.quality_risks for delete
  using (company_id = public.current_company_id());

-- Reuses the same set_updated_at() helper created in schema.sql.
drop trigger if exists quality_risks_set_updated_at on public.quality_risks;
create trigger quality_risks_set_updated_at
  before update on public.quality_risks
  for each row execute procedure public.set_updated_at();
