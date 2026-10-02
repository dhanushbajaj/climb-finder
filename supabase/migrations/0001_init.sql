-- Climb Finder schema. Run with `supabase db push` or paste into the SQL editor.
create extension if not exists postgis;

-- Profiles -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  height_cm numeric not null default 175 check (height_cm between 100 and 230),
  ape_index_cm numeric not null default 0 check (ape_index_cm between -30 and 40),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles are readable by their owner" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles are insertable by their owner" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles are editable by their owner" on public.profiles
  for update using (auth.uid() = id);

-- Gyms -----------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  address text,
  osm_id text unique,
  location geography(Point, 4326) not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index gyms_location_idx on public.gyms using gist (location);

alter table public.gyms enable row level security;
create policy "gyms are public" on public.gyms for select using (true);
create policy "signed-in users add gyms" on public.gyms
  for insert with check (auth.uid() = created_by);
create policy "creators edit gyms" on public.gyms
  for update using (auth.uid() = created_by);
create policy "creators delete gyms" on public.gyms
  for delete using (auth.uid() = created_by);

-- Climbs ---------------------------------------------------------------------
create table public.climbs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  grade text,
  wall_width_cm numeric not null check (wall_width_cm > 0),
  wall_height_cm numeric not null check (wall_height_cm > 0),
  wall_angle_deg numeric not null default 0 check (wall_angle_deg between -45 and 90),
  holds jsonb not null default '[]'::jsonb check (jsonb_typeof(holds) = 'array'),
  photo_path text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index climbs_gym_idx on public.climbs (gym_id);

alter table public.climbs enable row level security;
create policy "climbs are public" on public.climbs for select using (true);
create policy "signed-in users add climbs" on public.climbs
  for insert with check (auth.uid() = created_by);
create policy "creators edit climbs" on public.climbs
  for update using (auth.uid() = created_by);
create policy "creators delete climbs" on public.climbs
  for delete using (auth.uid() = created_by);

-- Nearby gyms ----------------------------------------------------------------
create or replace function public.nearby_gyms(lat double precision, lng double precision, radius_km double precision)
returns table (
  id uuid,
  name text,
  address text,
  osm_id text,
  lat double precision,
  lng double precision,
  distance_km double precision,
  climb_count bigint
)
language sql stable
as $$
  select
    g.id, g.name, g.address, g.osm_id,
    st_y(g.location::geometry) as lat,
    st_x(g.location::geometry) as lng,
    st_distance(g.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography) / 1000 as distance_km,
    (select count(*) from public.climbs c where c.gym_id = g.id) as climb_count
  from public.gyms g
  where st_dwithin(g.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography, radius_km * 1000)
  order by distance_km
  limit 200;
$$;

-- Read a gym with plain lat/lng (geography isn't JSON-friendly).
create or replace view public.gyms_view as
  select id, name, address, osm_id, created_by, created_at,
    st_y(location::geometry) as lat, st_x(location::geometry) as lng
  from public.gyms;

-- Wall photos ----------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('wall-photos', 'wall-photos', true)
  on conflict (id) do nothing;

create policy "wall photos are public" on storage.objects
  for select using (bucket_id = 'wall-photos');
-- Uploads go under "<user id>/..." so ownership is checkable from the path.
create policy "users upload their own wall photos" on storage.objects
  for insert with check (bucket_id = 'wall-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their own wall photos" on storage.objects
  for delete using (bucket_id = 'wall-photos' and (storage.foldername(name))[1] = auth.uid()::text);
