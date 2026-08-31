-- ============================================================================
-- QMS Rapid — Work Instruction Builder
-- Run this in the Supabase SQL Editor, same as the earlier schema files.
-- ============================================================================

create table if not exists public.work_instructions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  document_number text,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'archived')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_instruction_steps (
  id uuid primary key default gen_random_uuid(),
  work_instruction_id uuid not null references public.work_instructions (id) on delete cascade,
  -- Duplicated from work_instructions.company_id, same reasoning as
  -- document_versions: keeps the security rules below simple and fast.
  company_id uuid not null references public.companies (id) on delete cascade,
  position integer not null,
  title text,
  body text,
  caution text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_instructions_company_id_idx on public.work_instructions (company_id);
create index if not exists work_instruction_steps_wi_id_idx on public.work_instruction_steps (work_instruction_id);
create index if not exists work_instruction_steps_company_id_idx on public.work_instruction_steps (company_id);

alter table public.work_instructions enable row level security;
alter table public.work_instruction_steps enable row level security;

drop policy if exists "work_instructions_select_own_company" on public.work_instructions;
create policy "work_instructions_select_own_company"
  on public.work_instructions for select
  using (company_id = public.current_company_id());

drop policy if exists "work_instructions_insert_own_company" on public.work_instructions;
create policy "work_instructions_insert_own_company"
  on public.work_instructions for insert
  with check (company_id = public.current_company_id());

drop policy if exists "work_instructions_update_own_company" on public.work_instructions;
create policy "work_instructions_update_own_company"
  on public.work_instructions for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "work_instructions_delete_own_company" on public.work_instructions;
create policy "work_instructions_delete_own_company"
  on public.work_instructions for delete
  using (company_id = public.current_company_id());

drop policy if exists "work_instruction_steps_select_own_company" on public.work_instruction_steps;
create policy "work_instruction_steps_select_own_company"
  on public.work_instruction_steps for select
  using (company_id = public.current_company_id());

drop policy if exists "work_instruction_steps_insert_own_company" on public.work_instruction_steps;
create policy "work_instruction_steps_insert_own_company"
  on public.work_instruction_steps for insert
  with check (company_id = public.current_company_id());

drop policy if exists "work_instruction_steps_update_own_company" on public.work_instruction_steps;
create policy "work_instruction_steps_update_own_company"
  on public.work_instruction_steps for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "work_instruction_steps_delete_own_company" on public.work_instruction_steps;
create policy "work_instruction_steps_delete_own_company"
  on public.work_instruction_steps for delete
  using (company_id = public.current_company_id());

-- Reuses the same set_updated_at() helper created in schema.sql.
drop trigger if exists work_instructions_set_updated_at on public.work_instructions;
create trigger work_instructions_set_updated_at
  before update on public.work_instructions
  for each row execute procedure public.set_updated_at();

drop trigger if exists work_instruction_steps_set_updated_at on public.work_instruction_steps;
create trigger work_instruction_steps_set_updated_at
  before update on public.work_instruction_steps
  for each row execute procedure public.set_updated_at();

-- Step photos live in their own private bucket, secured the same way as
-- Document Control's files: only someone in the matching company can
-- upload/view/replace/delete, via short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('work-instruction-images', 'work-instruction-images', false)
on conflict (id) do nothing;

drop policy if exists "wi_images_storage_select" on storage.objects;
create policy "wi_images_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'work-instruction-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "wi_images_storage_insert" on storage.objects;
create policy "wi_images_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'work-instruction-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "wi_images_storage_update" on storage.objects;
create policy "wi_images_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'work-instruction-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "wi_images_storage_delete" on storage.objects;
create policy "wi_images_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'work-instruction-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
