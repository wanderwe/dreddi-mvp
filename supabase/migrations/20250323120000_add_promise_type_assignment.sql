-- Add promise type and assignment-specific fields
alter table promises
  add column if not exists promise_type text not null default 'deal',
  add column if not exists reward_amount numeric,
  add column if not exists reward_currency text,
  add column if not exists reward_text text,
  add column if not exists payment_terms text;

alter table promises add constraint promises_type_valid
  check (promise_type in ('deal', 'assignment'));

alter table promises add constraint promises_reward_currency_required
  check (reward_amount is null or reward_currency is not null);

update promises
  set promise_type = 'deal'
  where promise_type is null;
