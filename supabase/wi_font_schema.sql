-- ============================================================================
-- QMS Rapid — Work Instruction font choice
-- Run this in the Supabase SQL Editor, after equipment_and_ppe_schema.sql.
--
-- Note: the company LOGO shown in the work instruction header doesn't need
-- a migration — it reuses the logo you already upload on the Settings
-- page (companies.logo_path), which was added in branding_schema.sql.
-- ============================================================================

alter table public.work_instructions
  add column if not exists font text not null default 'sans';
alter table public.work_instructions
  drop constraint if exists work_instructions_font_valid;
alter table public.work_instructions
  add constraint work_instructions_font_valid
    check (font in ('sans', 'serif', 'mono'));

alter table public.work_instruction_versions
  add column if not exists font text not null default 'sans';
alter table public.work_instruction_versions
  drop constraint if exists work_instruction_versions_font_valid;
alter table public.work_instruction_versions
  add constraint work_instruction_versions_font_valid
    check (font in ('sans', 'serif', 'mono'));
