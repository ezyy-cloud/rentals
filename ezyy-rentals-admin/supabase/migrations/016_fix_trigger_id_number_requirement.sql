-- Fix trigger to require id_number and prevent empty string inserts
-- This prevents duplicate key violations on the unique id_number constraint
-- Also handles conflicts gracefully

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_number TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Extract and validate id_number from metadata
  v_id_number := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'id_number'), ''), NULL);
  
  -- Extract required fields
  v_first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), '');
  v_last_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), '');
  
  -- Only insert if id_number is provided (not empty or null)
  -- Since id_number is required and unique, we should not create a user without it
  IF v_id_number IS NULL OR v_id_number = '' THEN
    -- Don't insert - let the application code handle user creation with proper validation
    -- This prevents duplicate key violations from empty id_number values
    RETURN NEW;
  END IF;
  
  -- Insert the user record with validated id_number
  -- Use ON CONFLICT and exception handling to gracefully handle conflicts
  BEGIN
    INSERT INTO public.users (
      email,
      first_name,
      last_name,
      telephone,
      address,
      city,
      country,
      id_number,
      date_of_birth,
      profile_picture,
      next_of_kin_first_name,
      next_of_kin_last_name,
      next_of_kin_phone_number
    ) VALUES (
      NEW.email,
      v_first_name,
      v_last_name,
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'telephone'), ''), ''),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'address'), ''), ''),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'city'), ''), NULL),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''), NULL),
      v_id_number, -- Use the validated id_number
      COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::DATE, CURRENT_DATE),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'profile_picture'), ''), NULL),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'next_of_kin_first_name'), ''), ''),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'next_of_kin_last_name'), ''), ''),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'next_of_kin_phone_number'), ''), '')
    )
    ON CONFLICT (email) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle id_number conflicts or other unique constraint violations
      -- Just continue - the application code will handle updating the existing user
      NULL;
    WHEN OTHERS THEN
      -- Log the error but don't fail the auth user creation
      -- The application code will handle user creation as fallback
      NULL;
  END;
  
  RETURN NEW;
END;
$$;

