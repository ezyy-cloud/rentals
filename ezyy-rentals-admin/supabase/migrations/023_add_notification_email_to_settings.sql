-- Add notification_email field to system_settings
-- This email is used as the "from" address in Resend emails
-- The existing "email" field is used for company contact and booking notifications

ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Set default notification_email to the existing email value for existing records
UPDATE system_settings
SET notification_email = email
WHERE notification_email IS NULL;

-- Add comment explaining the difference
COMMENT ON COLUMN system_settings.email IS 'Company contact email and email where booking notifications are sent';
COMMENT ON COLUMN system_settings.notification_email IS 'Email address used as "from" address in Resend emails (must be verified in Resend)';

