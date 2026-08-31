-- ============================================================================
-- Safety Management System (SMS) — Document Control
-- Run this in the Supabase SQL Editor, after schema.sql.
--
-- Deliberately a PARALLEL set of tables to documents/document_versions/
-- document_category_settings/document_authorizations, not a bolt-on to
-- them — QMS's `category` column is a hardcoded CHECK shared by three
-- live tables, so extending it for OH&S categories would mean migrating
-- QMS's existing document data/constraints just to add SMS. This keeps
-- SMS documents independently listable (matters if this ever ships as a
-- standalone product) while reusing the exact same version-control +
-- authorization-matrix design as QMS Documents.
-- ============================================================================

-- 1. SAFETY DOCUMENTS ---------------------------------------------------------
create table if not exists public.safety_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  document_number text,
  category text not null default 'other'
    check (category in ('ohs_policy', 'risk_assessment', 'procedure', 'permit_to_work', 'contractor_agreement', 'other')),
  status text not null default 'draft'
    check (status in ('draft', 'checked', 'approved', 'archived')),
  current_version_id uuid,
  -- Document expiry tracking: when this should next be reviewed. Rendered
  -- as a badge via dateStatus() (src/lib/dates.ts) — same "expiring soon"
  -- mechanism as training/calibration, nothing scheduled server-side.
  review_due_date date,
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. SAFETY DOCUMENT VERSIONS ---------------------------------------------------
create table if not exists public.safety_document_versions (
  id uuid primary key default gen_random_uuid(),
  safety_document_id uuid not null references public.safety_documents (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version_number int not null,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  unique (safety_document_id, version_number)
);

alter table public.safety_documents
  drop constraint if exists safety_documents_current_version_fk,
  add constraint safety_documents_current_version_fk
    foreign key (current_version_id) references public.safety_document_versions (id) on delete set null;

create index if not exists safety_documents_company_id_idx on public.safety_documents (company_id);
create index if not exists safety_document_versions_safety_document_id_idx on public.safety_document_versions (safety_document_id);
create index if not exists safety_document_versions_company_id_idx on public.safety_document_versions (company_id);

-- 3. AUTHORIZATION MATRIX (same design as document_authorization_schema.sql) ----
create table if not exists public.safety_document_category_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category text not null
    check (category in ('ohs_policy', 'risk_assessment', 'procedure', 'permit_to_work', 'contractor_agreement', 'other')),
  workflow_mode text not null default 'just_approve'
    check (workflow_mode in ('just_approve', 'check_and_approve')),
  unique (company_id, category)
);

create index if not exists safety_document_category_settings_company_id_idx
  on public.safety_document_category_settings (company_id);

create table if not exists public.safety_document_authorizations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category text not null
    check (category in ('ohs_policy', 'risk_assessment', 'procedure', 'permit_to_work', 'contractor_agreement', 'other')),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  level text not null check (level in ('author', 'checker', 'approver')),
  created_at timestamptz not null default now(),
  unique (company_id, category, profile_id)
);

create index if not exists safety_document_authorizations_company_id_idx
  on public.safety_document_authorizations (company_id);

-- 4. ROW LEVEL SECURITY -----------------------------------------------------------
alter table public.safety_documents enable row level security;
alter table public.safety_document_versions enable row level security;
alter table public.safety_document_category_settings enable row level security;
alter table public.safety_document_authorizations enable row level security;

drop policy if exists "safety_documents_select_own_company" on public.safety_documents;
create policy "safety_documents_select_own_company"
  on public.safety_documents for select
  using (company_id = public.current_company_id());

drop policy if exists "safety_documents_insert_own_company" on public.safety_documents;
create policy "safety_documents_insert_own_company"
  on public.safety_documents for insert
  with check (company_id = public.current_company_id());

drop policy if exists "safety_documents_update_own_company" on public.safety_documents;
create policy "safety_documents_update_own_company"
  on public.safety_documents for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "safety_documents_delete_own_company" on public.safety_documents;
create policy "safety_documents_delete_own_company"
  on public.safety_documents for delete
  using (company_id = public.current_company_id());

drop policy if exists "safety_document_versions_select_own_company" on public.safety_document_versions;
create policy "safety_document_versions_select_own_company"
  on public.safety_document_versions for select
  using (company_id = public.current_company_id());

drop policy if exists "safety_document_versions_insert_own_company" on public.safety_document_versions;
create policy "safety_document_versions_insert_own_company"
  on public.safety_document_versions for insert
  with check (company_id = public.current_company_id());

drop policy if exists "safety_document_category_settings_select_own_company" on public.safety_document_category_settings;
create policy "safety_document_category_settings_select_own_company"
  on public.safety_document_category_settings for select
  using (company_id = public.current_company_id());

drop policy if exists "safety_document_category_settings_insert_own_company" on public.safety_document_category_settings;
create policy "safety_document_category_settings_insert_own_company"
  on public.safety_document_category_settings for insert
  with check (company_id = public.current_company_id());

drop policy if exists "safety_document_category_settings_update_own_company" on public.safety_document_category_settings;
create policy "safety_document_category_settings_update_own_company"
  on public.safety_document_category_settings for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "safety_document_category_settings_delete_own_company" on public.safety_document_category_settings;
create policy "safety_document_category_settings_delete_own_company"
  on public.safety_document_category_settings for delete
  using (company_id = public.current_company_id());

drop policy if exists "safety_document_authorizations_select_own_company" on public.safety_document_authorizations;
create policy "safety_document_authorizations_select_own_company"
  on public.safety_document_authorizations for select
  using (company_id = public.current_company_id());

drop policy if exists "safety_document_authorizations_insert_own_company" on public.safety_document_authorizations;
create policy "safety_document_authorizations_insert_own_company"
  on public.safety_document_authorizations for insert
  with check (company_id = public.current_company_id());

drop policy if exists "safety_document_authorizations_update_own_company" on public.safety_document_authorizations;
create policy "safety_document_authorizations_update_own_company"
  on public.safety_document_authorizations for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "safety_document_authorizations_delete_own_company" on public.safety_document_authorizations;
create policy "safety_document_authorizations_delete_own_company"
  on public.safety_document_authorizations for delete
  using (company_id = public.current_company_id());

-- 5. KEEP updated_at CURRENT (reuses public.set_updated_at() from schema.sql) ----
drop trigger if exists safety_documents_set_updated_at on public.safety_documents;
create trigger safety_documents_set_updated_at
  before update on public.safety_documents
  for each row execute procedure public.set_updated_at();

-- 6. STORAGE BUCKET -----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('safety-documents', 'safety-documents', false)
on conflict (id) do nothing;

-- Files stored at {company_id}/{safety_document_id}/v1-filename.pdf — same
-- convention and same folder-based RLS check as the `documents` bucket.
drop policy if exists "safety_documents_storage_select" on storage.objects;
create policy "safety_documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "safety_documents_storage_insert" on storage.objects;
create policy "safety_documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "safety_documents_storage_update" on storage.objects;
create policy "safety_documents_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "safety_documents_storage_delete" on storage.objects;
create policy "safety_documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
