create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_daycare uuid;
  v_full_name text;
begin
  v_role := case new.raw_user_meta_data ->> 'role'
    when 'staff' then 'staff'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'parent'::public.user_role
  end;

  v_daycare := (new.raw_user_meta_data ->> 'daycare_id')::uuid;
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  if v_daycare is null
     or not exists (select 1 from public.daycares d where d.id = v_daycare) then
    raise exception 'daycare_id inválido en raw_user_meta_data';
  end if;

  insert into public.users (id, daycare_id, role, status, full_name)
  values (new.id, v_daycare, v_role, 'active', v_full_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
