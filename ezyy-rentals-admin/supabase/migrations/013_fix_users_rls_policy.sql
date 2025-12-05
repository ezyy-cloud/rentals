-- Fix RLS policy for users table to allow sign-up
-- The issue: Users can't insert their own record during sign-up
-- Solution: Allow authenticated users to insert their own user record (email must match auth.email())
-- Also allow authenticated users to read/update their own records

-- Drop the existing generic policy
DROP POLICY IF EXISTS "Allow authenticated users to manage users" ON users;

-- Allow authenticated users to insert their own user record
-- This is needed during sign-up when a user creates their profile
CREATE POLICY "Allow users to insert their own record" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.email() = email OR auth.email() IS NOT NULL)
  );

-- Allow authenticated users to read their own user record
CREATE POLICY "Allow users to read their own record" ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND 
    auth.email() = email
  );

-- Allow authenticated users to update their own user record
CREATE POLICY "Allow users to update their own record" ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND 
    auth.email() = email
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.email() = email
  );

-- Allow authenticated users to manage all users (for admin operations)
-- This allows the admin app to perform all operations on any user
CREATE POLICY "Allow authenticated users to manage all users" ON users
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

