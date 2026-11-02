create type public.post_type as enum (
  'meal',
  'nap',
  'activity',
  'achievement',
  'mood',
  'photo',
  'announcement'
);

create type public.post_audience as enum ('children', 'daycare');
