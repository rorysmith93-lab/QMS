-- ============================================================================
-- QMS Rapid — Supplier Register (ISO 9001:2015 clause 8.4)
-- Run this in the Supabase SQL Editor, after non_conformances_schema.sql
-- and ncr_form_schema.sql.
--
-- Closes a gap flagged by the ISO 9001 gap analysis: "Supplier Issue" was
-- already a valid NCR source, so supplier-caused problems were tracked —
-- but reactively, with no approved-supplier list and no evaluation
-- cadence. This adds that register, and links it to the NCR data that
-- already exists rather than duplicating it: non_conformances gets an
-- optional supplier_id, so a supplier's page can show every NCR raised
-- against them without re-entering anything.
-- ============================================================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  category text,
  contact_name text,
  contact_email text,
  contact_phone text,
  approval_status text not null default 'under_review'
    check (approval_status in ('approved', 'conditional', 'under_review', 'not_approved')),
  last_evaluated_date date,
  next_evaluation_date date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_company_id_idx on public.suppliers (company_id);

alter table public.suppliers enable row level security;

drop policy if exists "suppliers_select_own_company" on public.suppliers;
create policy "suppliers_select_own_company"
  on public.suppliers for select
  using (company_id = public.current_company_id());

drop policy if exists "suppliers_insert_own_company" on public.suppliers;
create policy "suppliers_insert_own_company"
  on public.suppliers for insert
  with check (company_id = public.current_company_id());

drop policy if exists "suppliers_update_own_company" on public.suppliers;
create policy "suppliers_update_own_company"
  on public.suppliers for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "suppliers_delete_own_company" on public.suppliers;
create policy "suppliers_delete_own_company"
  on public.suppliers for delete
  using (company_id = public.current_company_id());

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute procedure public.set_updated_at();

-- Optional link from an NCR back to the supplier that caused it — set null
-- (not cascade-deleted) if the supplier is ever removed, so the NCR's own
-- record survives intact.
alter table public.non_conformances
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

create index if not exists non_conformances_supplier_id_idx on public.non_conformances (supplier_id);
