-- Add images field to device_types table
-- Using TEXT[] to store array of image URLs
ALTER TABLE device_types
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add images field to accessories table
ALTER TABLE accessories
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Create index for better query performance (optional, but helpful for filtering)
CREATE INDEX IF NOT EXISTS idx_device_types_images ON device_types USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_accessories_images ON accessories USING GIN (images);

