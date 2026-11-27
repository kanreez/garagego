alter table public.garages add column if not exists hidden boolean not null default false;
alter table public.garages add column if not exists deleted_at timestamptz;

alter table public.bookings add column if not exists left_early_at timestamptz;
