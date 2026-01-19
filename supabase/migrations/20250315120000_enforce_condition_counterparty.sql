create or replace function public.resolve_promise_executor_id(
  promisor_id uuid,
  promisee_id uuid,
  counterparty_id uuid,
  creator_id uuid
) returns uuid
language sql
stable
as $$
  select case
    when promisor_id is not null then promisor_id
    when promisee_id is not null then
      case
        when counterparty_id is not null and counterparty_id <> promisee_id then counterparty_id
        else null
      end
    else creator_id
  end;
$$;

create or replace function public.resolve_promise_counterparty_id(
  promisor_id uuid,
  promisee_id uuid,
  counterparty_id uuid,
  creator_id uuid
) returns uuid
language sql
stable
as $$
  with executor as (
    select public.resolve_promise_executor_id(promisor_id, promisee_id, counterparty_id, creator_id) as executor_id
  )
  select case
    when (select executor_id from executor) is null then null
    when (select executor_id from executor) = creator_id then counterparty_id
    when counterparty_id is not null and (select executor_id from executor) = counterparty_id then creator_id
    when promisor_id is not null and promisee_id is not null and (select executor_id from executor) = promisor_id then promisee_id
    when promisor_id is not null and promisee_id is not null and (select executor_id from executor) = promisee_id then promisor_id
    else null
  end;
$$;

drop policy if exists promises_participant_update on public.promises;

create policy promises_participant_update on public.promises
  for update using (auth.uid() = creator_id or auth.uid() = counterparty_id)
  with check (
    (auth.uid() = creator_id or auth.uid() = counterparty_id)
    and (
      auth.uid() = public.resolve_promise_counterparty_id(promisor_id, promisee_id, counterparty_id, creator_id)
      or (
        condition_met_at is not distinct from (
          select p.condition_met_at from public.promises p where p.id = promises.id
        )
        and condition_met_by is not distinct from (
          select p.condition_met_by from public.promises p where p.id = promises.id
        )
      )
    )
  );
