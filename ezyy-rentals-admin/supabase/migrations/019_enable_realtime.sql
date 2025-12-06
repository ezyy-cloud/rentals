-- Enable realtime for tables that need real-time updates
-- This migration enables Supabase realtime for the tables used in the admin dashboard

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for rentals table
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;

-- Enable realtime for devices table
ALTER PUBLICATION supabase_realtime ADD TABLE devices;

-- Enable realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Note: If tables are already in the publication, this will show an error but won't break anything
-- You can safely ignore "already exists" errors if running this migration multiple times

