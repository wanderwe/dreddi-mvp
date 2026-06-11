-- Collective agreements: one creator defines a single commitment that is
-- broadcast to multiple participants, each accepting their own copy
-- (a normal `promises` row) and following the existing accept/complete/
-- confirm/dispute lifecycle independently.

create table if not exists public.collective_agreements (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  details text,
  condition_text text,
  due_at timestamptz,
  visibility text not null default 'public' check (visibility in ('private', 'public')),
  is_important boolean not null default false,
  created_at timestamptz not null default now(),
  constraint collective_agreements_title_length check (char_length(trim(title)) between 1 and 120),
  constraint collective_agreements_details_length check (
    details is null or char_length(details) <= 2000
  )
);

create index if not exists collective_agreements_creator_created_idx
  on public.collective_agreements(creator_id, created_at desc);

alter table public.promises
  add column if not exists collective_agreement_id uuid references public.collective_agreements(id) on delete set null;

create index if not exists promises_collective_agreement_id_idx
  on public.promises(collective_agreement_id);

alter table public.collective_agreements enable row level security;

drop policy if exists collective_agreements_creator_select on public.collective_agreements;
create policy collective_agreements_creator_select on public.collective_agreements
  for select using (auth.uid() = creator_id);

drop policy if exists collective_agreements_participant_select on public.collective_agreements;
create policy collective_agreements_participant_select on public.collective_agreements
  for select using (
    exists (
      select 1 from public.promises p
      where p.collective_agreement_id = collective_agreements.id
        and (
          p.promisor_id = auth.uid()
          or p.promisee_id = auth.uid()
          or p.counterparty_id = auth.uid()
        )
    )
  );

drop policy if exists collective_agreements_creator_insert on public.collective_agreements;
create policy collective_agreements_creator_insert on public.collective_agreements
  for insert with check (auth.uid() = creator_id);

drop policy if exists collective_agreements_creator_update on public.collective_agreements;
create policy collective_agreements_creator_update on public.collective_agreements
  for update using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);
