-- Fix "structure of query does not match function result type" in
-- admin_list_disputes/admin_list_users: auth.users.email is varchar(255),
-- but the functions declare it as text.

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
      creator_u.email::text,
      creator.handle,
      counterparty_u.email::text,
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
      u.email::text,
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
