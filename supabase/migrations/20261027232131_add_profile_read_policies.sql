create policy "users_select_own"
on public.users
for select
to authenticated
using (auth.uid() = id);

create policy "daycares_select_own"
on public.daycares
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.daycare_id = daycares.id
  )
);
