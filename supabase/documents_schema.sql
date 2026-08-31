-- ============================================================================
-- QMS Rapid — Document Control
-- Run this in the Supabase SQL Editor (same place as schema.sql earlier).
-- Safe to run once your foundation schema.sql has already been run.
-- ============================================================================

-- 1. DOCUMENTS ------------------------------------------------------------------
-- One row per controlled document (an SOP, work instruction, form, policy...).
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  document_number text,
  category text not null default 'other'
    check (category in ('policy', 'procedure', 'work_instruction', 'form', 'other')),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'archived')),
  current_version_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. DOCUMENT VERSIONS ------------------------------------------------------------
-- One row per uploaded file. A document can have many versions over time;
-- old ones are kept, never deleted, so there's a full history.
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  -- Duplicated from documents.company_id so security rules below are simple
  -- and fast (no need to join back to documents to check the company).
  company_id uuid not null references public.companies (id) on delete cascade,
  version_number int not null,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  unique (document_id, version_number)
);

alter table public.documents
  drop constraint if exists documents_current_version_fk,
  add constraint documents_current_version_fk
    foreign key (current_version_id) references public.document_versions (id) on delete set null;

create index if not exists documents_company_id_idx on public.documents (company_id);
create index if not exists document_versions_document_id_idx on public.document_versions (document_id);
create index if not exists document_versions_company_id_idx on public.document_versions (company_id);

-- 3. ROW LEVEL SECURITY -----------------------------------------------------------
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;

drop policy if exists "documents_select_own_company" on public.documents;
create policy "documents_select_own_company"
  on public.documents for select
  using (company_id = public.current_company_id());

drop policy if exists "documents_insert_own_company" on public.documents;
create policy "documents_insert_own_company"
  on public.documents for insert
  with check (company_id = public.current_company_id());

drop policy if exists "documents_update_own_company" on public.documents;
create policy "documents_update_own_company"
  on public.documents for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "documents_delete_own_company" on public.documents;
create policy "documents_delete_own_company"
  on public.documents for delete
  using (company_id = public.current_company_id());

drop policy if exists "document_versions_select_own_company" on public.document_versions;
create policy "document_versions_select_own_company"
  on public.document_versions for select
  using (company_id = public.current_company_id());

drop policy if exists "document_versions_insert_own_company" on public.document_versions;
create policy "document_versions_insert_own_company"
  on public.document_versions for insert
  with check (company_id = public.current_company_id());

-- 4. KEEP updated_at CURRENT ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute procedure public.set_updated_at();

-- 5. STORAGE BUCKET FOR FILES ----------------------------------------------------
-- Private bucket — files are NOT publicly accessible by URL. Access is only
-- via short-lived "signed URLs" the app generates for logged-in users whose
-- company owns the file (enforced by the storage policies below).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Files are stored at paths like: {company_id}/{document_id}/v1-filename.pdf
-- These policies check that the first folder in the path matches the
-- logged-in user's own company — reusing the same helper function from
-- schema.sql.
drop policy if exists "documents_storage_select" on storage.objects;
create policy "documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "documents_storage_insert" on storage.objects;
create policy "documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "documents_storage_update" on storage.objects;
create policy "documents_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "documents_storage_delete" on storage.objects;
create policy "documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
