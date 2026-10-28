create policy "rooms_select_same_daycare"
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = rooms.daycare_id
  )
);

create policy "children_select_same_daycare"
on public.children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = children.daycare_id
  )
);

create policy "children_insert_staff"
on public.children
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = children.daycare_id
      and u.role in ('staff', 'admin')
  )
);
