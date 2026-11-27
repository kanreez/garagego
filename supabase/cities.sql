alter table public.garages add column if not exists city text not null default 'Sofia';
create index if not exists garages_city_idx on public.garages (city);

insert into public.garages (title, area, city, latitude, longitude, size, covered, price_hour, price_day, access)
select * from (values
  ('Garage near the Old Town (sample)', 'Center', 'Plovdiv', 42.1478, 24.7495, 'medium', true, 2.5, 15, 'manual'),
  ('Garage by the Sea Garden (sample)', 'Center', 'Varna', 43.2043, 27.9196, 'large', true, 3, 18, 'manual')
) as v(title, area, city, latitude, longitude, size, covered, price_hour, price_day, access)
where not exists (select 1 from public.garages g where g.title = v.title);
