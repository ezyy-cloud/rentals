-- Fix RLS policy for users table to allow sign-up
-- The issue: After signUp(), the session might not be immediately available, causing RLS to block the INSERT
-- Solution: Create a database function that can insert users with elevated privileges, or make INSERT policy more permissive

-- Drop the existing generic policy
DROP POLICY IF EXISTS "Allow authenticated users to manage users" ON users;

-- Create a function to insert users that bypasses RLS
-- This function can be called by authenticated users to create their own profile
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_telephone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_country TEXT,
  p_id_number TEXT,
  p_date_of_birth DATE,
  p_profile_picture TEXT,
  p_next_of_kin_first_name TEXT,
  p_next_of_kin_last_name TEXT,
  p_next_of_kin_phone_number TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert the user record (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO users (
    email,
    first_name,
    last_name,
    telephone,
    address,
    city,
    country,
    id_number,
    date_of_birth,
    profile_picture,
    next_of_kin_first_name,
    next_of_kin_last_name,
    next_of_kin_phone_number
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
    p_telephone,
    p_address,
    p_city,
    p_country,
    p_id_number,
    p_date_of_birth,
    p_profile_picture,
    p_next_of_kin_first_name,
    p_next_of_kin_last_name,
    p_next_of_kin_phone_number
  )
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

-- Allow authenticated users to insert user records directly
-- This is permissive to allow sign-up flow
-- Note: Email uniqueness constraint prevents duplicate accounts
CREATE POLICY "Allow authenticated users to insert users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also allow service_role to insert (for triggers and functions)
CREATE POLICY "Allow service role to insert users" ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

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

