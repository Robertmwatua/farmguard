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
