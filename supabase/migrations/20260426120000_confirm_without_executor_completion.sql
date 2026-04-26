alter table public.promises
add column if not exists confirmed_without_executor_completion boolean not null default false;
