create or replace function public.create_post(
  p_type public.post_type,
  p_audience_kind public.post_audience,
  p_body text,
  p_child_ids uuid[] default '{}',
  p_photo_paths text[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_body text;
  v_post_id uuid := gen_random_uuid();
  v_child_count integer;
  v_photo_count integer;
begin
  select u.*
  into v_user
  from public.users u
  where u.id = (select auth.uid());

  if v_user.id is null
     or v_user.role not in ('staff', 'admin')
     or v_user.status <> 'active' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  v_body := btrim(coalesce(p_body, ''), E' \t\n\r');

  if char_length(v_body) = 0 or char_length(v_body) > 1000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  p_child_ids := coalesce(p_child_ids, '{}');
  p_photo_paths := coalesce(p_photo_paths, '{}');
  v_child_count := coalesce(array_length(p_child_ids, 1), 0);
  v_photo_count := coalesce(array_length(p_photo_paths, 1), 0);

  if v_photo_count > 4 then
    raise exception 'too_many_photos' using errcode = '22023';
  end if;

  if p_audience_kind = 'daycare' then
    if v_child_count <> 0 then
      raise exception 'invalid_children' using errcode = '22023';
    end if;
  else
    if v_child_count = 0 then
      raise exception 'children_required' using errcode = '22023';
    end if;

    if (
      select count(distinct child_id)
      from unnest(p_child_ids) as child_id
    ) <> v_child_count then
      raise exception 'invalid_children' using errcode = '22023';
    end if;

    if exists (
      select 1
      from unnest(p_child_ids) as child_id
      where not exists (
        select 1
        from public.children c
        where c.id = child_id
          and c.daycare_id = v_user.daycare_id
          and c.status = 'active'
      )
    ) then
      raise exception 'invalid_children' using errcode = '22023';
    end if;
  end if;

  if v_photo_count > 0 then
    if p_audience_kind = 'daycare' then
      if exists (
        select 1
        from public.children c
        where c.daycare_id = v_user.daycare_id
          and c.status = 'active'
          and not c.photo_consent
      ) then
        raise exception 'photo_consent_missing' using errcode = '22023';
      end if;
    elsif exists (
      select 1
      from public.children c
      where c.id = any(p_child_ids)
        and not c.photo_consent
    ) then
      raise exception 'photo_consent_missing' using errcode = '22023';
    end if;

    if exists (
      select 1
      from unnest(p_photo_paths) as path
      where split_part(path, '/', 1) <> v_user.daycare_id::text
    ) then
      raise exception 'invalid_photo_path' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.post_photos pp
      where pp.path = any(p_photo_paths)
    ) then
      raise exception 'photo_path_in_use' using errcode = '23505';
    end if;
  end if;

  insert into public.posts (
    id,
    author_id,
    author_name,
    daycare_id,
    type,
    audience_kind,
    body
  )
  values (
    v_post_id,
    v_user.id,
    v_user.full_name,
    v_user.daycare_id,
    p_type,
    p_audience_kind,
    v_body
  );

  if p_audience_kind = 'children' then
    insert into public.post_children (post_id, child_id, daycare_id)
    select v_post_id, child_id, v_user.daycare_id
    from unnest(p_child_ids) as child_id;
  end if;

  if v_photo_count > 0 then
    insert into public.post_photos (post_id, path, position)
    select v_post_id, path, (ordinality - 1)::smallint
    from unnest(p_photo_paths) with ordinality as photo(path, ordinality);
  end if;

  return v_post_id;
end;
$$;

revoke all on function public.create_post(
  public.post_type,
  public.post_audience,
  text,
  uuid[],
  text[]
) from public, anon;

grant execute on function public.create_post(
  public.post_type,
  public.post_audience,
  text,
  uuid[],
  text[]
) to authenticated;
