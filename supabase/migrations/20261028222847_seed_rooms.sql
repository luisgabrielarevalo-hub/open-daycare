do $$
begin
  if not exists (
    select 1 from public.daycares where name = 'Guardería Sala Soles'
  ) then
    raise exception 'Falta la guardería Sala Soles; ejecutar seed_daycares';
  end if;
end
$$;

insert into public.rooms (daycare_id, name)
select d.id, v.name
from public.daycares d
cross join (values ('Soles'), ('Lunas'), ('Estrellas')) as v(name)
where d.name = 'Guardería Sala Soles'
  and not exists (
    select 1
    from public.rooms r
    where r.daycare_id = d.id
      and r.name = v.name
  );
