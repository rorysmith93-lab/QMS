-- ============================================================================
-- QMS Rapid — Non-Conformances & Corrective Actions (CAPA)
-- Run this in the Supabase SQL Editor, same as the earlier schema files.
-- ============================================================================

create table if not exists public.non_conformances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  title text not null,
  description text not null,
  source text not null default 'other'
    check (source in (
      'customer_complaint', 'internal_audit', 'inspection', 'process', 'supplier', 'other'
    )),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'closed')),

  -- Optional link back to Document Control, e.g. "this happened because
  -- Procedure X wasn't followed".
  related_document_id uuid references public.documents (id) on delete set null,

  assigned_to uuid references public.profiles (id) on delete set null,
  due_date date,

  -- Filled in as the investigation progresses.
  root_cause text,
  corrective_action text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists non_conformances_company_id_idx on public.non_conformances (company_id);
create index if not exists non_conformances_assigned_to_idx on public.non_conformances (assigned_to);

alter table public.non_conformances enable row level security;

drop policy if exists "non_conformances_select_own_company" on public.non_conformances;
create policy "non_conformances_select_own_company"
  on public.non_conformances for select
  using (company_id = public.current_company_id());

drop policy if exists "non_conformances_insert_own_company" on public.non_conformances;
create policy "non_conformances_insert_own_company"
  on public.non_conformances for insert
  with check (company_id = public.current_company_id());

drop policy if exists "non_conformances_update_own_company" on public.non_conformances;
create policy "non_conformances_update_own_company"
  on public.non_conformances for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "non_conformances_delete_own_company" on public.non_conformances;
create policy "non_conformances_delete_own_company"
  on public.non_conformances for delete
  using (company_id = public.current_company_id());

-- Reuses the same set_updated_at() helper created in schema.sql for
-- Document Control.
drop trigger if exists non_conformances_set_updated_at on public.non_conformances;
create trigger non_conformances_set_updated_at
  before update on public.non_conformances
  for each row execute procedure public.set_updated_at();
