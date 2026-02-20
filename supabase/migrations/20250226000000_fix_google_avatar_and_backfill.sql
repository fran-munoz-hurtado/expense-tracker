-- =====================================================
-- Fix Google avatar: picture vs avatar_url + backfill
-- =====================================================
-- Google OAuth envía la foto en raw_user_meta_data->>'picture',
-- no en 'avatar_url'. Actualizamos el trigger y hacemos backfill
-- para usuarios existentes que tienen la foto en auth.
-- =====================================================

-- Step 1: Actualizar handle_new_user para usar 'picture' (Google)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  user_avatar_url TEXT;
  full_name_val TEXT;
  trial_end_date TIMESTAMPTZ;
  raw JSONB;
BEGIN
  raw := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  full_name_val := COALESCE(raw->>'full_name', raw->>'name', '');

  -- Extract email from auth.users
  user_email := COALESCE(NEW.email, 'no-email@example.com');

  -- Extract first_name
  user_first_name := COALESCE(
    NULLIF(trim(raw->>'first_name'), ''),
    NULLIF(trim(raw->>'given_name'), ''),
    NULLIF(trim(split_part(full_name_val, ' ', 1)), ''),
    'Usuario'
  );

  -- Extract last_name
  user_last_name := COALESCE(
    NULLIF(trim(raw->>'last_name'), ''),
    NULLIF(trim(raw->>'family_name'), ''),
    CASE
      WHEN position(' ' IN full_name_val) > 0
      THEN NULLIF(trim(substring(full_name_val FROM position(' ' IN full_name_val) + 1)), '')
      ELSE NULL
    END,
    'Nuevo'
  );

  -- Avatar: Google usa 'picture', otros providers pueden usar 'avatar_url'
  user_avatar_url := NULLIF(trim(COALESCE(raw->>'picture', raw->>'avatar_url', '')), '');

  -- Calculate trial end date (30 days from now)
  trial_end_date := now() + INTERVAL '30 days';

  -- Insert user profile into public.users
  INSERT INTO public.users (
    id, email, first_name, last_name, profile_image_url,
    role, status, subscription_tier, is_on_trial, trial_started_at, trial_expires_at, created_at, updated_at
  )
  VALUES (
    NEW.id, user_email, user_first_name, user_last_name, user_avatar_url,
    'user', 'active', 'trial', true, now(), trial_end_date, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    profile_image_url = COALESCE(EXCLUDED.profile_image_url, public.users.profile_image_url),
    updated_at = now();

  -- Initialize default categories for the new user
  INSERT INTO public.user_categories (user_id, category_name, is_active, is_default)
  VALUES
    (NEW.id, 'Sin categoría', true, true),
    (NEW.id, 'Mercado y comida', true, true),
    (NEW.id, 'Casa y servicios', true, true),
    (NEW.id, 'Transporte', true, true),
    (NEW.id, 'Salud', true, true),
    (NEW.id, 'Diversión', true, true),
    (NEW.id, 'Otros', true, true)
  ON CONFLICT (user_id, category_name) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Backfill profile_image_url para usuarios existentes
-- Copia picture/avatar_url de auth.users a public.users donde falte
UPDATE public.users u
SET profile_image_url = COALESCE(
  NULLIF(trim(au.raw_user_meta_data->>'picture'), ''),
  NULLIF(trim(au.raw_user_meta_data->>'avatar_url'), '')
)
FROM auth.users au
WHERE u.id = au.id
  AND (u.profile_image_url IS NULL OR u.profile_image_url = '')
  AND (
    (au.raw_user_meta_data->>'picture') IS NOT NULL
    OR (au.raw_user_meta_data->>'avatar_url') IS NOT NULL
  );
