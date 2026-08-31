-- ============================================================================
-- QMS Rapid — Document authorization matrix (ISO 9001 clause 7.5.2/5.3)
-- Run this in the Supabase SQL Editor, after documents_schema.sql.
--
-- Two new tables, scoped per document CATEGORY (policy/procedure/work
-- instruction/form/other — same five values as documents.category):
--   document_category_settings — which workflow a category uses: a
--     document can go straight to Approved ("just_approve"), or has to
--     pass through a separate Check step first ("check_and_approve").
--   document_authorizations — who's allowed to do what for that
--     category: Author (create/upload), Checker, or Approver. These are
--     ranked (approver > checker > author), so an Approver can also
--     check/author, a Checker can also author.
--
-- IMPORTANT — permissive-until-configured: if a category has NO rows in
-- document_authorizations yet, every action on it is allowed for anyone
-- in the company. The matrix only starts restricting things once you've
-- actually assigned at least one person a level for that category — so
-- turning this feature on can never silently lock you out of your own
-- documents.
-- ============================================================================

create table if not exists public.document_category_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category text not null
    check (category in ('policy', 'procedure', 'work_instruction', 'form', 'other')),
  workflow_mode text not null default 'just_approve'
    check (workflow_mode in ('just_approve', 'check_and_approve')),
  unique (company_id, category)
);

create index if not exists document_category_settings_company_id_idx
  on public.document_category_settings (company_id);

alter table public.document_category_settings enable row level security;

drop policy if exists "document_category_settings_select_own_company" on public.document_category_settings;
create policy "document_category_settings_select_own_company"
  on public.document_category_settings for select
  using (company_id = public.current_company_id());

drop policy if exists "document_category_settings_insert_own_company" on public.document_category_settings;
create policy "document_category_settings_insert_own_company"
  on public.document_category_settings for insert
  with check (company_id = public.current_company_id());

drop policy if exists "document_category_settings_update_own_company" on public.document_category_settings;
create policy "document_category_settings_update_own_company"
  on public.document_category_settings for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "document_category_settings_delete_own_company" on public.document_category_settings;
create policy "document_category_settings_delete_own_company"
  on public.document_category_settings for delete
  using (company_id = public.current_company_id());

-- ----------------------------------------------------------------------------
create table if not exists public.document_authorizations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category text not null
    check (category in ('policy', 'procedure', 'work_instruction', 'form', 'other')),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  level text not null check (level in ('author', 'checker', 'approver')),
  created_at timestamptz not null default now(),
  unique (company_id, category, profile_id)
);

create index if not exists document_authorizations_company_id_idx
  on public.document_authorizations (company_id);

alter table public.document_authorizations enable row level security;

drop policy if exists "document_authorizations_select_own_company" on public.document_authorizations;
create policy "document_authorizations_select_own_company"
  on public.document_authorizations for select
  using (company_id = public.current_company_id());

drop policy if exists "document_authorizations_insert_own_company" on public.document_authorizations;
create policy "document_authorizations_insert_own_company"
  on public.document_authorizations for insert
  with check (company_id = public.current_company_id());

drop policy if exists "document_authorizations_update_own_company" on public.document_authorizations;
create policy "document_authorizations_update_own_company"
  on public.document_authorizations for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "document_authorizations_delete_own_company" on public.document_authorizations;
create policy "document_authorizations_delete_own_company"
  on public.document_authorizations for delete
  using (company_id = public.current_company_id());

-- ----------------------------------------------------------------------------
-- Extend documents with the Check/Approve trail, and a 'checked' status
-- for the mid-point of the two-step workflow.
-- ----------------------------------------------------------------------------
alter table public.documents add column if not exists checked_by uuid references public.profiles (id) on delete set null;
alter table public.documents add column if not exists checked_at timestamptz;
alter table public.documents add column if not exists approved_by uuid references public.profiles (id) on delete set null;
alter table public.documents add column if not exists approved_at timestamptz;

-- documents_status_check is the auto-generated name Postgres gave the
-- original inline, unnamed check constraint in documents_schema.sql —
-- drop that exact one before adding the replacement, same footgun as the
-- NCR status migration earlier.
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents
  add constraint documents_status_check
    check (status in ('draft', 'checked', 'approved', 'archived'));
