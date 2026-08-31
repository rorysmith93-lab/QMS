-- ============================================================================
-- QMS Rapid — Company branding (colour + logo)
-- Run this in the Supabase SQL Editor, same as the earlier schema files.
-- ============================================================================

alter table public.companies
  add column if not exists primary_color text not null default '#2563eb',
  add column if not exists logo_path text;

alter table public.companies
  drop constraint if exists companies_primary_color_format;
alter table public.companies
  add constraint companies_primary_color_format
    check (primary_color ~* '^#[0-9a-f]{6}$');

-- Companies could already be read (companies_select_own from schema.sql),
-- but not changed. This lets a logged-in user update their own company's
-- name/colour from the Settings page.
drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own"
  on public.companies for update
  using (id = public.current_company_id())
  with check (id = public.current_company_id());

-- Logos are stored in their OWN public bucket (unlike documents, which are
-- private). A logo isn't sensitive information and needs to load instantly
-- in the page header without generating a signed URL on every request.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Anyone can VIEW logos (that's the point of a public bucket — no policy
-- needed for select). Only someone in the matching company can upload,
-- replace, or delete their own company's logo.
drop policy if exists "logos_storage_insert" on storage.objects;
create policy "logos_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "logos_storage_update" on storage.objects;
create policy "logos_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "logos_storage_delete" on storage.objects;
create policy "logos_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
