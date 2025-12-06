-- Update create_user_profile to handle existing users gracefully AND return full user data
-- This solves:
-- 1. Race condition where trigger creates user first (ON CONFLICT updates instead of failing)
-- 2. RLS issues reading the user back (Function returns the data directly via Security Definer)

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_telephone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_country TEXT,
  p_id_number TEXT,
  p_date_of_birth DATE,
  p_profile_picture TEXT,
  p_next_of_kin_first_name TEXT,
  p_next_of_kin_last_name TEXT,
  p_next_of_kin_phone_number TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record users%ROWTYPE;
BEGIN
  -- Insert the user record, or update if it exists (by email)
  INSERT INTO users (
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
    p_email,
    p_first_name,
    p_last_name,
    p_telephone,
    p_address,
    p_city,
    p_country,
    p_id_number,
    p_date_of_birth,
    p_profile_picture,
    p_next_of_kin_first_name,
    p_next_of_kin_last_name,
    p_next_of_kin_phone_number
  )
  ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    telephone = EXCLUDED.telephone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    id_number = EXCLUDED.id_number,
    date_of_birth = EXCLUDED.date_of_birth,
    profile_picture = EXCLUDED.profile_picture,
    next_of_kin_first_name = EXCLUDED.next_of_kin_first_name,
    next_of_kin_last_name = EXCLUDED.next_of_kin_last_name,
    next_of_kin_phone_number = EXCLUDED.next_of_kin_phone_number,
    updated_at = NOW()
  RETURNING * INTO v_user_record;
  
  RETURN row_to_json(v_user_record);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
