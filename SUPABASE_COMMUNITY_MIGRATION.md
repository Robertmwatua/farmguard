# Supabase Database Setup for Community Feature

## Issue: "Classroom database sync delayed. Ensure migrations are fully applied."

This error occurs when trying to send messages in the Community feature because the `community_messages` table does not exist in your Supabase database.

## Solution: Create the community_messages table

Run the following SQL in your Supabase dashboard (SQL Editor) or via the Supabase CLI:

```sql
-- Create community_messages table for community chat functionality
create table if not exists public.community_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  username text not null,
  role text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.community_messages enable row level security;

-- Create policies for community chat access
create policy "Anyone can view community messages" on public.community_messages
  for select using (true);

create policy "Authenticated users can insert messages" on public.community_messages
  for insert with check (auth.role() = 'authenticated');

create policy "Users can update their own messages" on public.community_messages
  for update using (auth.uid() = user_id);

create policy "Users can delete their own messages" on public.community_messages
  for delete using (auth.uid() = user_id);

-- Optional: Create indexes for better performance
create index idx_community_messages_user_id on public.community_messages(user_id);
create index idx_community_messages_created_at on public.community_messages(created_at);
create index idx_community_messages_role on public.community_messages(role);
```

## For Real-time Presence (if needed)

The community page also uses presence tracking. If you encounter issues with the "Who is Online" feature, ensure the realtime extension is enabled:

```sql
-- Enable realtime extension (if not already enabled)
create extension if not exists "realtime";
```

## Verification

After running the migration:
1. Test the community chat by visiting `/community`
2. Try sending a message - it should now work without the database error
3. Check your Supabase dashboard under Table Editor to verify the table was created
4. You should see live updates as messages are sent (realtime functionality)

## Additional Notes

- Ensure your Supabase URL and anon key are correctly set in `.env.local`
- The user_id references the `auth.users` table, which is automatically managed by Supabase Auth
- The table stores username, role (farmer/agrovet), and message content
- Messages are ordered by creation time for chronological display
- Row Level Security (RLS) policies ensure proper access control

## Troubleshooting

If you still see errors after creating the table:
1. Check the browser console for detailed error messages
2. Verify that the user is authenticated (sign in required)
3. Ensure your Supabase project is not paused or experiencing issues
4. Check that the realtime subscription is working properly