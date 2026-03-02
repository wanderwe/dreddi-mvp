create extension if not exists pg_trgm;

create table if not exists public.deal_invites (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.promises(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists deal_invites_deal_id_idx on public.deal_invites(deal_id);
create index if not exists deal_invites_invitee_id_idx on public.deal_invites(invitee_id);

create index if not exists profiles_handle_display_name_search_idx
  on public.profiles
  using gin ((coalesce(lower(handle), '') || ' ' || coalesce(lower(display_name), '')) gin_trgm_ops);
