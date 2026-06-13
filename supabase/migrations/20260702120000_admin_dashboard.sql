-- Admin panel: admin role table + dashboard stats RPC + admin management RPCs

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'admin_users_self_select'
  ) then
    create policy admin_users_self_select
      on public.admin_users for select
      using (auth.uid() = id);
  end if;
end $$;

-- Returns dashboard metrics for the current user, if they are an admin.
-- Raises an exception for non-admins so callers can surface a 403.
create or replace function public.admin_dashboard_stats(days_back int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.admin_users where id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_agreements', (select count(*) from public.promises),
    'agreements_by_status', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (
        select status, count(*) as cnt
        from public.promises
        group by status
      ) s
    ),
    'total_feedback', (select count(*) from public.feedback),
    'new_users_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', cnt) order by day), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as day, count(*) as cnt
        from public.profiles
        where created_at >= now() - (days_back || ' days')::interval
        group by 1
      ) u
    ),
    'new_agreements_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', cnt) order by day), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as day, count(*) as cnt
        from public.promises
        where created_at >= now() - (days_back || ' days')::interval
        group by 1
      ) a
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_dashboard_stats(int) to authenticated;

-- Lists current admins. Raises an exception for non-admins.
create or replace function public.admin_list_admins()
returns table (
  id uuid,
  email text,
  display_name text,
  handle text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    u.email,
    p.display_name,
    p.handle,
    a.created_at
  from public.admin_users a
  join auth.users u on u.id = a.id
  left join public.profiles p on p.id = a.id
  where exists (select 1 from public.admin_users me where me.id = auth.uid())
  order by a.created_at asc;
$$;

grant execute on function public.admin_list_admins() to authenticated;

-- Grants admin access to the user with the given email. Raises an exception
-- for non-admins or if no user with that email exists.
create or replace function public.admin_add_admin(p_email text)
returns table (
  id uuid,
  email text,
  display_name text,
  handle text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not exists (select 1 from public.admin_users where id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select u.id into target_id from auth.users u where u.email = p_email;

  if target_id is null then
    raise exception 'user not found';
  end if;

  insert into public.admin_users (id)
  values (target_id)
  on conflict (id) do nothing;

  return query
    select a.id, u.email, p.display_name, p.handle, a.created_at
    from public.admin_users a
    join auth.users u on u.id = a.id
    left join public.profiles p on p.id = a.id
    where a.id = target_id;
end;
$$;

grant execute on function public.admin_add_admin(text) to authenticated;

-- Revokes admin access for the given user. Raises an exception for
-- non-admins or if the caller tries to remove themselves.
create or replace function public.admin_remove_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users where id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot remove yourself';
  end if;

  delete from public.admin_users where id = p_user_id;
end;
$$;

grant execute on function public.admin_remove_admin(uuid) to authenticated;
