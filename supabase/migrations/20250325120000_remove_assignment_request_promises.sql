-- Remove assignment/request promise fields and constraints
alter table public.promises
  drop constraint if exists promises_type_valid,
  drop constraint if exists promises_reward_currency_required;

alter table public.promises
  drop column if exists promise_type,
  drop column if exists reward_amount,
  drop column if exists reward_currency,
  drop column if exists reward_text,
  drop column if exists payment_terms;
