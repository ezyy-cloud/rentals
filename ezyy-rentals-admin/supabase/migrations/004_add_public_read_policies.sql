-- Add public read access policies for customer frontend
-- Allow anyone (including anonymous users) to read devices and device_types for browsing

-- Allow public read access to device_types
CREATE POLICY "Allow public to read device_types" ON device_types
  FOR SELECT USING (true);

-- Allow public read access to devices
CREATE POLICY "Allow public to read devices" ON devices
  FOR SELECT USING (true);

-- Allow public read access to accessories
CREATE POLICY "Allow public to read accessories" ON accessories
  FOR SELECT USING (true);

-- Note: The above policies allow anyone to read these tables
-- Write operations (INSERT, UPDATE, DELETE) still require authentication
-- through the existing "Allow authenticated users to manage" policies

