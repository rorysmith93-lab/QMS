-- ============================================================================
-- QMS Rapid — PDF-safe logo conversion
-- Run this in the Supabase SQL Editor.
--
-- react-pdf's <Image> can't reliably render SVG (some SVGs — e.g. logos
-- exported with embedded text/font styling — crash it outright). When a
-- company's logo is an SVG, PDF generation now rasterizes it to PNG on
-- first use and caches the result here, so every PDF after that just
-- reuses the cached PNG instead of re-converting every time.
-- ============================================================================

alter table public.companies add column if not exists logo_pdf_path text;
