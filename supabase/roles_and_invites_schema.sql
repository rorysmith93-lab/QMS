-- ============================================================================
-- QMS Rapid — Roles, permissions, and team invites
-- Run this in the Supabase SQL Editor, after document_authorization_schema.sql.
--
-- Three fixed roles (see src/lib/roles.ts for what each can see):
--   admin           — everything, plus user/company administration
--   quality_manager — every QMS module, but not Settings/Team
--   member          — day-to-day operational modules only
--
-- Also adds a proper "invite a teammate" flow: an admin creates a pending
-- invite (email + role) for their company; when someone signs up with a
-- matching email, they join that company at that role instead of getting
-- a brand-new company of their own.
-- ============================================================================

-- 1. NORMALIZE profiles.role TO THE FIXED SET --------------------------------
-- Existing rows used the old ad-hoc 'owner' value (or anything else) —
-- treat all of those as 'admin', since they're the sole/founding user of
-- their company.
update public.profiles set role = 'admin' where role is null or role not in ('admin', 'quality_manager', 'member');

alter table public.profiles alter column role set default 'member';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'quality_manager', 'member'));

-- 2. CLOSE THE SELF-PROMOTION GAP ---------------------------------------------
-- The original "profiles_update_own" policy (schema.sql) lets anyone
-- update their OWN row with no restriction on which columns — harmless
-- when role wasn't used for anything, a real privilege-escalation hole
-- now that it controls access. This trigger blocks any role change made
-- by someone who isn't currently an admin of that same company,
-- regardless of which policy/API path the UPDATE came through.
create or replace function public.prevent_unauthorized_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.company_id = old.company_id
    ) then
      raise exception 'Only an admin can change a team member''s role.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_unauthorized_role_change();

-- Admins also need to be able to update OTHER people's profile rows at
-- all (e.g. to change their role) — the original policy only allowed
-- updating your own row. The trigger above is the real guard on role
-- specifically; this policy just makes the UPDATE reachable for admins.
drop policy if exists "profiles_update_admin_same_company" on public.profiles;
create policy "profiles_update_admin_same_company"
  on public.profiles for update
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (company_id = public.current_company_id());

-- 3. PENDING INVITES -----------------------------------------------------------
create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'quality_manager', 'member')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- At most one PENDING invite per email at a time (across the whole
-- project — an email can only ever belong to one Supabase auth user).
create unique index if not exists company_invites_pending_email_idx
  on public.company_invites (lower(email))
  where accepted_at is null;

create index if not exists company_invites_company_id_idx on public.company_invites (company_id);

alter table public.company_invites enable row level security;

-- Admin-only in every direction — checks the CALLING user's own role,
-- not just that they belong to the company.
drop policy if exists "company_invites_select_admin_only" on public.company_invites;
create policy "company_invites_select_admin_only"
  on public.company_invites for select
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "company_invites_insert_admin_only" on public.company_invites;
create policy "company_invites_insert_admin_only"
  on public.company_invites for insert
  with check (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "company_invites_delete_admin_only" on public.company_invites;
create policy "company_invites_delete_admin_only"
  on public.company_invites for delete
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 4. REWIRE THE NEW-USER TRIGGER ------------------------------------------------
-- Same trigger as schema.sql, extended: if the email being signed up
-- matches a pending invite, join THAT company at the invited role
-- instead of creating a brand-new company. Otherwise, unchanged — create
-- a new company and make the signer-upper its admin (was 'owner').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  matched_invite record;
begin
  select * into matched_invite
  from public.company_invites
  where lower(email) = lower(new.email) and accepted_at is null
  order by created_at asc
  limit 1;

  if matched_invite.id is not null then
    insert into public.profiles (id, company_id, email, full_name, role)
    values (new.id, matched_invite.company_id, new.email, new.raw_user_meta_data ->> 'full_name', matched_invite.role);

    update public.company_invites set accepted_at = now() where id = matched_invite.id;
  else
    insert into public.companies (name)
    values (coalesce(new.raw_user_meta_data ->> 'company_name', 'My Company'))
    returning id into new_company_id;

    insert into public.profiles (id, company_id, email, full_name, role)
    values (new.id, new_company_id, new.email, new.raw_user_meta_data ->> 'full_name', 'admin');
  end if;

  return new;
end;
$$;
