-- ── 1. Create Marketplace Requests Table ──────────────────
create table if not exists marketplace_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  plant_name text not null,
  disease text not null,
  treatment_needed text not null,
  quantity text default '1 unit',
  description text,
  status text default 'active', -- 'active', 'completed', 'cancelled'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table marketplace_requests enable row level security;

-- Policies for marketplace_requests
create policy "Allow all authenticated users to read active requests"
  on marketplace_requests for select
  to authenticated
  using (true);

create policy "Allow farmers to create requests"
  on marketplace_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Allow owners to update their requests"
  on marketplace_requests for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Allow owners to delete their requests"
  on marketplace_requests for delete
  to authenticated
  using (auth.uid() = user_id);


-- ── 2. Create Marketplace Bids Table ──────────────────────
create table if not exists marketplace_bids (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references marketplace_requests on delete cascade not null,
  agrovet_id uuid references auth.users not null,
  agrovet_name text not null,
  price numeric not null,
  delivery_days integer default 1,
  message text,
  status text default 'pending', -- 'pending', 'accepted', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table marketplace_bids enable row level security;

-- Policies for marketplace_bids
create policy "Allow authenticated users to view bids"
  on marketplace_bids for select
  to authenticated
  using (true);

create policy "Allow agrovets to place bids"
  on marketplace_bids for insert
  to authenticated
  with check (auth.uid() = agrovet_id);

create policy "Allow agrovets to update their own bids"
  on marketplace_bids for update
  to authenticated
  using (
    auth.uid() = agrovet_id 
    or exists (
      select 1 from marketplace_requests r 
      where r.id = request_id and r.user_id = auth.uid()
    )
  );

create policy "Allow agrovets to delete their own bids"
  on marketplace_bids for delete
  to authenticated
  using (auth.uid() = agrovet_id);


-- ── 3. Create Community Messages Table ──────────────────
create table if not exists community_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  username text not null,
  role text default 'farmer', -- 'farmer', 'agrovet'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table community_messages enable row level security;

-- Policies for community_messages
create policy "Allow everyone to read community messages"
  on community_messages for select
  to authenticated
  using (true);

create policy "Allow members to post messages"
  on community_messages for insert
  to authenticated
  with check (auth.uid() = user_id);


-- ── 4. Create Farmer Events Table ──────────────────────
create table if not exists farmer_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  date date not null,
  type text not null default 'scouting', -- 'scouting', 'watering', 'fertilizer', 'harvest', 'event'
  crop_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table farmer_events enable row level security;

-- Policies for farmer_events
create policy "Users can manage their own calendar events"
  on farmer_events for all
  to authenticated
  using (auth.uid() = user_id);


-- ── 5. Create Farmer Notes Table ───────────────────────
create table if not exists farmer_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  content text not null,
  category text default 'General',
  color text default 'zinc',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table farmer_notes enable row level security;

-- Policies for farmer_notes
create policy "Users can manage their own notes"
  on farmer_notes for all
  to authenticated
  using (auth.uid() = user_id);

