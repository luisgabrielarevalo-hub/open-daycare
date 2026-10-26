insert into public.daycares (name)
select v.name
from (
  values
    ('Guardería Sala Soles'),
    ('Guardería Rayito de Sol'),
    ('Guardería Los Girasoles'),
    ('Guardería Pequeños Pasos')
) as v(name)
where not exists (
  select 1
  from public.daycares d
  where d.name = v.name
);
