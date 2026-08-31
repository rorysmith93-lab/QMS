-- ============================================================================
-- QMS Rapid — Context of the Organization (ISO 9001:2015 clauses 4.1–4.3)
-- Run this in the Supabase SQL Editor.
--
-- Closes the remaining clause 4 gaps flagged by the ISO 9001 gap analysis:
-- external/internal issues (4.1), interested parties (4.2), and the QMS
-- scope statement (4.3) had no dedicated place to live and be kept
-- current. Context and scope are combined into one versioned statement —
-- in practice almost every small manufacturer writes these as a single
-- document, and it mirrors exactly how quality_policies already works
-- (a running version history, no separate draft/approval workflow).
-- Interested parties get their own simple register instead, since that's
-- naturally a list rather than a statement.
-- ============================================================================

create table if not exists public.qms_context_scope (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer not null default 1,
  external_issues text,
  internal_issues text,
  scope_statement text,
  -- Clause 4.3 explicitly allows excluding requirements that don't apply
  -- (design and development is the most common one) — this is the
  -- correct, standard place to record that decision and why.
  exclusions text,
  effective_date date not null default current_date,
  approved_by text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists qms_context_scope_company_id_idx on public.qms_context_scope (company_id);

alter table public.qms_context_scope enable row level security;

drop policy if exists "qms_context_scope_select_own_company" on public.qms_context_scope;
create policy "qms_context_scope_select_own_company"
  on public.qms_context_scope for select
  using (company_id = public.current_company_id());

drop policy if exists "qms_context_scope_insert_own_company" on public.qms_context_scope;
create policy "qms_context_scope_insert_own_company"
  on public.qms_context_scope for insert
  with check (company_id = public.current_company_id());

-- No update/delete — same reasoning as quality_policies: each publish is
-- a new, permanent version rather than an edit to the last one.

create table if not exists public.interested_parties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  category text not null default 'other'
    check (category in ('customer', 'regulator', 'supplier', 'owner', 'employee', 'community', 'other')),
  needs_expectations text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interested_parties_company_id_idx on public.interested_parties (company_id);

alter table public.interested_parties enable row level security;

drop policy if exists "interested_parties_select_own_company" on public.interested_parties;
create policy "interested_parties_select_own_company"
  on public.interested_parties for select
  using (company_id = public.current_company_id());

drop policy if exists "interested_parties_insert_own_company" on public.interested_parties;
create policy "interested_parties_insert_own_company"
  on public.interested_parties for insert
  with check (company_id = public.current_company_id());

drop policy if exists "interested_parties_update_own_company" on public.interested_parties;
create policy "interested_parties_update_own_company"
  on public.interested_parties for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "interested_parties_delete_own_company" on public.interested_parties;
create policy "interested_parties_delete_own_company"
  on public.interested_parties for delete
  using (company_id = public.current_company_id());

drop trigger if exists interested_parties_set_updated_at on public.interested_parties;
create trigger interested_parties_set_updated_at
  before update on public.interested_parties
  for each row execute procedure public.set_updated_at();
