do $$
begin
  if not exists (
    select 1 from public.daycares where name = 'Guardería Sala Soles'
  ) then
    raise exception 'Falta la guardería Sala Soles; ejecutar seed_daycares';
  end if;
end
$$;

with demo as (
  select
    '00000000-0000-4000-8000-000000000001'::uuid as user_id,
    'luisarevalo@google.com'::text as email,
    'Luis Arévalo'::text as full_name,
    (
      select id
      from public.daycares
      where name = 'Guardería Sala Soles'
      order by created_at, id
      limit 1
    ) as daycare_id,
    '$2a$10$q9UE9LX4X6RmKc0y5NgsBumk68OTzUfHRdy.vcZog1RbhI.j41Ohm'::text as password_hash
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  d.user_id,
  'authenticated',
  'authenticated',
  d.email,
  d.password_hash,
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object(
    'full_name', d.full_name,
    'role', 'staff',
    'daycare_id', d.daycare_id
  ),
  now(),
  now(),
  '',
  '',
  '',
  ''
from demo d
where d.daycare_id is not null
  and not exists (
    select 1 from auth.users u where u.email = d.email
  );

insert into auth.identities (
  user_id, identity_data, provider, provider_id, created_at, updated_at
)
select
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  u.id::text,
  now(),
  now()
from auth.users u
where u.email = 'luisarevalo@google.com'
on conflict (provider_id, provider) do nothing;

insert into public.users (id, daycare_id, role, status, full_name)
select
  u.id,
  (
    select id
    from public.daycares
    where name = 'Guardería Sala Soles'
    order by created_at, id
    limit 1
  ),
  'staff',
  'active',
  'Luis Arévalo'
from auth.users u
where u.email = 'luisarevalo@google.com'
on conflict (id) do nothing;
