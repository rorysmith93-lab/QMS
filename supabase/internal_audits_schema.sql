-- ============================================================================
-- QMS Rapid — Internal Audits (ISO 9001 clause 9.2)
-- Run this in the Supabase SQL Editor, after non_conformances_schema.sql.
--
-- Two tables: internal_audits (the scheduled/completed audit itself) and
-- audit_findings (individual findings raised during an audit). A finding
-- that needs corrective action can be linked to a non-conformance, so the
-- existing NCR/CAPA workflow handles the follow-up rather than duplicating
-- it here.
-- ============================================================================

-- Per-company sequential audit numbers (AUD-0001, AUD-0002, ...), same
-- pattern as ncr_sequence in ncr_form_schema.sql.
alter table public.companies
  add column if not exists audit_sequence integer not null default 0;

create table if not exists public.internal_audits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  audit_number text,

  title text not null,
  process_area text,
  clause_reference text,
  lead_auditor text,
  scope text,

  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'closed')),
  planned_date date not null default current_date,
  actual_date date,

  summary text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.assign_audit_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seq integer;
begin
  if new.audit_number is null then
    update public.companies
    set audit_sequence = audit_sequence + 1
    where id = new.company_id
    returning audit_sequence into seq;

    new.audit_number := 'AUD-' || lpad(seq::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists internal_audits_assign_number on public.internal_audits;
create trigger internal_audits_assign_number
  before insert on public.internal_audits
  for each row execute procedure public.assign_audit_number();

create index if not exists internal_audits_company_id_idx on public.internal_audits (company_id);

alter table public.internal_audits enable row level security;

drop policy if exists "internal_audits_select_own_company" on public.internal_audits;
create policy "internal_audits_select_own_company"
  on public.internal_audits for select
  using (company_id = public.current_company_id());

drop policy if exists "internal_audits_insert_own_company" on public.internal_audits;
create policy "internal_audits_insert_own_company"
  on public.internal_audits for insert
  with check (company_id = public.current_company_id());

drop policy if exists "internal_audits_update_own_company" on public.internal_audits;
create policy "internal_audits_update_own_company"
  on public.internal_audits for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- No delete policy — audit records are retained as evidence for
-- certification, not removed. Mistakes get corrected via status/edits.

drop trigger if exists internal_audits_set_updated_at on public.internal_audits;
create trigger internal_audits_set_updated_at
  before update on public.internal_audits
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Findings raised during an audit.
-- ----------------------------------------------------------------------------
create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  audit_id uuid not null references public.internal_audits (id) on delete cascade,

  finding_type text not null default 'observation'
    check (finding_type in ('nonconformity', 'observation', 'opportunity_for_improvement')),
  clause_reference text,
  description text not null,
  evidence text,

  corrective_action_required boolean not null default false,
  linked_ncr_id uuid references public.non_conformances (id) on delete set null,

  status text not null default 'open' check (status in ('open', 'closed')),
  closed_date date,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audit_findings_audit_id_idx on public.audit_findings (audit_id);
create index if not exists audit_findings_company_id_idx on public.audit_findings (company_id);

alter table public.audit_findings enable row level security;

drop policy if exists "audit_findings_select_own_company" on public.audit_findings;
create policy "audit_findings_select_own_company"
  on public.audit_findings for select
  using (company_id = public.current_company_id());

drop policy if exists "audit_findings_insert_own_company" on public.audit_findings;
create policy "audit_findings_insert_own_company"
  on public.audit_findings for insert
  with check (company_id = public.current_company_id());

drop policy if exists "audit_findings_update_own_company" on public.audit_findings;
create policy "audit_findings_update_own_company"
  on public.audit_findings for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "audit_findings_delete_own_company" on public.audit_findings;
create policy "audit_findings_delete_own_company"
  on public.audit_findings for delete
  using (company_id = public.current_company_id());

drop trigger if exists audit_findings_set_updated_at on public.audit_findings;
create trigger audit_findings_set_updated_at
  before update on public.audit_findings
  for each row execute procedure public.set_updated_at();
