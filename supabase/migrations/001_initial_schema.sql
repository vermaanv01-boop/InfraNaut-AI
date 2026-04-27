-- ============================================================
-- InfraNaut AI — Supabase Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  zone          text,
  total_points  integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by all auth users"
  on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- AI CONVERSATIONS
-- ============================================================
create table if not exists public.ai_conversations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  title       text,
  tags        text[],
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.ai_conversations enable row level security;
create policy "Users manage own conversations"
  on public.ai_conversations for all using (auth.uid() = user_id);

-- ============================================================
-- AI MESSAGES
-- ============================================================
create table if not exists public.ai_messages (
  id                uuid primary key default uuid_generate_v4(),
  conversation_id   uuid references public.ai_conversations(id) on delete cascade,
  role              text not null check (role in ('user','assistant')),
  content           text not null,
  created_at        timestamptz default now()
);

alter table public.ai_messages enable row level security;
create policy "Users access own conversation messages"
  on public.ai_messages for all
  using (
    exists (
      select 1 from public.ai_conversations
      where id = ai_messages.conversation_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- CHAT ROOMS
-- ============================================================
create table if not exists public.chat_rooms (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  type        text default 'topic',
  description text,
  created_at  timestamptz default now()
);

alter table public.chat_rooms enable row level security;
create policy "All auth users can view rooms"
  on public.chat_rooms for select using (auth.role() = 'authenticated');

-- Seed default rooms
insert into public.chat_rooms (id, name, type, description) values
  ('00000000-0000-0000-0000-000000000001', 'General',        'topic', 'City-wide discussions'),
  ('00000000-0000-0000-0000-000000000002', 'Traffic',        'topic', 'Road & transport updates'),
  ('00000000-0000-0000-0000-000000000003', 'Garbage',        'topic', 'Waste management issues'),
  ('00000000-0000-0000-0000-000000000004', 'Water',          'topic', 'Water supply problems'),
  ('00000000-0000-0000-0000-000000000005', 'Arera Colony',   'ward',  'Ward discussions'),
  ('00000000-0000-0000-0000-000000000006', 'Habibganj',      'ward',  'Ward discussions')
on conflict (id) do nothing;

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
create table if not exists public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  room_id     text not null,
  user_id     uuid references public.profiles(id) on delete set null,
  content     text not null,
  is_nexora   boolean default false,
  created_at  timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Auth users can view chat messages"
  on public.chat_messages for select using (auth.role() = 'authenticated');
create policy "Auth users can insert chat messages"
  on public.chat_messages for insert with check (auth.role() = 'authenticated');

-- Enable realtime for chat_messages
alter publication supabase_realtime add table public.chat_messages;

-- ============================================================
-- REPORTS
-- ============================================================
create table if not exists public.reports (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete set null,
  category    text not null check (category in ('garbage','traffic','pollution','water','road','other')),
  description text not null,
  image_url   text,
  latitude    float8 not null,
  longitude   float8 not null,
  status      text default 'pending' check (status in ('pending','verified','resolved')),
  zone        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.reports enable row level security;
create policy "Auth users can view all reports"
  on public.reports for select using (auth.role() = 'authenticated');
create policy "Auth users can create reports"
  on public.reports for insert with check (auth.uid() = user_id);
create policy "Users can update own reports"
  on public.reports for update using (auth.uid() = user_id);

-- Enable realtime for reports
alter publication supabase_realtime add table public.reports;

-- ============================================================
-- ECO ROUTES
-- ============================================================
create table if not exists public.eco_routes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade,
  origin        text not null,
  destination   text not null,
  suggestion    jsonb,
  created_at    timestamptz default now()
);

alter table public.eco_routes enable row level security;
create policy "Users manage own eco routes"
  on public.eco_routes for all using (auth.uid() = user_id);

-- ============================================================
-- POINT TRANSACTIONS
-- ============================================================
create table if not exists public.point_transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade,
  action        text not null,
  points        integer not null,
  reference_id  uuid,
  created_at    timestamptz default now()
);

alter table public.point_transactions enable row level security;
create policy "Users view own transactions"
  on public.point_transactions for select using (auth.uid() = user_id);
create policy "Authenticated users can insert transactions"
  on public.point_transactions for insert with check (auth.uid() = user_id);

-- ============================================================
-- BADGES
-- ============================================================
create table if not exists public.badges (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  badge_type  text not null,
  earned_at   timestamptz default now(),
  unique(user_id, badge_type)
);

alter table public.badges enable row level security;
create policy "Auth users can view badges"
  on public.badges for select using (auth.role() = 'authenticated');
create policy "Users can insert own badges"
  on public.badges for insert with check (auth.uid() = user_id);

-- ============================================================
-- PREDICTIONS
-- ============================================================
create table if not exists public.predictions (
  id            uuid primary key default uuid_generate_v4(),
  zone          text,
  category      text,
  risk_score    float default 0,
  insight       text,
  weather_data  jsonb,
  report_count  integer default 0,
  created_at    timestamptz default now()
);

alter table public.predictions enable row level security;
create policy "Auth users can view predictions"
  on public.predictions for select using (auth.role() = 'authenticated');
create policy "Auth users can insert predictions"
  on public.predictions for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- HELPER FUNCTION: Increment user points
-- ============================================================
create or replace function public.increment_user_points(uid uuid, pts integer)
returns void language sql security definer as $$
  update public.profiles set total_points = total_points + pts, updated_at = now()
  where id = uid;
$$;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name, total_points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET for report images
-- ============================================================
insert into storage.buckets (id, name, public) values ('report-images', 'report-images', true)
on conflict (id) do nothing;

create policy "Anyone can view report images"
  on storage.objects for select using (bucket_id = 'report-images');
create policy "Auth users can upload report images"
  on storage.objects for insert with check (bucket_id = 'report-images' and auth.role() = 'authenticated');
