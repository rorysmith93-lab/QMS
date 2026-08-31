-- ============================================================================
-- QMS Rapid — PPE symbols + Equipment library for Work Instructions
-- Run this in the Supabase SQL Editor, after work_instruction_publishing_schema.sql.
-- ============================================================================

-- 1. PPE ---------------------------------------------------------------------
-- PPE is a small FIXED catalog defined in code (src/lib/ppe.ts), not a
-- table — there's nothing for a company to add or edit, just a standard
-- list of symbols to pick from. We only need somewhere to store which
-- ones apply to a given work instruction.
alter table public.work_instructions
  add column if not exists ppe_items text[] not null default '{}';

-- Keep this list in sync with PPE_ITEMS in src/lib/ppe.ts — this constraint
-- exists so nothing invalid can ever be written directly to the database,
-- not as the source of truth for what the picker shows.
alter table public.work_instructions
  drop constraint if exists work_instructions_ppe_items_valid;
alter table public.work_instructions
  add constraint work_instructions_ppe_items_valid
    check (
      ppe_items <@ array[
        'eye_protection', 'ear_protection', 'head_protection', 'hand_protection',
        'foot_protection', 'hi_vis', 'respiratory_protection', 'face_shield',
        'protective_clothing', 'fall_protection'
      ]::text[]
    );

-- 2. EQUIPMENT LIBRARY ---------------------------------------------------------
-- Unlike PPE, this IS a real table — every company builds their own list.
create table if not exists public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  image_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_items_company_id_idx on public.equipment_items (company_id);

alter table public.equipment_items enable row level security;

drop policy if exists "equipment_items_select_own_company" on public.equipment_items;
create policy "equipment_items_select_own_company"
  on public.equipment_items for select
  using (company_id = public.current_company_id());

drop policy if exists "equipment_items_insert_own_company" on public.equipment_items;
create policy "equipment_items_insert_own_company"
  on public.equipment_items for insert
  with check (company_id = public.current_company_id());

drop policy if exists "equipment_items_update_own_company" on public.equipment_items;
create policy "equipment_items_update_own_company"
  on public.equipment_items for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "equipment_items_delete_own_company" on public.equipment_items;
create policy "equipment_items_delete_own_company"
  on public.equipment_items for delete
  using (company_id = public.current_company_id());

drop trigger if exists equipment_items_set_updated_at on public.equipment_items;
create trigger equipment_items_set_updated_at
  before update on public.equipment_items
  for each row execute procedure public.set_updated_at();

-- 3. WHICH EQUIPMENT A WORK INSTRUCTION REQUIRES --------------------------------
create table if not exists public.work_instruction_equipment (
  work_instruction_id uuid not null references public.work_instructions (id) on delete cascade,
  equipment_item_id uuid not null references public.equipment_items (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (work_instruction_id, equipment_item_id)
);

create index if not exists wi_equipment_wi_id_idx on public.work_instruction_equipment (work_instruction_id);

alter table public.work_instruction_equipment enable row level security;

drop policy if exists "wi_equipment_select_own_company" on public.work_instruction_equipment;
create policy "wi_equipment_select_own_company"
  on public.work_instruction_equipment for select
  using (company_id = public.current_company_id());

drop policy if exists "wi_equipment_insert_own_company" on public.work_instruction_equipment;
create policy "wi_equipment_insert_own_company"
  on public.work_instruction_equipment for insert
  with check (company_id = public.current_company_id());

drop policy if exists "wi_equipment_delete_own_company" on public.work_instruction_equipment;
create policy "wi_equipment_delete_own_company"
  on public.work_instruction_equipment for delete
  using (company_id = public.current_company_id());

-- 4. PUBLISHED VERSIONS SNAPSHOT PPE + EQUIPMENT TOO -----------------------------
-- Same reasoning as the step photos: a published version should never
-- change, even if the draft's PPE selection changes or an equipment item
-- is later renamed/deleted from the library.
alter table public.work_instruction_versions
  add column if not exists ppe_items text[] not null default '{}';
alter table public.work_instruction_versions
  add column if not exists equipment jsonb not null default '[]'::jsonb;

-- 5. EQUIPMENT PHOTOS STORAGE ----------------------------------------------------
-- Private bucket, same pattern as documents/work-instruction-images.
insert into storage.buckets (id, name, public)
values ('equipment-images', 'equipment-images', false)
on conflict (id) do nothing;

drop policy if exists "equipment_images_storage_select" on storage.objects;
create policy "equipment_images_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "equipment_images_storage_insert" on storage.objects;
create policy "equipment_images_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "equipment_images_storage_update" on storage.objects;
create policy "equipment_images_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "equipment_images_storage_delete" on storage.objects;
create policy "equipment_images_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
