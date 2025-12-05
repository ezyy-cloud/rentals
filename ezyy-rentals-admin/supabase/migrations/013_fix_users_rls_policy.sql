-- Fix RLS policy for users table to allow sign-up
-- The issue: Users can't insert their own record during sign-up because the session might not be fully established
-- Solution: Allow authenticated users to insert their own user record, and read/update their own records

-- Drop the existing generic policy
DROP POLICY IF EXISTS "Allow authenticated users to manage users" ON users;

-- Allow authenticated users to insert their own user record (email must match auth.email())
CREATE POLICY "Allow users to insert their own record" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = email);

-- Allow authenticated users to read their own user record
CREATE POLICY "Allow users to read their own record" ON users
  FOR SELECT
  TO authenticated
  USING (auth.email() = email);

-- Allow authenticated users to update their own user record
CREATE POLICY "Allow users to update their own record" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.email() = email)
  WITH CHECK (auth.email() = email);

-- Allow authenticated users to manage all users (for admin operations)
-- This allows the admin app to manage all users
CREATE POLICY "Allow authenticated users to manage all users" ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

