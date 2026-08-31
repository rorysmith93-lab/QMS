-- ============================================================================
-- QMS Rapid — auto-generated PDFs in Documents
-- Run this in the Supabase SQL Editor, after document_authorization_schema.sql,
-- work_instructions_schema.sql, and sop_schema.sql.
--
-- When a Work Instruction is published, a SOP is approved, or a new Quality
-- Policy version is published, a PDF is now generated automatically and
-- pushed into Documents as an "approved" entry — linked back to whichever
-- record produced it via generated_from_type/generated_from_id, so a later
-- revision updates the SAME Documents entry (adds a new version, old ones
-- stay in its version history) instead of creating a duplicate every time.
--
-- Quality Policy has no single persistent row across versions (each
-- version is its own insert), so its generated_from_id is the company_id
-- itself — there's only ever one "the quality policy" per company.
-- ============================================================================

alter table public.documents add column if not exists generated_from_type text;
alter table public.documents add column if not exists generated_from_id uuid;

alter table public.documents drop constraint if exists documents_generated_from_type_check;
alter table public.documents
  add constraint documents_generated_from_type_check
    check (generated_from_type is null or generated_from_type in ('work_instruction', 'sop', 'quality_policy'));

-- One linked Documents entry per source record — lets the sync logic find
-- "the" entry to add a new version to, and stops a race from ever creating
-- two.
create unique index if not exists documents_generated_from_unique
  on public.documents (generated_from_type, generated_from_id)
  where generated_from_type is not null;
