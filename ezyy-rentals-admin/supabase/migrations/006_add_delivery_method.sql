-- Add delivery_method to rentals table
-- 'collection' = customer picks up, 'shipping' = shipped to customer
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'collection' CHECK (delivery_method IN ('collection', 'shipping'));

-- Add shipping_address to rentals table (nullable, only used when delivery_method is 'shipping')
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Create index for delivery_method for better query performance
CREATE INDEX IF NOT EXISTS idx_rentals_delivery_method ON rentals(delivery_method);

