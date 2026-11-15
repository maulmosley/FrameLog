-- FrameLog schema. Paste into Supabase > SQL Editor > New query > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  created_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  original_title text,
  release_year int check (release_year between 1888 and 2100),
  director text,
  genres text[] not null default '{}',
  country text,
  runtime int check (runtime > 0),
  poster_url text,
  watched_date date not null,
  rating numeric(2,1) not null check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  review text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);
-- Blocks duplicate films (same title + year) per user.
create unique index if not exists diary_no_dupes
  on public.diary_entries (user_id, lower(trim(title)), coalesce(release_year, 0));
create index if not exists diary_user_idx on public.diary_entries (user_id, watched_date desc);

create table if not exists public.top_four (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  diary_entry_id uuid not null references public.diary_entries(id) on delete cascade,
  position int not null check (position between 1 and 4),
  unique (user_id, position),
  unique (user_id, diary_entry_id)
);

-- Row Level Security: every user only sees and changes their own rows.
alter table public.profiles enable row level security;
alter table public.diary_entries enable row level security;
alter table public.top_four enable row level security;

drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own diary" on public.diary_entries;
create policy "own diary" on public.diary_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own top four" on public.top_four;
create policy "own top four" on public.top_four for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.diary_entries d where d.id = diary_entry_id and d.user_id = (select auth.uid()))
  );

-- Auto-create a profile when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
