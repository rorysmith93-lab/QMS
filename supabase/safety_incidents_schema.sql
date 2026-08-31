-- ============================================================================
-- Safety Management System (SMS) — Incident & Near-Miss Management + CAPA
-- Run this in the Supabase SQL Editor, after schema.sql AND after
-- root_cause_tools_schema.sql (this file extends root_cause_analyses to
-- also work for incidents, not just non-conformances).
-- ============================================================================

-- 1. INCIDENT NUMBER -----------------------------------------------------------
-- Per-company sequential numbers (INC-0001, INC-0002, ...), same pattern as
-- ncr_sequence/audit_sequence elsewhere in this app.
alter table public.companies
  add column if not exists incident_sequence integer not null default 0;

-- 2. SAFETY INCIDENTS -----------------------------------------------------------
create table if not exists public.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  incident_number text,

  type text not null default 'near_miss'
    check (type in ('incident', 'near_miss', 'hazard_observation')),
  severity text not null default 'low'
    check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'corrective_action', 'closed')),

  title text not null,
  description text not null,

  location_text text,
  -- Filled in from the browser's Geolocation API on the mobile report
  -- form ("Use my location") — both nullable, since desktop/manual entry
  -- has no GPS to offer.
  latitude numeric,
  longitude numeric,

  date_occurred date not null default current_date,
  date_reported date not null default current_date,
  reported_by uuid references public.profiles (id) on delete set null,

  injured_person_name text,
  department text,

  assigned_to uuid references public.profiles (id) on delete set null,
  due_date date,

  root_cause text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create or replace function public.assign_incident_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seq integer;
begin
  if new.incident_number is null then
    update public.companies
    set incident_sequence = incident_sequence + 1
    where id = new.company_id
    returning incident_sequence into seq;

    new.incident_number := 'INC-' || lpad(seq::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists safety_incidents_assign_number on public.safety_incidents;
create trigger safety_incidents_assign_number
  before insert on public.safety_incidents
  for each row execute procedure public.assign_incident_number();

create index if not exists safety_incidents_company_id_idx on public.safety_incidents (company_id);
create index if not exists safety_incidents_assigned_to_idx on public.safety_incidents (assigned_to);

alter table public.safety_incidents enable row level security;

drop policy if exists "safety_incidents_select_own_company" on public.safety_incidents;
create policy "safety_incidents_select_own_company"
  on public.safety_incidents for select
  using (company_id = public.current_company_id());

drop policy if exists "safety_incidents_insert_own_company" on public.safety_incidents;
create policy "safety_incidents_insert_own_company"
  on public.safety_incidents for insert
  with check (company_id = public.current_company_id());

drop policy if exists "safety_incidents_update_own_company" on public.safety_incidents;
create policy "safety_incidents_update_own_company"
  on public.safety_incidents for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "safety_incidents_delete_own_company" on public.safety_incidents;
create policy "safety_incidents_delete_own_company"
  on public.safety_incidents for delete
  using (company_id = public.current_company_id());

drop trigger if exists safety_incidents_set_updated_at on public.safety_incidents;
create trigger safety_incidents_set_updated_at
  before update on public.safety_incidents
  for each row execute procedure public.set_updated_at();

-- 3. INCIDENT PHOTOS -----------------------------------------------------------
-- One row per attached photo — an incident can have several, unlike a
-- single Document version.
create table if not exists public.safety_incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.safety_incidents (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists safety_incident_photos_incident_id_idx on public.safety_incident_photos (incident_id);
create index if not exists safety_incident_photos_company_id_idx on public.safety_incident_photos (company_id);

alter table public.safety_incident_photos enable row level security;

drop policy if exists "safety_incident_photos_select_own_company" on public.safety_incident_photos;
create policy "safety_incident_photos_select_own_company"
  on public.safety_incident_photos for select
  using (company_id = public.current_company_id());

drop policy if exists "safety_incident_photos_insert_own_company" on public.safety_incident_photos;
create policy "safety_incident_photos_insert_own_company"
  on public.safety_incident_photos for insert
  with check (company_id = public.current_company_id());

drop policy if exists "safety_incident_photos_delete_own_company" on public.safety_incident_photos;
create policy "safety_incident_photos_delete_own_company"
  on public.safety_incident_photos for delete
  using (company_id = public.current_company_id());

insert into storage.buckets (id, name, public)
values ('safety-incident-photos', 'safety-incident-photos', false)
on conflict (id) do nothing;

drop policy if exists "safety_incident_photos_storage_select" on storage.objects;
create policy "safety_incident_photos_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'safety-incident-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "safety_incident_photos_storage_insert" on storage.objects;
create policy "safety_incident_photos_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'safety-incident-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "safety_incident_photos_storage_delete" on storage.objects;
create policy "safety_incident_photos_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'safety-incident-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

-- 4. CAPA ACTIONS -----------------------------------------------------------------
-- Corrective/preventive actions raised against an incident: assignment,
-- due date, and proof-of-completion upload. "Escalation" is derived at
-- render time from due_date/status (overdue badge), same as everywhere
-- else in this app — nothing here pushes a notification.
create table if not exists public.capa_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  incident_id uuid not null references public.safety_incidents (id) on delete cascade,

  description text not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  due_date date,

  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  completed_at timestamptz,
  proof_file_path text,
  proof_file_name text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists capa_actions_incident_id_idx on public.capa_actions (incident_id);
create index if not exists capa_actions_company_id_idx on public.capa_actions (company_id);
create index if not exists capa_actions_assigned_to_idx on public.capa_actions (assigned_to);

alter table public.capa_actions enable row level security;

drop policy if exists "capa_actions_select_own_company" on public.capa_actions;
create policy "capa_actions_select_own_company"
  on public.capa_actions for select
  using (company_id = public.current_company_id());

drop policy if exists "capa_actions_insert_own_company" on public.capa_actions;
create policy "capa_actions_insert_own_company"
  on public.capa_actions for insert
  with check (company_id = public.current_company_id());

drop policy if exists "capa_actions_update_own_company" on public.capa_actions;
create policy "capa_actions_update_own_company"
  on public.capa_actions for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "capa_actions_delete_own_company" on public.capa_actions;
create policy "capa_actions_delete_own_company"
  on public.capa_actions for delete
  using (company_id = public.current_company_id());

drop trigger if exists capa_actions_set_updated_at on public.capa_actions;
create trigger capa_actions_set_updated_at
  before update on public.capa_actions
  for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('capa-proof', 'capa-proof', false)
on conflict (id) do nothing;

drop policy if exists "capa_proof_storage_select" on storage.objects;
create policy "capa_proof_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'capa-proof'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "capa_proof_storage_insert" on storage.objects;
create policy "capa_proof_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'capa-proof'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

-- 5. GENERALIZE ROOT CAUSE TOOLS TO ALSO WORK ON INCIDENTS -------------------------
-- root_cause_analyses.non_conformance_id was already nullable — this adds
-- a second, equally-nullable FK and a check that exactly one of the two is
-- ever set, so the same Five-Whys/Fishbone/8D tool works against either a
-- non-conformance OR a safety incident with no new table.
alter table public.root_cause_analyses
  add column if not exists safety_incident_id uuid references public.safety_incidents (id) on delete cascade;

alter table public.root_cause_analyses drop constraint if exists root_cause_analyses_subject_check;
alter table public.root_cause_analyses
  add constraint root_cause_analyses_subject_check
    check ((non_conformance_id is not null) <> (safety_incident_id is not null));

create unique index if not exists root_cause_analyses_incident_type_idx
  on public.root_cause_analyses (safety_incident_id, type)
  where safety_incident_id is not null;
