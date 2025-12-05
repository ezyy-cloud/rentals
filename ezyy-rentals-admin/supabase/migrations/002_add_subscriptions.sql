-- Add subscription fields to device_types
ALTER TABLE device_types
ADD COLUMN IF NOT EXISTS has_subscription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_cost DECIMAL(10, 2);

-- Add subscription date to devices
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS subscription_date DATE;

-- Create index for subscription date queries
CREATE INDEX IF NOT EXISTS idx_devices_subscription_date ON devices(subscription_date) WHERE subscription_date IS NOT NULL;

