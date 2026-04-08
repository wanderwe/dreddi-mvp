create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_handle_or_name text,
  category text not null check (category in ('bug', 'suggestion', 'confusing_ux', 'other')),
  message text not null check (length(btrim(message)) > 0),
  page_url text not null,
  locale text not null,
  allow_contact boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_desc_idx on public.feedback(created_at desc);
create index if not exists feedback_user_id_idx on public.feedback(user_id);

alter table public.feedback enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'feedback_self_insert'
  ) then
    create policy feedback_self_insert
      on public.feedback for insert
      with check (auth.role() = 'authenticated' and (user_id is null or auth.uid() = user_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'feedback_self_select'
  ) then
    create policy feedback_self_select
      on public.feedback for select
      using (auth.uid() = user_id);
  end if;
end $$;
