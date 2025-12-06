-- Create system_settings table for storing company information
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'Ezyy Rentals',
  email TEXT NOT NULL DEFAULT 'info@ezyyrentals.com',
  phone TEXT NOT NULL DEFAULT '(555) 123-4567',
  website TEXT NOT NULL DEFAULT 'www.ezyyrentals.com',
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read settings
CREATE POLICY "Allow authenticated users to read settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert settings
CREATE POLICY "Allow authenticated users to insert settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update settings
CREATE POLICY "Allow authenticated users to update settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

