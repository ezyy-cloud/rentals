-- Add city and country to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);

