-- Plans, phase 0: every profile has a plan; nothing is limited until PLAN_LIMITS_ENABLED is set.
alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro'));
