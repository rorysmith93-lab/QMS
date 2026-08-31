-- ============================================================================
-- QMS Rapid — Change Control (ISO 9001:2015 clause 6.3)
-- Run this in the Supabase SQL Editor, after non_conformances_schema.sql,
-- documents_schema.sql, sop_schema.sql, and work_instructions_schema.sql.
--
-- Closes a gap flagged by the ISO 9001 gap analysis: there was no record
-- of a change to the QMS being planned, assessed for impact, and signed
-- off before it happened. This is that record — a change request that
-- can point at exactly which documents/SOPs/work instructions it
-- affects, and which NCR(s) (if any) triggered it, without duplicating
-- any of that data.
-- ============================================================================

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  description text,
  impact_assessment text,
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'implemented', 'rejected')),
  owner uuid references public.profiles (id) on delete set null,
  target_date date,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  implemented_at date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists change_requests_company_id_idx on public.change_requests (company_id);

alter table public.change_requests enable row level security;

drop policy if exists "change_requests_select_own_company" on public.change_requests;
create policy "change_requests_select_own_company"
  on public.change_requests for select
  using (company_id = public.current_company_id());

drop policy if exists "change_requests_insert_own_company" on public.change_requests;
create policy "change_requests_insert_own_company"
  on public.change_requests for insert
  with check (company_id = public.current_company_id());

drop policy if exists "change_requests_update_own_company" on public.change_requests;
create policy "change_requests_update_own_company"
  on public.change_requests for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "change_requests_delete_own_company" on public.change_requests;
create policy "change_requests_delete_own_company"
  on public.change_requests for delete
  using (company_id = public.current_company_id());

drop trigger if exists change_requests_set_updated_at on public.change_requests;
create trigger change_requests_set_updated_at
  before update on public.change_requests
  for each row execute procedure public.set_updated_at();

-- Which controlled records this change affects. Three separate junction
-- tables (not one polymorphic table) so each keeps a real foreign key —
-- same choice as work_instruction_equipment.
create table if not exists public.change_request_documents (
  change_request_id uuid not null references public.change_requests (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (change_request_id, document_id)
);

create table if not exists public.change_request_sops (
  change_request_id uuid not null references public.change_requests (id) on delete cascade,
  sop_id uuid not null references public.sops (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (change_request_id, sop_id)
);

create table if not exists public.change_request_work_instructions (
  change_request_id uuid not null references public.change_requests (id) on delete cascade,
  work_instruction_id uuid not null references public.work_instructions (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (change_request_id, work_instruction_id)
);

-- Which NCR(s), if any, triggered this change — e.g. a recurring
-- nonconformance that turns out to need a procedure change, not just a
-- one-off correction.
create table if not exists public.change_request_ncrs (
  change_request_id uuid not null references public.change_requests (id) on delete cascade,
  non_conformance_id uuid not null references public.non_conformances (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (change_request_id, non_conformance_id)
);

create index if not exists cr_documents_cr_id_idx on public.change_request_documents (change_request_id);
create index if not exists cr_sops_cr_id_idx on public.change_request_sops (change_request_id);
create index if not exists cr_wis_cr_id_idx on public.change_request_work_instructions (change_request_id);
create index if not exists cr_ncrs_cr_id_idx on public.change_request_ncrs (change_request_id);

alter table public.change_request_documents enable row level security;
alter table public.change_request_sops enable row level security;
alter table public.change_request_work_instructions enable row level security;
alter table public.change_request_ncrs enable row level security;

-- Same select/insert/delete-only policy shape as work_instruction_equipment
-- for all four junction tables — membership in a set doesn't get "updated",
-- a link either exists or it doesn't.
drop policy if exists "cr_documents_select_own_company" on public.change_request_documents;
create policy "cr_documents_select_own_company"
  on public.change_request_documents for select
  using (company_id = public.current_company_id());
drop policy if exists "cr_documents_insert_own_company" on public.change_request_documents;
create policy "cr_documents_insert_own_company"
  on public.change_request_documents for insert
  with check (company_id = public.current_company_id());
drop policy if exists "cr_documents_delete_own_company" on public.change_request_documents;
create policy "cr_documents_delete_own_company"
  on public.change_request_documents for delete
  using (company_id = public.current_company_id());

drop policy if exists "cr_sops_select_own_company" on public.change_request_sops;
create policy "cr_sops_select_own_company"
  on public.change_request_sops for select
  using (company_id = public.current_company_id());
drop policy if exists "cr_sops_insert_own_company" on public.change_request_sops;
create policy "cr_sops_insert_own_company"
  on public.change_request_sops for insert
  with check (company_id = public.current_company_id());
drop policy if exists "cr_sops_delete_own_company" on public.change_request_sops;
create policy "cr_sops_delete_own_company"
  on public.change_request_sops for delete
  using (company_id = public.current_company_id());

drop policy if exists "cr_wis_select_own_company" on public.change_request_work_instructions;
create policy "cr_wis_select_own_company"
  on public.change_request_work_instructions for select
  using (company_id = public.current_company_id());
drop policy if exists "cr_wis_insert_own_company" on public.change_request_work_instructions;
create policy "cr_wis_insert_own_company"
  on public.change_request_work_instructions for insert
  with check (company_id = public.current_company_id());
drop policy if exists "cr_wis_delete_own_company" on public.change_request_work_instructions;
create policy "cr_wis_delete_own_company"
  on public.change_request_work_instructions for delete
  using (company_id = public.current_company_id());

drop policy if exists "cr_ncrs_select_own_company" on public.change_request_ncrs;
create policy "cr_ncrs_select_own_company"
  on public.change_request_ncrs for select
  using (company_id = public.current_company_id());
drop policy if exists "cr_ncrs_insert_own_company" on public.change_request_ncrs;
create policy "cr_ncrs_insert_own_company"
  on public.change_request_ncrs for insert
  with check (company_id = public.current_company_id());
drop policy if exists "cr_ncrs_delete_own_company" on public.change_request_ncrs;
create policy "cr_ncrs_delete_own_company"
  on public.change_request_ncrs for delete
  using (company_id = public.current_company_id());
