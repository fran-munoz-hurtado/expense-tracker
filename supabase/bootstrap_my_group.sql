-- =====================================================
-- BOOTSTRAP: Create your group and assign existing data
-- =====================================================
-- Run this AFTER applying the groups migration (20250219000000_add_groups_schema.sql)
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find YOUR user (the one you actively use)
-- 3. Copy your User UID (UUID format, e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890)
-- 4. Replace YOUR_USER_UUID below with that value
-- 5. Run this entire script in Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
  my_user_id UUID := 'YOUR_USER_UUID';  -- <<<< REPLACE WITH YOUR AUTH USER ID
  my_group_id UUID;
BEGIN
  -- Create your group
  INSERT INTO public.groups (name, created_by)
  VALUES ('Mis finanzas', my_user_id)
  RETURNING id INTO my_group_id;

  -- Add yourself as admin, active
  INSERT INTO public.group_members (group_id, user_id, role, status, joined_at)
  VALUES (my_group_id, my_user_id, 'admin', 'active', now());

  -- Assign all your transactions to this group + set created_by for traceability
  UPDATE public.transactions
  SET group_id = my_group_id,
      created_by = COALESCE(created_by, user_id)
  WHERE user_id = my_user_id;

  -- Assign all your recurrent_expenses to this group
  UPDATE public.recurrent_expenses
  SET group_id = my_group_id
  WHERE user_id = my_user_id;

  -- Assign all your non_recurrent_expenses to this group
  UPDATE public.non_recurrent_expenses
  SET group_id = my_group_id
  WHERE user_id = my_user_id;

  RAISE NOTICE 'Group "Mis finanzas" created with id %. Your data has been assigned to it.', my_group_id;
END $$;
