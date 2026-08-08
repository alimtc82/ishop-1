drop function if exists public.branch_sellers();

create function public.branch_sellers()
returns table(display_name text, branch text)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select u.branch, public.is_admin() as admin
    from public.ishop_users u
    where u.auth_id = auth.uid() and u.is_active = true
    limit 1
  )
  select u.display_name, u.branch
  from public.ishop_users u
  cross join me
  where u.is_active = true
    and coalesce(u.display_name, '') <> ''
    and (me.admin or u.branch is not distinct from me.branch)
  order by u.display_name;
$$;

revoke all on function public.branch_sellers() from public;
grant execute on function public.branch_sellers() to authenticated;
