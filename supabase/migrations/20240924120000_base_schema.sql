-- Base schema for Dreddi promises and profiles
create extension if not exists "pgcrypto";

-- Profiles synced from auth callback
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  email text,
  display_name text,
  handle text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy if not exists profiles_self_select on profiles
  for select using (auth.uid() = id);
create policy if not exists profiles_self_insert on profiles
  for insert with check (auth.uid() = id);
create policy if not exists profiles_self_update on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create unique index if not exists profiles_handle_key on profiles(handle) where handle is not null;

-- Promises table used across client + server flows
create table if not exists promises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  status text not null default 'active',
  creator_id uuid not null references auth.users(id),
  promisor_id uuid references auth.users(id),
  counterparty_id uuid references auth.users(id),
  counterparty_contact text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  confirmed_at timestamptz,
  disputed_at timestamptz,
  disputed_code text,
  dispute_reason text,
  invite_token text
);

alter table promises add constraint promises_status_valid
  check (status in ('active','completed_by_promisor','confirmed','disputed','fulfilled','broken'));
alter table promises add constraint promises_dispute_code_valid
  check (disputed_code is null or disputed_code in ('not_completed','partial','late','other'));

create index if not exists promises_creator_idx on promises(creator_id);
create index if not exists promises_counterparty_idx on promises(counterparty_id);
create unique index if not exists promises_invite_token_key on promises(invite_token) where invite_token is not null;
create index if not exists promises_status_idx on promises(status);

alter table promises enable row level security;
create policy if not exists promises_participant_select on promises
  for select using (auth.uid() = creator_id or auth.uid() = counterparty_id);
create policy if not exists promises_creator_insert on promises
  for insert with check (
    auth.uid() = creator_id
    and (promisor_id is null or promisor_id = auth.uid())
  );
create policy if not exists promises_participant_update on promises
  for update using (auth.uid() = creator_id or auth.uid() = counterparty_id)
  with check (auth.uid() = creator_id or auth.uid() = counterparty_id);
