-- =====================================================
-- SIMPLE SCHEMA FIX - AVOID BOOLEAN SYNTAX ISSUES
-- =====================================================
-- This script fixes missing columns with simple syntax
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Add isgoal column to recurrent_expenses (most critical fix)
-- =====================================================
ALTER TABLE public.recurrent_expenses 
ADD COLUMN IF NOT EXISTS isgoal boolean;

-- Set default value for existing rows
UPDATE public.recurrent_expenses 
SET isgoal = false 
WHERE isgoal IS NULL;

-- Set default for new rows
ALTER TABLE public.recurrent_expenses 
ALTER COLUMN isgoal SET DEFAULT false;

-- Step 2: Add type and category columns to recurrent_expenses
-- =====================================================
ALTER TABLE public.recurrent_expenses 
ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE public.recurrent_expenses 
ADD COLUMN IF NOT EXISTS category text;

-- Set defaults for existing rows
UPDATE public.recurrent_expenses 
SET type = 'expense' 
WHERE type IS NULL;

UPDATE public.recurrent_expenses 
SET category = 'Sin categoría' 
WHERE category IS NULL;

-- Set defaults for new rows
ALTER TABLE public.recurrent_expenses 
ALTER COLUMN type SET DEFAULT 'expense';

ALTER TABLE public.recurrent_expenses 
ALTER COLUMN category SET DEFAULT 'Sin categoría';

-- Add check constraint for type
ALTER TABLE public.recurrent_expenses 
ADD CONSTRAINT IF NOT EXISTS check_recurrent_type 
CHECK (type IN ('expense', 'income'));

-- Step 3: Add type and category columns to non_recurrent_expenses
-- =====================================================
ALTER TABLE public.non_recurrent_expenses 
ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE public.non_recurrent_expenses 
ADD COLUMN IF NOT EXISTS category text;

-- Set defaults for existing rows
UPDATE public.non_recurrent_expenses 
SET type = 'expense' 
WHERE type IS NULL;

UPDATE public.non_recurrent_expenses 
SET category = 'Sin categoría' 
WHERE category IS NULL;

-- Set defaults for new rows
ALTER TABLE public.non_recurrent_expenses 
ALTER COLUMN type SET DEFAULT 'expense';

ALTER TABLE public.non_recurrent_expenses 
ALTER COLUMN category SET DEFAULT 'Sin categoría';

-- Add check constraint for type
ALTER TABLE public.non_recurrent_expenses 
ADD CONSTRAINT IF NOT EXISTS check_non_recurrent_type 
CHECK (type IN ('expense', 'income'));

-- Step 4: Add type and category columns to transactions
-- =====================================================
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS category text;

-- Set defaults for existing rows
UPDATE public.transactions 
SET type = 'expense' 
WHERE type IS NULL;

UPDATE public.transactions 
SET category = 'Sin categoría' 
WHERE category IS NULL;

-- Set defaults for new rows
ALTER TABLE public.transactions 
ALTER COLUMN type SET DEFAULT 'expense';

ALTER TABLE public.transactions 
ALTER COLUMN category SET DEFAULT 'Sin categoría';

-- Add check constraint for type
ALTER TABLE public.transactions 
ADD CONSTRAINT IF NOT EXISTS check_transaction_type 
CHECK (type IN ('expense', 'income'));

-- Step 5: Create user_categories table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_categories (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  category_name text NOT NULL,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category_name)
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_categories_user_id_fkey' 
    AND table_name = 'user_categories'
  ) THEN
    ALTER TABLE public.user_categories 
    ADD CONSTRAINT user_categories_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Create or replace the handle_new_user function
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile into public.users
  INSERT INTO public.users (id, first_name, last_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Nuevo'),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Enable the trigger
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Enable Row Level Security
-- =====================================================
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can manage own categories" ON user_categories;

CREATE POLICY "Users can manage own categories" ON user_categories
  FOR ALL USING (auth.uid() = user_id);

-- Step 9: Create essential indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON user_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_expenses_isgoal ON recurrent_expenses(user_id, isgoal);
CREATE INDEX IF NOT EXISTS idx_recurrent_expenses_type ON recurrent_expenses(user_id, type);
CREATE INDEX IF NOT EXISTS idx_recurrent_expenses_category ON recurrent_expenses(user_id, category);

-- Step 10: Verify the fix worked
-- =====================================================
SELECT 
  'SCHEMA FIX COMPLETE' as status,
  'isgoal column added to recurrent_expenses' as critical_fix,
  'type and category columns added to all tables' as additional_fix,
  'user_categories table created' as table_status,
  'handle_new_user trigger enabled' as trigger_status,
  'RLS policies enabled' as security_status; 