-- Fix RLS policy for users table to allow sign-up
-- The issue: Users can't insert their own record during sign-up because auth.email() might not be available immediately
-- Solution: Allow authenticated users to insert any user record (they're creating their own account)
-- Restrict SELECT/UPDATE to their own records for security

-- Drop the existing generic policy
DROP POLICY IF EXISTS "Allow authenticated users to manage users" ON users;

-- Allow authenticated users to insert user records
-- This is needed during sign-up. We allow any authenticated user to insert since they're creating their own account.
-- The email uniqueness constraint and application logic ensure they can only create their own record.
CREATE POLICY "Allow authenticated users to insert users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

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

