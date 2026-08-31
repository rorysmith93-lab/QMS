-- ============================================================================
-- QMS Rapid — Management Review (ISO 9001 clause 9.3)
-- Run this in the Supabase SQL Editor, after internal_audits_schema.sql.
--
-- One table covering the required inputs (9.3.2) and outputs (9.3.3) of a
-- management review. Objective performance data (open NCRs, audit results)
-- isn't duplicated here — the review page pulls it live from the existing
-- non_conformances/internal_audits tables so it can't go stale.
-- ============================================================================

alter table public.companies
  add column if not exists review_sequence integer not null default 0;

create table if not exists public.management_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  review_number text,

  title text not null,
  review_date date not null default current_date,
  attendees text,
  status text not null default 'planned' check (status in ('planned', 'completed')),

  -- Inputs — ISO 9001 clause 9.3.2 (a) through (f).
  previous_actions_status text,   -- (a) status of actions from previous reviews
  context_changes text,           -- (b) changes in internal/external issues
  customer_feedback text,         -- (c)(1) customer satisfaction & feedback
  objectives_performance text,    -- (c)(2) extent quality objectives were met
  nc_capa_summary text,           -- (c)(3)+(4) process performance, nonconformities/CAPA
  audit_summary text,             -- (c)(6) internal/external audit results
  resource_adequacy text,         -- (d) adequacy of resources
  risk_opportunity_effectiveness text, -- (e) effectiveness of risk/opportunity actions

  -- Outputs — ISO 9001 clause 9.3.3.
  improvement_opportunities text, -- also covers input (f)
  qms_changes_needed text,
  resource_needs text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.assign_review_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seq integer;
begin
  if new.review_number is null then
    update public.companies
    set review_sequence = review_sequence + 1
    where id = new.company_id
    returning review_sequence into seq;

    new.review_number := 'MR-' || lpad(seq::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists management_reviews_assign_number on public.management_reviews;
create trigger management_reviews_assign_number
  before insert on public.management_reviews
  for each row execute procedure public.assign_review_number();

create index if not exists management_reviews_company_id_idx on public.management_reviews (company_id);

alter table public.management_reviews enable row level security;

drop policy if exists "management_reviews_select_own_company" on public.management_reviews;
create policy "management_reviews_select_own_company"
  on public.management_reviews for select
  using (company_id = public.current_company_id());

drop policy if exists "management_reviews_insert_own_company" on public.management_reviews;
create policy "management_reviews_insert_own_company"
  on public.management_reviews for insert
  with check (company_id = public.current_company_id());

drop policy if exists "management_reviews_update_own_company" on public.management_reviews;
create policy "management_reviews_update_own_company"
  on public.management_reviews for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- No delete policy — review records are retained as certification evidence.

drop trigger if exists management_reviews_set_updated_at on public.management_reviews;
create trigger management_reviews_set_updated_at
  before update on public.management_reviews
  for each row execute procedure public.set_updated_at();
