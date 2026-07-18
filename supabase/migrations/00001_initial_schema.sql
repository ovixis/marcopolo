-- Marco Polo initial schema
-- Apply with: supabase db push (linked project) or supabase db reset (local stack)

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user; travelers and travel agents)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  home_currency text not null default 'USD',
  is_agent boolean not null default false,
  -- Agent-only fields
  agency_name text,
  bio text,
  specialties text[] not null default '{}',
  regions text[] not null default '{}',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  destination text not null default '',
  start_date date not null,
  end_date date not null,
  cover_photo_url text,
  currency text not null default 'USD',
  budget_total numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates check (end_date >= start_date)
);

create index trips_owner_idx on public.trips (owner_id);

alter table public.trips enable row level security;

create policy "Owners have full access to their trips"
  on public.trips for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- Reusable check: does the current user own the trip?
create or replace function public.owns_trip(trip uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.trips t
    where t.id = trip and t.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Itinerary items (drag-drop planner)
-- ---------------------------------------------------------------------------

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null check (kind in ('flight', 'hotel', 'experience', 'restaurant', 'transport', 'note')),
  title text not null,
  day integer not null check (day >= 1),
  position integer not null default 0,
  start_time time,
  end_time time,
  location text,
  notes text,
  cost numeric(12, 2),
  provider_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index itinerary_items_trip_idx on public.itinerary_items (trip_id, day, position);

alter table public.itinerary_items enable row level security;

create policy "Trip owners manage itinerary items"
  on public.itinerary_items for all
  to authenticated
  using (public.owns_trip(trip_id))
  with check (public.owns_trip(trip_id));

create trigger itinerary_items_set_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Expenses (budget tracker)
-- ---------------------------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  category text not null check (category in ('flights', 'lodging', 'food', 'activities', 'transport', 'shopping', 'other')),
  description text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  amount_in_trip_currency numeric(12, 2) not null,
  exchange_rate numeric(12, 6),
  date date not null,
  itinerary_item_id uuid references public.itinerary_items (id) on delete set null,
  created_at timestamptz not null default now()
);

create index expenses_trip_idx on public.expenses (trip_id, date);

alter table public.expenses enable row level security;

create policy "Trip owners manage expenses"
  on public.expenses for all
  to authenticated
  using (public.owns_trip(trip_id))
  with check (public.owns_trip(trip_id));

-- ---------------------------------------------------------------------------
-- Trip photos (metadata; binaries live in the trip-photos storage bucket)
-- ---------------------------------------------------------------------------

create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  caption text,
  taken_at timestamptz,
  latitude double precision,
  longitude double precision,
  width integer,
  height integer,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index trip_photos_trip_idx on public.trip_photos (trip_id, taken_at);

alter table public.trip_photos enable row level security;

create policy "Owners manage their trip photos"
  on public.trip_photos for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.owns_trip(trip_id));

-- ---------------------------------------------------------------------------
-- Journal entries (AI synthesis via Claude Vision)
-- ---------------------------------------------------------------------------

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  day integer check (day >= 1),
  title text not null default '',
  user_notes text,
  ai_narrative text,
  photo_ids uuid[] not null default '{}',
  model text,
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_entries_trip_idx on public.journal_entries (trip_id, day);

alter table public.journal_entries enable row level security;

create policy "Owners manage their journal entries"
  on public.journal_entries for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.owns_trip(trip_id));

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Travel agent messaging (MVP)
-- ---------------------------------------------------------------------------

create table public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips (id) on delete set null,
  traveler_id uuid not null references public.profiles (id) on delete cascade,
  agent_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_threads_traveler_idx on public.agent_threads (traveler_id);
create index agent_threads_agent_idx on public.agent_threads (agent_id);

alter table public.agent_threads enable row level security;

create policy "Participants read their threads"
  on public.agent_threads for select
  to authenticated
  using (traveler_id = auth.uid() or agent_id = auth.uid());

create policy "Travelers open threads"
  on public.agent_threads for insert
  to authenticated
  with check (traveler_id = auth.uid());

create policy "Participants update their threads"
  on public.agent_threads for update
  to authenticated
  using (traveler_id = auth.uid() or agent_id = auth.uid())
  with check (traveler_id = auth.uid() or agent_id = auth.uid());

create trigger agent_threads_set_updated_at
  before update on public.agent_threads
  for each row execute function public.set_updated_at();

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.agent_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  attachments text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index agent_messages_thread_idx on public.agent_messages (thread_id, created_at);

alter table public.agent_messages enable row level security;

create or replace function public.in_thread(thread uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.agent_threads t
    where t.id = thread and (t.traveler_id = auth.uid() or t.agent_id = auth.uid())
  );
$$;

create policy "Participants read thread messages"
  on public.agent_messages for select
  to authenticated
  using (public.in_thread(thread_id));

create policy "Participants send messages as themselves"
  on public.agent_messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.in_thread(thread_id));

create policy "Recipients mark messages read"
  on public.agent_messages for update
  to authenticated
  using (public.in_thread(thread_id))
  with check (public.in_thread(thread_id));

-- ---------------------------------------------------------------------------
-- Storage: private bucket for trip photos, one folder per user id
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', false)
on conflict (id) do nothing;

create policy "Users manage files in their own folder"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text);
