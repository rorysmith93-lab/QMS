-- ============================================================================
-- QMS Rapid — Communications Log (ISO 9001:2015 clause 7.4)
-- Run this in the Supabase SQL Editor.
--
-- Closes a gap flagged by the ISO 9001 gap analysis: clause 7.4 asks the
-- organization to determine what it communicates, when, with whom, how,
-- and who communicates — this is a log of real events, not an abstract
-- plan, since each row already answers all five just by having these
-- fields. Insert + delete only (a wrong entry is deleted and re-logged),
-- same "append-only, no edit" reasoning as the other tracked logs.
-- ============================================================================

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  occurred_on date not null default current_date,
  direction text not null default 'internal' check (direction in ('internal', 'external')),
  audience text not null,
  method text not null,
  summary text not null,
  related_to text,

  communicated_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists communications_company_id_idx on public.communications (company_id);

alter table public.communications enable row level security;

drop policy if exists "communications_select_own_company" on public.communications;
create policy "communications_select_own_company"
  on public.communications for select
  using (company_id = public.current_company_id());

drop policy if exists "communications_insert_own_company" on public.communications;
create policy "communications_insert_own_company"
  on public.communications for insert
  with check (company_id = public.current_company_id());

drop policy if exists "communications_delete_own_company" on public.communications;
create policy "communications_delete_own_company"
  on public.communications for delete
  using (company_id = public.current_company_id());

-- No update policy — see the other logs (calibration, training) for the
-- reasoning: a wrong entry is deleted and re-logged, not edited in place.
