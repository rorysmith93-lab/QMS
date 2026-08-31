-- ============================================================================
-- QMS Rapid — Full NCR form
-- Run this in the Supabase SQL Editor, AFTER non_conformances_schema.sql
-- (and ncr_sync_schema.sql, if you've run that).
--
-- Expands non_conformances from a simple log into a proper formal NCR:
-- an auto-numbered report with containment, disposition, CAPA flag, root
-- cause category, and verification/closure sign-off. Nothing here deletes
-- existing data — old rows get sensibly remapped, not dropped.
-- ============================================================================

-- 1. NCR NUMBER ----------------------------------------------------------------
-- Auto-assigned, sequential PER COMPANY (NCR-0001, NCR-0002, ...). The
-- counter lives on companies so concurrent inserts for the same company
-- can never produce a duplicate number (the UPDATE below takes a row lock).
alter table public.companies
  add column if not exists ncr_sequence integer not null default 0;

alter table public.non_conformances
  add column if not exists ncr_number text;

create or replace function public.assign_ncr_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seq integer;
begin
  if new.ncr_number is null then
    update public.companies
    set ncr_sequence = ncr_sequence + 1
    where id = new.company_id
    returning ncr_sequence into seq;

    new.ncr_number := 'NCR-' || lpad(seq::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists non_conformances_assign_number on public.non_conformances;
create trigger non_conformances_assign_number
  before insert on public.non_conformances
  for each row execute procedure public.assign_ncr_number();

-- 2. NEW FIELDS ------------------------------------------------------------------
alter table public.non_conformances
  add column if not exists date_reported date not null default current_date,
  add column if not exists reported_by text,
  add column if not exists department text,
  add column if not exists item_or_process text,
  add column if not exists lot_or_serial text,
  add column if not exists quantity_affected integer,
  add column if not exists containment_action text,
  add column if not exists containment_responsible text,
  add column if not exists containment_date date,
  add column if not exists disposition text,
  add column if not exists disposition_details text,
  add column if not exists qm_approval_name text,
  add column if not exists qm_approval_date date,
  add column if not exists eng_approval_name text,
  add column if not exists eng_approval_date date,
  add column if not exists capa_required boolean not null default false,
  add column if not exists capa_tracking_number text,
  add column if not exists root_cause_category text,
  add column if not exists verification_notes text,
  add column if not exists reinspection_outcome text,
  add column if not exists qa_inspector_name text,
  add column if not exists qa_inspector_date date;

-- 3. STATUS: 3 states -> 4 states -------------------------------------------------
-- Drop the old constraint FIRST — it doesn't allow the new values, so
-- remapping data while it's still active would reject the very rows we're
-- trying to fix.
alter table public.non_conformances drop constraint if exists non_conformances_status_check;

update public.non_conformances set status = 'under_review' where status = 'in_progress';
update public.non_conformances set status = 'verified_closed' where status = 'closed';

alter table public.non_conformances
  add constraint non_conformances_status_check
    check (status in ('open', 'under_review', 'disposition_agreed', 'verified_closed'));

-- 4. SOURCE -> "Source of Defect": remapped to the new, smaller category list ------
alter table public.non_conformances drop constraint if exists non_conformances_source_check;

update public.non_conformances set source = 'customer_return' where source = 'customer_complaint';
update public.non_conformances set source = 'internal_process' where source in ('inspection', 'process', 'other');
update public.non_conformances set source = 'supplier_issue' where source = 'supplier';
-- 'internal_audit' already matches the new list as-is.

alter table public.non_conformances
  add constraint non_conformances_source_check
    check (source in ('internal_process', 'customer_return', 'supplier_issue', 'internal_audit'));
alter table public.non_conformances alter column source set default 'internal_process';

-- 5. New enumerated fields --------------------------------------------------------
alter table public.non_conformances drop constraint if exists non_conformances_disposition_check;
alter table public.non_conformances
  add constraint non_conformances_disposition_check
    check (disposition is null or disposition in
      ('scrap', 'rework', 'repair', 'use_as_is', 'return_to_vendor'));

alter table public.non_conformances drop constraint if exists non_conformances_root_cause_category_check;
alter table public.non_conformances
  add constraint non_conformances_root_cause_category_check
    check (root_cause_category is null or root_cause_category in
      ('machine_equipment', 'method_sop', 'material', 'human_factor', 'environment'));

alter table public.non_conformances drop constraint if exists non_conformances_reinspection_outcome_check;
alter table public.non_conformances
  add constraint non_conformances_reinspection_outcome_check
    check (reinspection_outcome is null or reinspection_outcome in ('pass', 'fail'));

-- 6. Backfill ncr_number for rows that existed before this migration ---------------
do $$
declare
  rec record;
  seq integer;
begin
  for rec in
    select id, company_id from public.non_conformances where ncr_number is null order by created_at asc
  loop
    update public.companies set ncr_sequence = ncr_sequence + 1 where id = rec.company_id
      returning ncr_sequence into seq;
    update public.non_conformances set ncr_number = 'NCR-' || lpad(seq::text, 4, '0')
      where id = rec.id;
  end loop;
end $$;

alter table public.non_conformances alter column ncr_number set not null;
