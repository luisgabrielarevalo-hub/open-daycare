insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "post_photos_insert_staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role in ('staff', 'admin')
      and u.status = 'active'
      and u.daycare_id::text = (storage.foldername(name))[1]
  )
);

create policy "post_photos_select_visible"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-photos'
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.path = storage.objects.name
      and p.daycare_id::text = (storage.foldername(name))[1]
  )
);
