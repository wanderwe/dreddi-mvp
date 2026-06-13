-- Fix "column reference id is ambiguous" and email type mismatch in admin_add_admin.

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
  if not exists (select 1 from public.admin_users au where au.id = auth.uid()) then
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
    select a.id, u.email::text, p.display_name, p.handle, a.created_at
    from public.admin_users a
    join auth.users u on u.id = a.id
    left join public.profiles p on p.id = a.id
    where a.id = target_id;
end;
$$;

grant execute on function public.admin_add_admin(text) to authenticated;
