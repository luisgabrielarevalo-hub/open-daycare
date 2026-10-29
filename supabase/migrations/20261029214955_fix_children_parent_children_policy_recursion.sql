create or replace function public.is_parent_of_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_children pc
    where pc.child_id = p_child_id
      and pc.parent_id = auth.uid()
  );
$$;

create or replace function public.child_daycare_id(p_child_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.daycare_id
  from public.children c
  where c.id = p_child_id;
$$;

revoke execute on function public.is_parent_of_child(uuid) from public;
revoke execute on function public.child_daycare_id(uuid) from public;
grant execute on function public.is_parent_of_child(uuid) to authenticated, service_role;
grant execute on function public.child_daycare_id(uuid) to authenticated, service_role;

drop policy "children_select_parent_linked" on public.children;

create policy "children_select_parent_linked"
on public.children
for select
to authenticated
using (public.is_parent_of_child(children.id));

drop policy "parent_children_select_own_or_staff" on public.parent_children;

create policy "parent_children_select_own_or_staff"
on public.parent_children
for select
to authenticated
using (
  parent_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('staff', 'admin')
      and u.daycare_id = public.child_daycare_id(parent_children.child_id)
  )
);
