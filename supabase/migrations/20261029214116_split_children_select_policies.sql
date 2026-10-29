drop policy "children_select_same_daycare" on public.children;

create policy "children_select_staff_same_daycare"
on public.children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = children.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "children_select_parent_linked"
on public.children
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_children pc
    where pc.child_id = children.id
      and pc.parent_id = auth.uid()
  )
);
