-- Create a trigger to automatically create user profile when auth user is created
-- This bypasses RLS issues during sign-up

-- First, create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a basic user record in the users table
  -- The user will need to complete their profile later
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
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'telephone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', NULL),
    COALESCE(NEW.raw_user_meta_data->>'country', NULL),
    COALESCE(NEW.raw_user_meta_data->>'id_number', ''),
    COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::DATE, CURRENT_DATE),
    COALESCE(NEW.raw_user_meta_data->>'profile_picture', NULL),
    COALESCE(NEW.raw_user_meta_data->>'next_of_kin_first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'next_of_kin_last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'next_of_kin_phone_number', '')
  )
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
-- This will fire when a new user is created in Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

