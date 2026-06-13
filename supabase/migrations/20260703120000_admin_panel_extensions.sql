-- Admin panel: extend dashboard stats + add list RPCs for feedback, disputes, users

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
    ),
    'promise_groups_count', (select count(*) from public.promise_groups),
    'promises_in_groups_count', (select count(*) from public.promises where group_id is not null),
    'invite_status_counts', (
      select coalesce(jsonb_object_agg(coalesce(invite_status, 'none'), cnt), '{}'::jsonb)
      from (
        select invite_status, count(*) as cnt
        from public.promises
        group by invite_status
      ) i
    ),
    'deal_invites_status_counts', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (
        select status, count(*) as cnt
        from public.deal_invites
        group by status
      ) di
    ),
    'email_send_status_counts_30d', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (
        select status, count(*) as cnt
        from public.notification_email_sends
        where created_at >= now() - interval '30 days'
        group by status
      ) e
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_dashboard_stats(int) to authenticated;

-- Lists feedback submissions, newest first.
create or replace function public.admin_list_feedback(p_limit int default 50, p_offset int default 0)
returns table (
  id uuid,
  created_at timestamptz,
  category text,
  message text,
  page_url text,
  locale text,
  allow_contact boolean,
  user_email text,
  user_handle_or_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users au where au.id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select
      f.id,
      f.created_at,
      f.category,
      f.message,
      f.page_url,
      f.locale,
      f.allow_contact,
      f.user_email,
      f.user_handle_or_name
    from public.feedback f
    order by f.created_at desc
    limit p_limit offset p_offset;
end;
$$;

grant execute on function public.admin_list_feedback(int, int) to authenticated;

-- Lists disputed agreements, newest first.
create or replace function public.admin_list_disputes(p_limit int default 50, p_offset int default 0)
returns table (
  id uuid,
  title text,
  disputed_at timestamptz,
  disputed_code text,
  dispute_reason text,
  due_at timestamptz,
  creator_email text,
  creator_handle text,
  counterparty_email text,
  counterparty_handle text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users au where au.id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select
      p.id,
      p.title,
      p.disputed_at,
      p.disputed_code,
      p.dispute_reason,
      p.due_at,
      creator_u.email,
      creator.handle,
      counterparty_u.email,
      counterparty.handle
    from public.promises p
    left join public.profiles creator on creator.id = p.creator_id
    left join auth.users creator_u on creator_u.id = p.creator_id
    left join public.profiles counterparty on counterparty.id = p.counterparty_id
    left join auth.users counterparty_u on counterparty_u.id = p.counterparty_id
    where p.status = 'disputed'
    order by p.disputed_at desc nulls last
    limit p_limit offset p_offset;
end;
$$;

grant execute on function public.admin_list_disputes(int, int) to authenticated;

-- Lists users with their reputation and agreement counts. Supports a search
-- over email, display name, and handle.
create or replace function public.admin_list_users(p_limit int default 50, p_offset int default 0, p_search text default null)
returns table (
  id uuid,
  email text,
  display_name text,
  handle text,
  created_at timestamptz,
  reputation_score int,
  agreements_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users au where au.id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select
      pr.id,
      u.email,
      pr.display_name,
      pr.handle,
      pr.created_at,
      coalesce(r.score, 50) as reputation_score,
      (
        select count(*) from public.promises pm
        where pm.creator_id = pr.id
           or pm.counterparty_id = pr.id
           or pm.promisor_id = pr.id
           or pm.promisee_id = pr.id
      ) as agreements_count
    from public.profiles pr
    join auth.users u on u.id = pr.id
    left join public.user_reputation r on r.user_id = pr.id
    where p_search is null
       or u.email ilike '%' || p_search || '%'
       or pr.display_name ilike '%' || p_search || '%'
       or pr.handle ilike '%' || p_search || '%'
    order by pr.created_at desc
    limit p_limit offset p_offset;
end;
$$;

grant execute on function public.admin_list_users(int, int, text) to authenticated;
