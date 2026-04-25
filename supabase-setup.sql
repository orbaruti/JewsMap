-- ============================================================
-- JewsMap Supabase Setup
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Profiles table (synced from auth.users on first login)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. Submissions table
create type submission_type as enum ('new_person', 'edit_person', 'add_source', 'add_note');
create type submission_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type submission_type not null,
  era_id int not null,
  person_id text,
  data jsonb not null default '{}',
  status submission_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

-- 3. Approved content table
create table if not exists public.approved_content (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references public.submissions(id) on delete set null,
  era_id int not null,
  person_id text,
  content_type submission_type not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.approved_content enable row level security;

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Profiles: everyone can read, users can update their own
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Submissions: users can insert their own, read their own; admin reads all
create policy "Users can insert own submissions"
  on public.submissions for insert
  with check (auth.uid() = user_id);

create policy "Users can view own submissions"
  on public.submissions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admin can update any submission"
  on public.submissions for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Approved content: everyone can read; admin can insert/delete
create policy "Approved content is viewable by everyone"
  on public.approved_content for select using (true);

create policy "Admin can insert approved content"
  on public.approved_content for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admin can delete approved content"
  on public.approved_content for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ============================================================
-- Trigger: auto-create profile on signup + assign admin role
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case when new.email = 'orbaruti@gmail.com' then 'admin' else 'user' end
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Trigger: auto-update updated_at on submissions
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_submission_updated on public.submissions;
create trigger on_submission_updated
  before update on public.submissions
  for each row execute function public.handle_updated_at();
