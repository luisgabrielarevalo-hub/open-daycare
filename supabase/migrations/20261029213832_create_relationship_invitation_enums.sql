create type public.relationship_type as enum ('father', 'mother', 'guardian');

create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');
