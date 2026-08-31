-- ============================================================================
-- QMS Rapid — foundation schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- ============================================================================

-- 1. COMPANIES ---------------------------------------------------------------
-- One row per company/tenant. Everything else in the app will eventually
-- hang off this table via a company_id column.
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. PROFILES -----------------------------------------------------------------
-- One row per logged-in user. Extends Supabase's built-in auth.users table
-- (which handles passwords etc.) with the extra info we need: which company
-- they belong to, and their role within it.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create index if not exists profiles_company_id_idx on public.profiles (company_id);

-- 3. TURN ON ROW LEVEL SECURITY -----------------------------------------------
-- Until RLS is enabled, these rules do nothing. Once enabled, EVERY query
-- (from the app, from anywhere) is filtered by the policies below by default.
alter table public.companies enable row level security;
alter table public.profiles enable row level security;

-- 4. HELPER FUNCTION ------------------------------------------------------------
-- Small helper: "what company does the currently logged-in user belong to?"
-- Used inside the policies below. SECURITY DEFINER + a locked-down
-- search_path keeps this safe to call from RLS policies.
create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- 5. POLICIES: who can see/change what -----------------------------------------
-- Companies: you may only ever see your own company's row.
drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
  on public.companies for select
  using (id = public.current_company_id());

-- Profiles: you may see other users within your own company (handy later for
-- a "team members" page), and you may update your own profile.
drop policy if exists "profiles_select_same_company" on public.profiles;
create policy "profiles_select_same_company"
  on public.profiles for select
  using (company_id = public.current_company_id());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Note: there are deliberately no INSERT policies here for normal users.
-- New companies + profiles are only ever created automatically by the
-- trigger below when someone signs up (it runs with elevated privileges),
-- so regular logged-in users can't create extra companies for themselves.

-- 6. AUTO-CREATE A COMPANY + PROFILE ON SIGN-UP ---------------------------------
-- When someone signs up, our sign-up form sends along their chosen company
-- name and their own name as "user metadata". This trigger fires right after
-- Supabase creates the new auth user, and:
--   a) creates a new company using that name
--   b) creates their profile, linking them to that new company as 'owner'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  insert into public.companies (name)
  values (coalesce(new.raw_user_meta_data ->> 'company_name', 'My Company'))
  returning id into new_company_id;

  insert into public.profiles (id, company_id, email, full_name, role)
  values (
    new.id,
    new_company_id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'owner'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
