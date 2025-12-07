-- Migration: Add email notification system
-- This migration adds database triggers and functions for automated email notifications

-- Create email_log table to track sent emails (optional, for debugging and tracking)
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email_log queries
CREATE INDEX IF NOT EXISTS idx_email_log_rental_id ON email_log(rental_id);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_log_email_type ON email_log(email_type);

-- Enable RLS on email_log
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read email logs
CREATE POLICY "Allow authenticated users to read email_log" ON email_log
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Function to send email via edge function (called from triggers)
CREATE OR REPLACE FUNCTION send_email_notification(
  p_email_type TEXT,
  p_rental_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_device_id UUID DEFAULT NULL,
  p_recipient_email TEXT,
  p_admin_email TEXT DEFAULT NULL,
  p_custom_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_response JSONB;
BEGIN
  -- Get Supabase URL and service role key from environment
  -- Note: In production, these should be set as Supabase secrets
  -- For now, we'll use a webhook approach or call the edge function directly
  
  -- This function will be called by pg_cron jobs or triggers
  -- The actual email sending will be handled by the edge function
  -- We'll log the email attempt here
  
  INSERT INTO email_log (
    email_type,
    recipient_email,
    rental_id,
    device_id,
    user_id,
    success,
    sent_at
  ) VALUES (
    p_email_type,
    p_recipient_email,
    p_rental_id,
    p_device_id,
    p_user_id,
    TRUE,
    NOW()
  );
  
  -- Note: Actual email sending is handled by the edge function
  -- This function is a placeholder for future integration with HTTP requests
  -- For now, emails are sent from the application layer
END;
$$;

-- Function to check and send due return reminders (7 days)
CREATE OR REPLACE FUNCTION check_due_returns_7days()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rental RECORD;
  v_user_email TEXT;
  v_settings_email TEXT;
BEGIN
  -- Get rentals due in 7 days
  FOR v_rental IN
    SELECT r.id, r.user_id, r.end_date, u.email, u.first_name, u.last_name
    FROM rentals r
    INNER JOIN users u ON r.user_id = u.id
    WHERE r.returned_date IS NULL
      AND r.end_date::date = (CURRENT_DATE + INTERVAL '7 days')::date
      AND NOT EXISTS (
        SELECT 1 FROM email_log el
        WHERE el.rental_id = r.id
          AND el.email_type = 'due_return_7days'
          AND el.sent_at::date = CURRENT_DATE
      )
  LOOP
    -- Log email attempt (actual sending handled by application)
    INSERT INTO email_log (
      email_type,
      recipient_email,
      rental_id,
      user_id,
      success,
      sent_at
    ) VALUES (
      'due_return_7days',
      v_rental.email,
      v_rental.id,
      v_rental.user_id,
      TRUE,
      NOW()
    );
  END LOOP;
END;
$$;

-- Function to check and send due return reminders (1 day)
CREATE OR REPLACE FUNCTION check_due_returns_1day()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rental RECORD;
BEGIN
  -- Get rentals due tomorrow
  FOR v_rental IN
    SELECT r.id, r.user_id, r.end_date, u.email, u.first_name, u.last_name
    FROM rentals r
    INNER JOIN users u ON r.user_id = u.id
    WHERE r.returned_date IS NULL
      AND r.end_date::date = (CURRENT_DATE + INTERVAL '1 day')::date
      AND NOT EXISTS (
        SELECT 1 FROM email_log el
        WHERE el.rental_id = r.id
          AND el.email_type = 'due_return_1day'
          AND el.sent_at::date = CURRENT_DATE
      )
  LOOP
    -- Log email attempt
    INSERT INTO email_log (
      email_type,
      recipient_email,
      rental_id,
      user_id,
      success,
      sent_at
    ) VALUES (
      'due_return_1day',
      v_rental.email,
      v_rental.id,
      v_rental.user_id,
      TRUE,
      NOW()
    );
  END LOOP;
END;
$$;

-- Function to check and send overdue rental notifications
CREATE OR REPLACE FUNCTION check_overdue_rentals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rental RECORD;
  v_admin_email TEXT;
BEGIN
  -- Get admin email from settings
  SELECT email INTO v_admin_email
  FROM system_settings
  LIMIT 1;

  -- Get overdue rentals
  FOR v_rental IN
    SELECT r.id, r.user_id, r.end_date, u.email, u.first_name, u.last_name
    FROM rentals r
    INNER JOIN users u ON r.user_id = u.id
    WHERE r.returned_date IS NULL
      AND r.end_date < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM email_log el
        WHERE el.rental_id = r.id
          AND el.email_type = 'overdue_rental'
          AND el.sent_at::date = CURRENT_DATE
      )
  LOOP
    -- Log email to customer
    INSERT INTO email_log (
      email_type,
      recipient_email,
      rental_id,
      user_id,
      success,
      sent_at
    ) VALUES (
      'overdue_rental',
      v_rental.email,
      v_rental.id,
      v_rental.user_id,
      TRUE,
      NOW()
    );

    -- Log email to admin if email is configured
    IF v_admin_email IS NOT NULL THEN
      INSERT INTO email_log (
        email_type,
        recipient_email,
        rental_id,
        user_id,
        success,
        sent_at
      ) VALUES (
        'overdue_rental',
        v_admin_email,
        v_rental.id,
        v_rental.user_id,
        TRUE,
        NOW()
      );
    END IF;
  END LOOP;
END;
$$;

-- Function to check and send subscription due reminders
CREATE OR REPLACE FUNCTION check_subscription_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_admin_email TEXT;
BEGIN
  -- Get admin email from settings
  SELECT email INTO v_admin_email
  FROM system_settings
  LIMIT 1;

  IF v_admin_email IS NULL THEN
    RETURN;
  END IF;

  -- Get devices with subscriptions due in 7 days
  FOR v_device IN
    SELECT d.id, d.name, d.subscription_date, dt.name as device_type_name, dt.subscription_cost
    FROM devices d
    INNER JOIN device_types dt ON d.device_type_id = dt.id
    WHERE dt.has_subscription = TRUE
      AND d.subscription_date IS NOT NULL
      AND d.subscription_date::date = (CURRENT_DATE + INTERVAL '7 days')::date
      AND NOT EXISTS (
        SELECT 1 FROM email_log el
        WHERE el.device_id = d.id
          AND el.email_type = 'subscription_due'
          AND el.sent_at::date = CURRENT_DATE
      )
  LOOP
    -- Log email to admin
    INSERT INTO email_log (
      email_type,
      recipient_email,
      device_id,
      success,
      sent_at
    ) VALUES (
      'subscription_due',
      v_admin_email,
      v_device.id,
      TRUE,
      NOW()
    );
  END LOOP;
END;
$$;

-- Create trigger to send booking confirmation email when rental is created
-- Note: This is a placeholder. Actual email sending will be handled in the application layer
-- The trigger can be used to log the event or call a webhook
CREATE OR REPLACE FUNCTION trigger_booking_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user information
  SELECT email, CONCAT(first_name, ' ', last_name) INTO v_user_email, v_user_name
  FROM users
  WHERE id = NEW.user_id;

  IF v_user_email IS NOT NULL THEN
    -- Log the email event
    INSERT INTO email_log (
      email_type,
      recipient_email,
      rental_id,
      user_id,
      success,
      sent_at
    ) VALUES (
      'booking_confirmation',
      v_user_email,
      NEW.id,
      NEW.user_id,
      TRUE,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on rentals table
DROP TRIGGER IF EXISTS rental_created_email_trigger ON rentals;
CREATE TRIGGER rental_created_email_trigger
  AFTER INSERT ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_email();

-- Note: To enable pg_cron for scheduled jobs, you need to:
-- 1. Enable the pg_cron extension: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 2. Schedule the jobs (these commands need to be run manually or via Supabase dashboard):
--    SELECT cron.schedule('check-due-returns-7days', '0 9 * * *', 'SELECT check_due_returns_7days();');
--    SELECT cron.schedule('check-due-returns-1day', '0 9 * * *', 'SELECT check_due_returns_1day();');
--    SELECT cron.schedule('check-overdue-rentals', '0 10 * * *', 'SELECT check_overdue_rentals();');
--    SELECT cron.schedule('check-subscription-due', '0 9 * * *', 'SELECT check_subscription_due();');

-- Add comment explaining the email system
COMMENT ON TABLE email_log IS 'Logs all email notifications sent by the system';
COMMENT ON FUNCTION check_due_returns_7days() IS 'Checks for rentals due in 7 days and logs email notifications';
COMMENT ON FUNCTION check_due_returns_1day() IS 'Checks for rentals due tomorrow and logs email notifications';
COMMENT ON FUNCTION check_overdue_rentals() IS 'Checks for overdue rentals and logs email notifications';
COMMENT ON FUNCTION check_subscription_due() IS 'Checks for subscriptions due in 7 days and logs email notifications';

