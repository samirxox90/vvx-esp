-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create admin allowlist table
create table public.admin_allowlist (
  email text primary key check (email ~* '^[^@]+@gmail\.com$'),
  added_at timestamptz default now() not null
);

-- Enable RLS on admin_allowlist
alter table public.admin_allowlist enable row level security;

-- Create player_stats table
create table public.player_stats (
  id uuid primary key default uuid_generate_v4(),
  player_id text not null unique,
  codename text not null,
  stats jsonb not null default '{}'::jsonb,
  trends jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now() not null
);

-- Enable RLS on player_stats
alter table public.player_stats enable row level security;

-- Create is_admin() security definer function
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist
    where email = (select email from auth.users where id = auth.uid())
  );
$$;

-- RLS policies for profiles
create policy "Users can view all profiles"
  on public.profiles
  for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- RLS policies for admin_allowlist
create policy "Admins can view admin allowlist"
  on public.admin_allowlist
  for select
  using (public.is_admin());

-- RLS policies for player_stats
create policy "Admins can view player stats"
  on public.player_stats
  for select
  using (public.is_admin());

create policy "Admins can create player stats"
  on public.player_stats
  for insert
  with check (public.is_admin());

create policy "Admins can update player stats"
  on public.player_stats
  for update
  using (public.is_admin());

create policy "Admins can delete player stats"
  on public.player_stats
  for delete
  using (public.is_admin());

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at triggers
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger set_player_stats_updated_at
  before update on public.player_stats
  for each row
  execute function public.handle_updated_at();

-- Create trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();