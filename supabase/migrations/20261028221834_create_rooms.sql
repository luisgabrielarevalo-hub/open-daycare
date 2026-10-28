create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  constraint rooms_daycare_name_key unique (daycare_id, name),
  constraint rooms_id_daycare_key unique (id, daycare_id)
);

create index rooms_daycare_id_idx on public.rooms (daycare_id);

alter table public.rooms enable row level security;
