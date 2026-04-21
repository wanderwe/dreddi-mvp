create table if not exists public.promise_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint promise_groups_title_length check (char_length(trim(title)) between 1 and 120),
  constraint promise_groups_description_length check (
    description is null or char_length(description) <= 280
  )
);

create index if not exists promise_groups_owner_created_idx
  on public.promise_groups(owner_user_id, created_at desc);

alter table public.promise_groups enable row level security;

drop policy if exists promise_groups_owner_select on public.promise_groups;
create policy promise_groups_owner_select on public.promise_groups
  for select using (auth.uid() = owner_user_id);

drop policy if exists promise_groups_owner_insert on public.promise_groups;
create policy promise_groups_owner_insert on public.promise_groups
  for insert with check (auth.uid() = owner_user_id);

drop policy if exists promise_groups_owner_update on public.promise_groups;
create policy promise_groups_owner_update on public.promise_groups
  for update using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists promise_groups_owner_delete on public.promise_groups;
create policy promise_groups_owner_delete on public.promise_groups
  for delete using (auth.uid() = owner_user_id);

alter table public.promises
  add column if not exists group_id uuid references public.promise_groups(id) on delete set null;

create index if not exists promises_group_id_idx on public.promises(group_id);
