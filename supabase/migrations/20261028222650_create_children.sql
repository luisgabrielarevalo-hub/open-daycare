create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  slug text not null,
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null default current_date,
  medical_notes text,
  allergy_tags text[] not null default '{}',
  photo_consent boolean not null default true,
  status public.child_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint children_room_daycare_fkey
    foreign key (room_id, daycare_id)
    references public.rooms (id, daycare_id)
    on delete restrict,
  constraint children_daycare_slug_key unique (daycare_id, slug),
  constraint children_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index children_daycare_id_idx on public.children (daycare_id);
create index children_room_id_idx on public.children (room_id);

alter table public.children enable row level security;
