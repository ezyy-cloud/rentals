-- Add rental_rate to accessories table
ALTER TABLE accessories
ADD COLUMN IF NOT EXISTS rental_rate DECIMAL(10, 2) DEFAULT 0.00;

-- Update existing accessories to have a default rental rate if needed
-- You may want to set specific values for existing accessories
UPDATE accessories
SET rental_rate = 0.00
WHERE rental_rate IS NULL;

-- Make rental_rate NOT NULL after setting defaults
ALTER TABLE accessories
ALTER COLUMN rental_rate SET NOT NULL;

-- Add shipped_date to rentals table
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS shipped_date DATE;

-- Create index for shipped_date for better query performance
CREATE INDEX IF NOT EXISTS idx_rentals_shipped_date ON rentals(shipped_date) WHERE shipped_date IS NOT NULL;

