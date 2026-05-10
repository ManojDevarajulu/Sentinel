-- Auto-create a row in public.users whenever a new Supabase auth user is created.
-- This handles BOTH email signups AND GitHub OAuth logins.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email    = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
