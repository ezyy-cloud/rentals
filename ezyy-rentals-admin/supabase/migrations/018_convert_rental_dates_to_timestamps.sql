-- Convert rental start_date and end_date from DATE to TIMESTAMP WITH TIME ZONE
-- This enables 24-hour day calculation instead of calendar days
-- Existing dates will be migrated to 10:00 AM (default time)

-- Step 1: Add new timestamp columns
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS start_date_new TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date_new TIMESTAMP WITH TIME ZONE;

-- Step 2: Migrate existing data - set all dates to 10:00 AM
-- Convert DATE to TIMESTAMP by adding time component
UPDATE rentals
SET 
  start_date_new = (start_date::text || ' 10:00:00')::timestamp with time zone,
  end_date_new = (end_date::text || ' 10:00:00')::timestamp with time zone
WHERE start_date_new IS NULL OR end_date_new IS NULL;

-- Step 3: Drop old columns
ALTER TABLE rentals
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;

-- Step 4: Rename new columns to original names
ALTER TABLE rentals
RENAME COLUMN start_date_new TO start_date;
ALTER TABLE rentals
RENAME COLUMN end_date_new TO end_date;

-- Step 5: Make columns NOT NULL (they should already have values from migration)
ALTER TABLE rentals
ALTER COLUMN start_date SET NOT NULL,
ALTER COLUMN end_date SET NOT NULL;

-- Step 6: Add comment to document the change
COMMENT ON COLUMN rentals.start_date IS 'Rental start date and time (24-hour day calculation)';
COMMENT ON COLUMN rentals.end_date IS 'Rental end date and time (24-hour day calculation)';

