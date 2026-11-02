alter table public.users
  add constraint users_id_daycare_key unique (id, daycare_id);

alter table public.children
  add constraint children_id_daycare_key unique (id, daycare_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  author_name text not null,
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  type public.post_type not null,
  audience_kind public.post_audience not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_author_daycare_fkey
    foreign key (author_id, daycare_id)
    references public.users (id, daycare_id)
    on delete restrict,
  constraint posts_id_daycare_key unique (id, daycare_id),
  constraint posts_body_length_check
    check (char_length(btrim(body, E' \t\n\r')) between 1 and 1000)
);

create index posts_daycare_published_idx
  on public.posts (daycare_id, published_at desc);
create index posts_author_id_idx on public.posts (author_id);

alter table public.posts enable row level security;

create or replace function public.set_post_author_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select u.full_name
  into new.author_name
  from public.users u
  where u.id = new.author_id;

  if new.author_name is null then
    raise exception 'invalid_author' using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger posts_set_author_name
before insert on public.posts
for each row
execute function public.set_post_author_name();

create table public.post_children (
  post_id uuid not null,
  child_id uuid not null,
  daycare_id uuid not null,
  constraint post_children_pkey primary key (post_id, child_id),
  constraint post_children_post_daycare_fkey
    foreign key (post_id, daycare_id)
    references public.posts (id, daycare_id)
    on delete cascade,
  constraint post_children_child_daycare_fkey
    foreign key (child_id, daycare_id)
    references public.children (id, daycare_id)
    on delete cascade
);

create index post_children_child_id_idx
  on public.post_children (child_id);

alter table public.post_children enable row level security;

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.posts (id) on delete cascade,
  path text not null,
  position smallint not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint post_photos_path_key unique (path),
  constraint post_photos_post_position_key unique (post_id, position),
  constraint post_photos_position_check check (position between 0 and 3)
);

create index post_photos_post_id_idx on public.post_photos (post_id);

alter table public.post_photos enable row level security;
