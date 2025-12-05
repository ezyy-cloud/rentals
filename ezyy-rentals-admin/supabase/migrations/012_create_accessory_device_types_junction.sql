-- Create junction table for many-to-many relationship between accessories and device types
CREATE TABLE IF NOT EXISTS accessory_device_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(accessory_id, device_type_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accessory_device_types_accessory_id ON accessory_device_types(accessory_id);
CREATE INDEX IF NOT EXISTS idx_accessory_device_types_device_type_id ON accessory_device_types(device_type_id);

-- Migrate existing data from accessories.device_type_id to junction table
INSERT INTO accessory_device_types (accessory_id, device_type_id)
SELECT id, device_type_id
FROM accessories
WHERE device_type_id IS NOT NULL
ON CONFLICT (accessory_id, device_type_id) DO NOTHING;

-- Note: We keep device_type_id column in accessories for backward compatibility
-- but the junction table is the source of truth for the relationship

