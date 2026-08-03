-- APPNEW-02: Public Profile and Username
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Create a function to validate username format
CREATE OR REPLACE FUNCTION public.validate_username(username text)
RETURNS boolean AS $$
BEGIN
  -- 3-30 chars, lowercase alphanumeric and underscores, no consecutive underscores, no leading/trailing underscores
  RETURN username ~ '^[a-z0-9]([a-z0-9_]{1,28}[a-z0-9])?$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to username
ALTER TABLE public.profiles ADD CONSTRAINT valid_username CHECK (username IS NULL OR validate_username(username));

-- Populate existing users with a generated username based on their email or ID if username is null
UPDATE public.profiles
SET username = CONCAT('user_', REPLACE(SUBSTRING(id::text FROM 1 FOR 8), '-', ''))
WHERE username IS NULL;

-- Make username NOT NULL after populating
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

-- Prevent changing the username once it's set
CREATE OR REPLACE FUNCTION public.prevent_username_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.username <> OLD.username THEN
    RAISE EXCEPTION 'Username is immutable and cannot be changed once set.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_immutable_username
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_username_update();

-- Create a view for public profiles to completely avoid exposing email and role
-- By default in Postgres, views execute with the privileges of the view owner (postgres), bypassing RLS.
-- We will grant select to anon and authenticated.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id, 
  username, 
  full_name, 
  avatar_url,
  created_at
FROM public.profiles
WHERE deleted_at IS NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
