create policy "invitations_select_staff_same_daycare"
on public.invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = invitations.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "invitations_insert_staff"
on public.invitations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = invitations.daycare_id
      and u.role in ('staff', 'admin')
  )
);

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
      and u.daycare_id = (
        select c.daycare_id from public.children c where c.id = parent_children.child_id
      )
  )
);
