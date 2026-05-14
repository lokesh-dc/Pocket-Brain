-- Enable pgvector extension
create extension if not exists vector;

-- Categories table
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  icon text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Entries table
create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  raw_text text not null,
  category_id uuid references categories(id),
  summary text,
  amount numeric,
  currency text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  embedding vector(1536),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Entities table
create table entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text check (type in ('book', 'place', 'project', 'brand', 'person')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, name, type)
);

-- Entry Entities junction table
create table entry_entities (
  entry_id uuid references entries(id) on delete cascade not null,
  entity_id uuid references entities(id) on delete cascade not null,
  primary key (entry_id, entity_id)
);

-- RLS Policies

-- Categories
alter table categories enable row level security;
create policy "Users can only access their own categories" on categories
  for all using (auth.uid() = user_id);

-- Entries
alter table entries enable row level security;
create policy "Users can only access their own entries" on entries
  for all using (auth.uid() = user_id);

-- Entities
alter table entities enable row level security;
create policy "Users can only access their own entities" on entities
  for all using (auth.uid() = user_id);

-- Entry Entities
alter table entry_entities enable row level security;
create policy "Users can only access their own entry_entities" on entry_entities
  for all using (
    exists (
      select 1 from entries
      where entries.id = entry_entities.entry_id
      and entries.user_id = auth.uid()
    )
  );

-- Default categories function (to be called on user signup or manually)
-- This is a helper, not strictly requested but good for "is_default"

-- User Profiles table
create table user_profiles (
  id uuid primary key references auth.users not null,
  full_name text,
  setup_complete boolean default false,
  default_categories text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_profiles enable row level security;
create policy "Users can only access their own profile" on user_profiles
  for all using (auth.uid() = id);

-- Function to handle new user profile creation
create or function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
