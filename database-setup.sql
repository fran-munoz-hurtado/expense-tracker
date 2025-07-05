-- Expense Tracker Database Setup - Multi-User Schema
-- Run this SQL in your Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS non_recurrent_expenses CASCADE;
DROP TABLE IF EXISTS recurrent_expenses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create the users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the recurrent_expenses table with user_id
CREATE TABLE recurrent_expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  month_from INTEGER NOT NULL CHECK (month_from >= 1 AND month_from <= 12),
  month_to INTEGER NOT NULL CHECK (month_to >= 1 AND month_to <= 12),
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  payment_day_deadline INTEGER CHECK (payment_day_deadline >= 1 AND payment_day_deadline <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the non_recurrent_expenses table with user_id
CREATE TABLE non_recurrent_expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  payment_deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the transactions table with user_id
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  description TEXT NOT NULL,
  source_id INTEGER NOT NULL, -- ID from either recurrent_expenses or non_recurrent_expenses
  source_type TEXT NOT NULL CHECK (source_type IN ('recurrent', 'non_recurrent')),
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_recurrent_expenses_user_id ON recurrent_expenses(user_id);
CREATE INDEX idx_recurrent_expenses_year_from ON recurrent_expenses(user_id, year_from, month_from);
CREATE INDEX idx_recurrent_expenses_year_to ON recurrent_expenses(user_id, year_to, month_to);
CREATE INDEX idx_non_recurrent_expenses_user_id ON non_recurrent_expenses(user_id);
CREATE INDEX idx_non_recurrent_expenses_year_month ON non_recurrent_expenses(user_id, year, month);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_year_month ON transactions(user_id, year, month);
CREATE INDEX idx_transactions_status ON transactions(user_id, status);
CREATE INDEX idx_transactions_source ON transactions(user_id, source_id, source_type);
CREATE INDEX idx_transactions_deadline ON transactions(user_id, deadline);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (for demo purposes)
-- In production, you should implement proper authentication
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on recurrent_expenses" ON recurrent_expenses
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on non_recurrent_expenses" ON non_recurrent_expenses
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on transactions" ON transactions
  FOR ALL USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurrent_expenses_updated_at 
  BEFORE UPDATE ON recurrent_expenses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_non_recurrent_expenses_updated_at 
  BEFORE UPDATE ON non_recurrent_expenses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create transaction records for recurrent expenses
CREATE OR REPLACE FUNCTION create_recurrent_transactions()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    current_date DATE;
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
            -- Try to create a valid date for this month using the payment day
            BEGIN
                -- Use a more explicit date creation to avoid timezone issues
                payment_deadline := (current_year || '-' || 
                                   LPAD(current_month::text, 2, '0') || '-' || 
                                   LPAD(NEW.payment_day_deadline::text, 2, '0'))::date;
            EXCEPTION WHEN OTHERS THEN
                -- If the day doesn't exist in this month (e.g., day 31 in February), use the last day of the month
                payment_deadline := (make_date(current_year, current_month, 1) + INTERVAL '1 month - 1 day')::date;
            END;
        ELSE
            payment_deadline := NULL;
        END IF;
        
        -- Insert the transaction record
        INSERT INTO transactions (
            user_id, year, month, description, source_id, source_type, value, status, deadline
        ) VALUES (
            NEW.user_id, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline
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
$$ language 'plpgsql';

-- Function to create transaction record for non-recurrent expenses
CREATE OR REPLACE FUNCTION create_non_recurrent_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the transaction record
    INSERT INTO transactions (
        user_id, year, month, description, source_id, source_type, value, status, deadline
    ) VALUES (
        NEW.user_id, NEW.year, NEW.month, NEW.description, NEW.id, 'non_recurrent', NEW.value, 'pending', NEW.payment_deadline
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically create transaction records
CREATE TRIGGER create_recurrent_transactions_trigger
  AFTER INSERT ON recurrent_expenses
  FOR EACH ROW
  EXECUTE FUNCTION create_recurrent_transactions();

CREATE TRIGGER create_non_recurrent_transaction_trigger
  AFTER INSERT ON non_recurrent_expenses
  FOR EACH ROW
  EXECUTE FUNCTION create_non_recurrent_transaction();

-- Function to update transactions when recurrent expense is updated
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
            -- Try to create a valid date for this month using the payment day
            BEGIN
                -- Use a more explicit date creation to avoid timezone issues
                payment_deadline := (current_year || '-' || 
                                   LPAD(current_month::text, 2, '0') || '-' || 
                                   LPAD(NEW.payment_day_deadline::text, 2, '0'))::date;
            EXCEPTION WHEN OTHERS THEN
                -- If the day doesn't exist in this month (e.g., day 31 in February), use the last day of the month
                payment_deadline := (make_date(current_year, current_month, 1) + INTERVAL '1 month - 1 day')::date;
            END;
        ELSE
            payment_deadline := NULL;
        END IF;
        
        -- Insert the transaction record
        INSERT INTO transactions (
            user_id, year, month, description, source_id, source_type, value, status, deadline
        ) VALUES (
            NEW.user_id, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline
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
$$ language 'plpgsql';

-- Create trigger to update transactions when recurrent expense is updated
CREATE TRIGGER update_recurrent_transactions_trigger
  AFTER UPDATE ON recurrent_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_recurrent_transactions();

-- Function to update transaction when non-recurrent expense is updated
CREATE OR REPLACE FUNCTION update_non_recurrent_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the corresponding transaction record
    UPDATE transactions 
    SET 
        year = NEW.year,
        month = NEW.month,
        description = NEW.description,
        value = NEW.value,
        deadline = NEW.payment_deadline,
        updated_at = NOW()
    WHERE source_id = NEW.id AND source_type = 'non_recurrent';
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update transaction when non-recurrent expense is updated
CREATE TRIGGER update_non_recurrent_transaction_trigger
  AFTER UPDATE ON non_recurrent_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_non_recurrent_transaction();

-- Function to delete transactions when expense is deleted
CREATE OR REPLACE FUNCTION delete_expense_transactions()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete corresponding transaction records
    DELETE FROM transactions 
    WHERE source_id = OLD.id AND source_type = TG_ARGV[0];
    
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Create triggers to delete transactions when expenses are deleted
CREATE TRIGGER delete_recurrent_transactions_trigger
  BEFORE DELETE ON recurrent_expenses
  FOR EACH ROW
  EXECUTE FUNCTION delete_expense_transactions('recurrent');

CREATE TRIGGER delete_non_recurrent_transactions_trigger
  BEFORE DELETE ON non_recurrent_expenses
  FOR EACH ROW
  EXECUTE FUNCTION delete_expense_transactions('non_recurrent');

-- Insert a default user for testing
INSERT INTO users (first_name, last_name, username, email, password_hash, status) VALUES
('John', 'Doe', 'johndoe', 'john@example.com', 'password123', 'active');

-- Insert some sample data for the default user
INSERT INTO recurrent_expenses (user_id, description, month_from, month_to, year_from, year_to, value, payment_day_deadline) VALUES
(1, 'Rent', 1, 12, 2025, 2025, 1200.00, 1),
(1, 'Internet', 1, 12, 2025, 2025, 60.00, 15),
(1, 'Electricity', 1, 12, 2025, 2025, 80.00, 20);

INSERT INTO non_recurrent_expenses (user_id, description, year, month, value, payment_deadline) VALUES
(1, 'Groceries', 2025, 1, 300.00, '2025-01-15'),
(1, 'Car Repair', 2025, 2, 500.00, '2025-02-10'),
(1, 'Medical Checkup', 2025, 3, 150.00, '2025-03-05'); 