-- ============================================================================
-- QMS Website — company font choice
-- Run this once in the Supabase SQL Editor, AFTER branding_schema.sql
-- (this is additive to the colour/logo columns added there).
-- ============================================================================

alter table public.companies
  add column if not exists font_family text not null default 'inter';

alter table public.companies
  drop constraint if exists companies_font_family_valid;
alter table public.companies
  add constraint companies_font_family_valid
    check (font_family in (
      'inter', 'manrope', 'work-sans', 'source-sans', 'ibm-plex-sans',
      'space-grotesk', 'system'
    ));
