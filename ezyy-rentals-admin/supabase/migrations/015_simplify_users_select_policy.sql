-- Simplify SELECT policies to fix 401/406 errors
-- The issue: Multiple overlapping SELECT policies causing conflicts

-- Drop conflicting SELECT policies
DROP POLICY IF EXISTS "Allow users to read their own record" ON users;
DROP POLICY IF EXISTS "Allow authenticated to read users" ON users;
DROP POLICY IF EXISTS "Allow public to read users by email" ON users;

-- Create a single, clear SELECT policy for authenticated users
-- This allows authenticated users to read any user record
-- (The "Allow authenticated users to manage all users" policy also covers this,
-- but having an explicit SELECT policy is clearer and avoids conflicts)
CREATE POLICY "Allow authenticated to read users" ON users
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');



