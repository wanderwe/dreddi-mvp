alter table public.promises
  add column if not exists is_important boolean not null default false;
