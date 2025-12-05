-- Add device_type_id to accessories table
ALTER TABLE accessories
ADD COLUMN IF NOT EXISTS device_type_id UUID REFERENCES device_types(id) ON DELETE RESTRICT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_accessories_device_type_id ON accessories(device_type_id);

-- Note: Existing accessories will have NULL device_type_id
-- You may want to update them manually or allow NULL for accessories that work with all device types

