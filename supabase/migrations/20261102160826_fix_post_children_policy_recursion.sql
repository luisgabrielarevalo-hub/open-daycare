create or replace function public.is_post_author(
  p_post_id uuid,
  p_daycare_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.author_id = auth.uid()
      and p.daycare_id = p_daycare_id
  );
$$;

revoke execute on function public.is_post_author(uuid, uuid) from public, anon;
grant execute on function public.is_post_author(uuid, uuid)
  to authenticated, service_role;

drop policy "post_children_insert_author" on public.post_children;

create policy "post_children_insert_author"
on public.post_children
for insert
to authenticated
with check (
  public.is_post_author(post_children.post_id, post_children.daycare_id)
);
