create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null
    references public.children (id) on delete cascade,
  daycare_id uuid not null
    references public.daycares (id) on delete restrict,
  invited_by uuid not null
    references public.users (id) on delete restrict,
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code text not null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_code_key unique (code),
  constraint invitations_code_format_check check (code ~ '^[A-Z0-9]{5}$')
);

create index invitations_child_id_idx on public.invitations (child_id);
create index invitations_daycare_id_idx on public.invitations (daycare_id);
create index invitations_email_idx on public.invitations (email);

alter table public.invitations enable row level security;
