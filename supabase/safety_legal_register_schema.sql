-- ============================================================================
-- Safety Management System (SMS) — Legal & Regulatory Register (ISO 45001
-- clause 6.1.3 / 9.1.2)
-- Run this in the Supabase SQL Editor, after schema.sql.
-- ============================================================================

-- 1. LEGAL REGISTER ENTRIES ------------------------------------------------------
create table if not exists public.legal_register_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  title text not null,
  jurisdiction text,
  regulator text,
  reference_number text,
  description text,
  category text not null default 'other'
    check (category in ('osha_hse', 'environmental', 'industry_code', 'local', 'other')),
  status text not null default 'in_progress'
    check (status in ('compliant', 'non_compliant', 'in_progress', 'not_applicable')),

  owner uuid references public.profiles (id) on delete set null,
  last_reviewed_date date,
  -- Review-due badge, same dateStatus() mechanism as everything else that
  -- tracks a "valid until" date — no scheduled job involved.
  next_review_date date,

  linked_safety_document_id uuid references public.safety_documents (id) on delete set null,
  notes text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_register_entries_company_id_idx on public.legal_register_entries (company_id);

alter table public.legal_register_entries enable row level security;

drop policy if exists "legal_register_entries_select_own_company" on public.legal_register_entries;
create policy "legal_register_entries_select_own_company"
  on public.legal_register_entries for select
  using (company_id = public.current_company_id());

drop policy if exists "legal_register_entries_insert_own_company" on public.legal_register_entries;
create policy "legal_register_entries_insert_own_company"
  on public.legal_register_entries for insert
  with check (company_id = public.current_company_id());

drop policy if exists "legal_register_entries_update_own_company" on public.legal_register_entries;
create policy "legal_register_entries_update_own_company"
  on public.legal_register_entries for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "legal_register_entries_delete_own_company" on public.legal_register_entries;
create policy "legal_register_entries_delete_own_company"
  on public.legal_register_entries for delete
  using (company_id = public.current_company_id());

drop trigger if exists legal_register_entries_set_updated_at on public.legal_register_entries;
create trigger legal_register_entries_set_updated_at
  before update on public.legal_register_entries
  for each row execute procedure public.set_updated_at();

-- 2. COMPLIANCE CHECKS (clause 9.1.2 periodic legal-compliance evaluation) ------
-- A check can stand alone (a general periodic compliance sweep) or be tied
-- to one register entry. `checklist` holds the individual items answered:
-- [{ item: string, result: 'pass'|'fail'|'na', notes: string }].
create table if not exists public.legal_compliance_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  legal_register_entry_id uuid references public.legal_register_entries (id) on delete cascade,

  title text not null,
  checklist jsonb not null default '[]'::jsonb,
  overall_result text not null default 'pass' check (overall_result in ('pass', 'fail')),

  performed_by uuid references public.profiles (id) on delete set null,
  performed_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists legal_compliance_checks_company_id_idx on public.legal_compliance_checks (company_id);
create index if not exists legal_compliance_checks_entry_id_idx on public.legal_compliance_checks (legal_register_entry_id);

alter table public.legal_compliance_checks enable row level security;

drop policy if exists "legal_compliance_checks_select_own_company" on public.legal_compliance_checks;
create policy "legal_compliance_checks_select_own_company"
  on public.legal_compliance_checks for select
  using (company_id = public.current_company_id());

drop policy if exists "legal_compliance_checks_insert_own_company" on public.legal_compliance_checks;
create policy "legal_compliance_checks_insert_own_company"
  on public.legal_compliance_checks for insert
  with check (company_id = public.current_company_id());

drop policy if exists "legal_compliance_checks_delete_own_company" on public.legal_compliance_checks;
create policy "legal_compliance_checks_delete_own_company"
  on public.legal_compliance_checks for delete
  using (company_id = public.current_company_id());

-- No update policy — like training records, a mistaken check gets deleted
-- and re-logged rather than edited in place, so there's always an honest
-- record of what was actually checked and when.
