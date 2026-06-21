-- Create table for theme-scoped character stats
create table if not exists public.character_stats (
  user_id uuid references auth.users on delete cascade not null,
  theme text not null,
  stats jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, theme)
);

-- Enable Row Level Security (RLS)
alter table public.character_stats enable row level security;

-- Drop existing policies if they exist (to avoid replication errors on re-run)
drop policy if exists "Users can select their own stats" on public.character_stats;
drop policy if exists "Users can insert their own stats" on public.character_stats;
drop policy if exists "Users can update their own stats" on public.character_stats;

-- Create policies for RLS
create policy "Users can select their own stats" on public.character_stats
  for select using (auth.uid() = user_id);

create policy "Users can insert their own stats" on public.character_stats
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own stats" on public.character_stats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
