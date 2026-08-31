-- ============================================================================
-- QMS Rapid — Work Instruction approval workflow (reuses the Document
-- Authorization matrix)
-- Run this in the Supabase SQL Editor, after document_authorization_schema.sql.
--
-- Work instructions don't get their own separate authorization system —
-- they're gated by the SAME document_category_settings / document_
-- authorizations tables already built for Document Control, using the
-- 'work_instruction' category that was already one of the five options
-- there. Set who can author/check/approve work instructions, and which
-- workflow mode applies, from Documents → Authorization → Work Instruction
-- — no separate screen needed.
--
-- This migration just gives work_instructions the same checked_by/
-- checked_at/approved_by/approved_at trail Documents has, plus a
-- 'checked' status for the mid-point of the two-step workflow.
-- ============================================================================

alter table public.work_instructions add column if not exists checked_by uuid references public.profiles (id) on delete set null;
alter table public.work_instructions add column if not exists checked_at timestamptz;
alter table public.work_instructions add column if not exists approved_by uuid references public.profiles (id) on delete set null;
alter table public.work_instructions add column if not exists approved_at timestamptz;

-- work_instructions_status_check is the auto-generated name Postgres gave
-- the original inline, unnamed check constraint in work_instructions_schema.sql
-- — same footgun as the documents/NCR status migrations before it.
alter table public.work_instructions drop constraint if exists work_instructions_status_check;
alter table public.work_instructions
  add constraint work_instructions_status_check
    check (status in ('draft', 'checked', 'approved', 'archived'));
