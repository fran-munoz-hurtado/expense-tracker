-- =====================================================
-- MIGRATION TO SUPABASE AUTH - Complete Database Reset
-- =====================================================
-- This script migrates the entire database to use Supabase Auth
-- WARNING: This will DELETE ALL existing data
-- Make sure to backup your data before running this script
-- =====================================================

-- Step 1: Drop all existing tables in dependency order
-- =====================================================

DROP TABLE IF EXISTS transaction_attachments CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS non_recurrent_expenses CASCADE;
DROP TABLE IF EXISTS recurrent_expenses CASCADE;
DROP TABLE IF EXISTS user_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Create new users table linked to auth.users
-- =====================================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'trial', 'pro', 'enterprise')),
  is_on_trial BOOLEAN DEFAULT TRUE,
  trial_started_at TIMESTAMP,
  trial_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Step 3: Create recurrent_expenses with UUID user_id
-- =====================================================

CREATE TABLE public.recurrent_expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  month_from INTEGER NOT NULL CHECK (month_from >= 1 AND month_from <= 12),
  month_to INTEGER NOT NULL CHECK (month_to >= 1 AND month_to <= 12),
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  payment_day_deadline INTEGER CHECK (payment_day_deadline >= 1 AND payment_day_deadline <= 31),
  type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category TEXT DEFAULT 'Sin categoría',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create non_recurrent_expenses with UUID user_id
-- =====================================================

CREATE TABLE public.non_recurrent_expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  payment_deadline DATE,
  type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category TEXT DEFAULT 'Sin categoría',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create transactions with UUID user_id
-- =====================================================

CREATE TABLE public.transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  description TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('recurrent', 'non_recurrent')),
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  deadline DATE,
  type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category TEXT DEFAULT 'Sin categoría',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create transaction_attachments with UUID user_id
-- =====================================================

CREATE TABLE public.transaction_attachments (
  id SERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create user_categories with UUID user_id
-- =====================================================

CREATE TABLE public.user_categories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate categories per user
  UNIQUE(user_id, category_name)
);

-- Step 8: Create optimized indexes for performance
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_trial_expires ON users(trial_expires_at) WHERE trial_expires_at IS NOT NULL;

-- Recurrent expenses indexes
CREATE INDEX idx_recurrent_expenses_user_id ON recurrent_expenses(user_id);
CREATE INDEX idx_recurrent_expenses_year_from ON recurrent_expenses(user_id, year_from, month_from);
CREATE INDEX idx_recurrent_expenses_year_to ON recurrent_expenses(user_id, year_to, month_to);
CREATE INDEX idx_recurrent_expenses_category ON recurrent_expenses(user_id, category);

-- Non-recurrent expenses indexes
CREATE INDEX idx_non_recurrent_expenses_user_id ON non_recurrent_expenses(user_id);
CREATE INDEX idx_non_recurrent_expenses_year_month ON non_recurrent_expenses(user_id, year, month);
CREATE INDEX idx_non_recurrent_expenses_category ON non_recurrent_expenses(user_id, category);

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_year_month ON transactions(user_id, year, month);
CREATE INDEX idx_transactions_status ON transactions(user_id, status);
CREATE INDEX idx_transactions_source ON transactions(user_id, source_id, source_type);
CREATE INDEX idx_transactions_deadline ON transactions(user_id, deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_transactions_category ON transactions(user_id, category);

-- Transaction attachments indexes
CREATE INDEX idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);
CREATE INDEX idx_transaction_attachments_user_id ON transaction_attachments(user_id);

-- User categories indexes
CREATE INDEX idx_user_categories_user_id ON user_categories(user_id);
CREATE INDEX idx_user_categories_active ON user_categories(user_id, is_active);
CREATE INDEX idx_user_categories_default ON user_categories(user_id, is_default);

-- Step 9: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS Policies for Supabase Auth
-- =====================================================

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Recurrent expenses policies
CREATE POLICY "Users can manage own recurrent expenses" ON recurrent_expenses
  FOR ALL USING (auth.uid() = user_id);

-- Non-recurrent expenses policies
CREATE POLICY "Users can manage own non-recurrent expenses" ON non_recurrent_expenses
  FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Transaction attachments policies
CREATE POLICY "Users can manage own transaction attachments" ON transaction_attachments
  FOR ALL USING (auth.uid() = user_id);

-- User categories policies
CREATE POLICY "Users can manage own categories" ON user_categories
  FOR ALL USING (auth.uid() = user_id);

-- Step 11: Create database functions for automatic transaction creation
-- =====================================================

-- Function to create recurrent transactions
CREATE OR REPLACE FUNCTION create_recurrent_transactions()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    payment_deadline DATE;
BEGIN
    -- Start from the start month/year
    current_year := NEW.year_from;
    current_month := NEW.month_from;
    
    -- Create transaction records for each month in the range
    WHILE (current_year < NEW.year_to) OR 
          (current_year = NEW.year_to AND current_month <= NEW.month_to) LOOP
        
        -- Calculate payment deadline for this month
        IF NEW.payment_day_deadline IS NOT NULL THEN
            BEGIN
                payment_deadline := (current_year || '-' || 
                                   LPAD(current_month::text, 2, '0') || '-' || 
                                   LPAD(NEW.payment_day_deadline::text, 2, '0'))::date;
            EXCEPTION WHEN OTHERS THEN
                payment_deadline := (make_date(current_year, current_month, 1) + INTERVAL '1 month - 1 day')::date;
            END;
        ELSE
            payment_deadline := NULL;
        END IF;
        
        -- Insert the transaction record
        INSERT INTO transactions (
            user_id, year, month, description, source_id, source_type, value, status, deadline, type, category
        ) VALUES (
            NEW.user_id, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline, NEW.type, NEW.category
        );
        
        -- Move to next month
        IF current_month = 12 THEN
            current_month := 1;
            current_year := current_year + 1;
        ELSE
            current_month := current_month + 1;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create non-recurrent transaction
CREATE OR REPLACE FUNCTION create_non_recurrent_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO transactions (
        user_id, year, month, description, source_id, source_type, value, status, deadline, type, category
    ) VALUES (
        NEW.user_id, NEW.year, NEW.month, NEW.description, NEW.id, 'non_recurrent', NEW.value, 'pending', NEW.payment_deadline, NEW.type, NEW.category
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update recurrent transactions
CREATE OR REPLACE FUNCTION update_recurrent_transactions()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    payment_deadline DATE;
BEGIN
    -- Delete existing transaction records for this recurrent expense
    DELETE FROM transactions 
    WHERE source_id = NEW.id AND source_type = 'recurrent';
    
    -- Start from the start month/year
    current_year := NEW.year_from;
    current_month := NEW.month_from;
    
    -- Create transaction records for each month in the range
    WHILE (current_year < NEW.year_to) OR 
          (current_year = NEW.year_to AND current_month <= NEW.month_to) LOOP
        
        -- Calculate payment deadline for this month
        IF NEW.payment_day_deadline IS NOT NULL THEN
            BEGIN
                payment_deadline := (current_year || '-' || 
                                   LPAD(current_month::text, 2, '0') || '-' || 
                                   LPAD(NEW.payment_day_deadline::text, 2, '0'))::date;
            EXCEPTION WHEN OTHERS THEN
                payment_deadline := (make_date(current_year, current_month, 1) + INTERVAL '1 month - 1 day')::date;
            END;
        ELSE
            payment_deadline := NULL;
        END IF;
        
        -- Insert the transaction record
        INSERT INTO transactions (
            user_id, year, month, description, source_id, source_type, value, status, deadline, type, category
        ) VALUES (
            NEW.user_id, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline, NEW.type, NEW.category
        );
        
        -- Move to next month
        IF current_month = 12 THEN
            current_month := 1;
            current_year := current_year + 1;
        ELSE
            current_month := current_month + 1;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update non-recurrent transaction
CREATE OR REPLACE FUNCTION update_non_recurrent_transaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE transactions 
    SET 
        year = NEW.year,
        month = NEW.month,
        description = NEW.description,
        value = NEW.value,
        deadline = NEW.payment_deadline,
        type = NEW.type,
        category = NEW.category,
        updated_at = NOW()
    WHERE source_id = NEW.id AND source_type = 'non_recurrent';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create triggers for automatic transaction management
-- =====================================================

-- Triggers for recurrent expenses
CREATE TRIGGER trigger_create_recurrent_transactions
    AFTER INSERT ON recurrent_expenses
    FOR EACH ROW EXECUTE FUNCTION create_recurrent_transactions();

CREATE TRIGGER trigger_update_recurrent_transactions
    AFTER UPDATE ON recurrent_expenses
    FOR EACH ROW EXECUTE FUNCTION update_recurrent_transactions();

-- Triggers for non-recurrent expenses
CREATE TRIGGER trigger_create_non_recurrent_transaction
    AFTER INSERT ON non_recurrent_expenses
    FOR EACH ROW EXECUTE FUNCTION create_non_recurrent_transaction();

CREATE TRIGGER trigger_update_non_recurrent_transaction
    AFTER UPDATE ON non_recurrent_expenses
    FOR EACH ROW EXECUTE FUNCTION update_non_recurrent_transaction();

-- Step 13: Function to handle new user creation from auth.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, created_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NOW()
  );
  
  -- Initialize default categories for the new user
  INSERT INTO public.user_categories (user_id, category_name, is_active, is_default)
  VALUES 
    (NEW.id, 'Sin categoría', TRUE, TRUE),
    (NEW.id, 'Mercado y comida', TRUE, TRUE),
    (NEW.id, 'Casa y servicios', TRUE, TRUE),
    (NEW.id, 'Transporte', TRUE, TRUE),
    (NEW.id, 'Salud', TRUE, TRUE),
    (NEW.id, 'Diversión', TRUE, TRUE),
    (NEW.id, 'Otros', TRUE, TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile when someone signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 14: Create updated_at trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_recurrent_expenses
  BEFORE UPDATE ON recurrent_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_non_recurrent_expenses
  BEFORE UPDATE ON non_recurrent_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_transaction_attachments
  BEFORE UPDATE ON transaction_attachments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_user_categories
  BEFORE UPDATE ON user_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration to Supabase Auth completed successfully!' as status,
       'All tables now use UUID user_id linked to auth.users' as details,
       'Database is ready for Supabase Auth integration' as next_steps; 