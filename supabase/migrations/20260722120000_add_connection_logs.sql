-- Create connection_logs table
create table if not exists connection_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid, -- Can be null for failed attempts if user doesn't exist
  email text,
  status text not null, -- 'success' or 'failure'
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table connection_logs enable row level security;

-- Policy: Only admins can view logs
create policy "Admins can view logs" on connection_logs
  for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- RPC for logging
create or replace function log_connection_attempt(
  p_email text,
  p_status text,
  p_user_id uuid default null
) returns void as $$
begin
  insert into connection_logs (email, status, user_id)
  values (p_email, p_status, p_user_id);
end;
$$ language plpgsql security definer;
