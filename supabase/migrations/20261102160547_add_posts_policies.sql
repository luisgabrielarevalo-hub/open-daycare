create policy "posts_select_staff_same_daycare"
on public.posts
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = posts.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "posts_select_parent_visible"
on public.posts
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = posts.daycare_id
      and u.role = 'parent'
  )
  and (
    (
      posts.audience_kind = 'daycare'
      and exists (
        select 1
        from public.parent_children pch
        join public.children c on c.id = pch.child_id
        where pch.parent_id = (select auth.uid())
          and c.daycare_id = posts.daycare_id
          and c.status = 'active'
      )
    )
    or exists (
      select 1
      from public.post_children pc
      join public.parent_children pch on pch.child_id = pc.child_id
      where pc.post_id = posts.id
        and pch.parent_id = (select auth.uid())
    )
  )
);

create policy "posts_insert_staff"
on public.posts
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = posts.daycare_id
      and u.role in ('staff', 'admin')
      and u.status = 'active'
  )
);

create policy "post_children_select_staff_same_daycare"
on public.post_children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.daycare_id = post_children.daycare_id
      and u.role in ('staff', 'admin')
  )
);

create policy "post_children_select_parent_linked"
on public.post_children
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_children pch
    where pch.child_id = post_children.child_id
      and pch.parent_id = (select auth.uid())
  )
);

create policy "post_children_insert_author"
on public.post_children
for insert
to authenticated
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_children.post_id
      and p.author_id = (select auth.uid())
      and p.daycare_id = post_children.daycare_id
  )
);

create policy "post_photos_select_visible_post"
on public.post_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_photos.post_id
  )
);

create policy "post_photos_insert_author"
on public.post_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.posts p
    join public.users u on u.id = (select auth.uid())
    where p.id = post_photos.post_id
      and p.author_id = (select auth.uid())
      and u.daycare_id = p.daycare_id
      and u.daycare_id::text = split_part(post_photos.path, '/', 1)
  )
);
