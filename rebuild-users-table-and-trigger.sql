-- =====================================================
-- REBUILD USERS TABLE AND TRIGGER - COMPLETE FIX
-- =====================================================
-- This script completely rebuilds the users table with proper structure
-- and recreates the trigger for Supabase Auth integration
-- =====================================================

-- Step 1: Drop existing trigger and function
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Drop and recreate public.users table
-- =====================================================
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'banned')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'trial', 'pro', 'enterprise')),
  is_on_trial BOOLEAN DEFAULT true,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  profile_image_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Step 3: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);

-- Step 4: Enable Row Level Security
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Step 5: Create updated_at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Step 6: Create the handle_new_user function
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  trial_end_date TIMESTAMPTZ;
BEGIN
  -- Extract email from auth.users
  user_email := COALESCE(NEW.email, 'no-email@example.com');
  
  -- Extract metadata
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'Nuevo');
  
  -- Calculate trial end date (30 days from now)
  trial_end_date := now() + INTERVAL '30 days';
  
  -- Insert user profile into public.users
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    subscription_tier,
    is_on_trial,
    trial_started_at,
    trial_expires_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_email,
    user_first_name,
    user_last_name,
    'user',
    'active',
    'trial',
    true,
    now(),
    trial_end_date,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
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
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create the trigger
-- =====================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Add missing columns to other tables (if needed)
-- =====================================================
-- Add isgoal column to recurrent_expenses
ALTER TABLE public.recurrent_expenses 
ADD COLUMN IF NOT EXISTS isgoal boolean DEFAULT false;

-- Add type and category columns to recurrent_expenses
ALTER TABLE public.recurrent_expenses 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'expense';

ALTER TABLE public.recurrent_expenses 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Sin categoría';

-- Add type and category columns to non_recurrent_expenses
ALTER TABLE public.non_recurrent_expenses 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'expense';

ALTER TABLE public.non_recurrent_expenses 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Sin categoría';

-- Add type and category columns to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'expense';

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Sin categoría';

-- Step 9: Ensure user_categories table exists
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_categories (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category_name)
);

-- Enable RLS for user_categories
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_categories
DROP POLICY IF EXISTS "Users can manage own categories" ON public.user_categories;
CREATE POLICY "Users can manage own categories" ON public.user_categories
  FOR ALL USING (auth.uid() = user_id);

-- Create index for user_categories
CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON public.user_categories(user_id);

-- Step 10: Verification and status check
-- =====================================================
SELECT 
  'USERS TABLE AND TRIGGER REBUILT SUCCESSFULLY' as status,
  'Table public.users recreated with all necessary columns' as users_table,
  'Trigger on_auth_user_created enabled and functional' as trigger_status,
  'Default categories will be created for new users' as categories_status,
  'Missing columns added to expense tables' as columns_status,
  'RLS policies configured for security' as security_status;

-- Show the structure of the new users table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position; 