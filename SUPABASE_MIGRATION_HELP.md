# Supabase Database Setup for FarmGuard

## Issue: "Database connection sync delayed ensure migrations are fully applied"

This error occurs when trying to seed the tracker & calendar functionality because the `farmer_events` table does not exist in your Supabase database.

## Solution: Create the farmer_events table

Run the following SQL in your Supabase dashboard (SQL Editor) or via the Supabase CLI:

```sql
-- Create farmer_events table for tracking crop operations and calendar events
create table if not exists public.farmer_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  date date not null,
  type text not null,
  crop_name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.farmer_events enable row level security;

-- Create policies for user-specific access
create policy "Users can view their own events" on public.farmer_events
  for select using (auth.uid() = user_id);

create policy "Users can insert their own events" on public.farmer_events
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own events" on public.farmer_events
  for update using (auth.uid() = user_id);

create policy "Users can delete their own events" on public.farmer_events
  for delete using (auth.uid() = user_id);

-- Optional: Create indexes for better performance
create index idx_farmer_events_user_id on public.farmer_events(user_id);
create index idx_farmer_events_date on public.farmer_events(date);
create index idx_farmer_events_type on public.farmer_events(type);
```

## Verification

After running the migration:
1. Test the connection by visiting `/test-supabase` (if the todos table exists)
2. Try scanning a plant and clicking "Yes, Seed Tracker & Calendar" again
3. Check your Supabase dashboard under Table Editor to verify the table was created

## Additional Notes

- Ensure your Supabase URL and anon key are correctly set in `.env.local`
- The user_id references the `auth.users` table, which is automatically managed by Supabase Auth
- If you encounter RLS errors, double-check that the policies were created correctly
- You may need to refresh the page after creating the table for the changes to take effect

## Troubleshooting

If you still see errors after creating the table:
1. Check the browser console for detailed error messages
2. Verify that the user is authenticated (sign in required)
3. Ensure your Supabase project is not paused or experiencing issues
4. Check that the date format being inserted matches the date column type (YYYY-MM-DD)