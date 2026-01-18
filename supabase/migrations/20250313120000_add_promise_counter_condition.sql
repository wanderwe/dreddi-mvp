alter table public.promises
  add column if not exists condition_text text,
  add column if not exists condition_met_at timestamptz,
  add column if not exists condition_met_by uuid references auth.users(id);

drop policy if exists promises_participant_update on public.promises;

create policy promises_participant_update on public.promises
  for update using (auth.uid() = creator_id or auth.uid() = counterparty_id)
  with check (
    (auth.uid() = creator_id or auth.uid() = counterparty_id)
    and (
      auth.uid() = counterparty_id
      or (
        condition_met_at is not distinct from (
          select p.condition_met_at from public.promises p where p.id = public.promises.id
        )
        and condition_met_by is not distinct from (
          select p.condition_met_by from public.promises p where p.id = public.promises.id
        )
      )
    )
  );
