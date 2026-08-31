-- ============================================================================
-- QMS Website — MES NCR sync
-- Run this once in the Supabase SQL Editor, AFTER schema.sql and
-- non_conformances_schema.sql.
--
-- Lets the Custom MES App push shop-floor NCRs into this company's
-- non_conformances register via a webhook (src/app/api/ncr-sync/route.ts),
-- authenticated with a per-company API key generated from Settings.
-- ============================================================================

alter table public.companies
  add column if not exists ncr_sync_api_key text unique;

-- origin_system/origin_ref identify where a non-conformance came from when
-- it wasn't logged directly in QMS (origin_system = 'mes', origin_ref =
-- the MES ncrs.id it mirrors). Both null for NCRs logged in QMS itself.
alter table public.non_conformances
  add column if not exists origin_system text,
  add column if not exists origin_ref text;

-- Lets the webhook upsert instead of insert: a retried/duplicate delivery
-- for the same MES NCR updates the existing row rather than creating a
-- second one.
create unique index if not exists non_conformances_origin_idx
  on public.non_conformances (company_id, origin_system, origin_ref)
  where origin_ref is not null;

-- gen_random_bytes (unlike gen_random_uuid, which is core Postgres) needs
-- pgcrypto explicitly enabled. Supabase installs its functions into an
-- "extensions" schema, not "public" — hence the schema-qualified search
-- path below (same fix needed in the Custom MES App project's operator-PIN
-- feature).
create extension if not exists pgcrypto with schema extensions;

-- Callable from Settings (src/app/dashboard/settings/actions.ts) by an
-- authenticated user of the company — generates and stores a fresh random
-- key for their own company and returns it once. SECURITY DEFINER so the
-- update isn't blocked by RLS having no general UPDATE-by-anyone policy;
-- scoping to current_company_id() (not an arbitrary id) keeps it safe to
-- expose to any logged-in company member.
create or replace function public.regenerate_ncr_sync_key()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_key text;
begin
  new_key := encode(extensions.gen_random_bytes(32), 'hex');

  update public.companies
  set ncr_sync_api_key = new_key
  where id = public.current_company_id();

  return new_key;
end;
$$;
