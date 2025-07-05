# Database Setup Guide - New Schema

## Overview

The new schema consists of three tables:

1. **`recurrent_expenses`** - Stores recurring expenses (e.g., rent, utilities)
2. **`non_recurrent_expenses`** - Stores one-time expenses (e.g., car repair, medical)
3. **`transactions`** - Individual transaction records created automatically from the above tables

## Step 1: Access Your Supabase Dashboard

1. Go to [supabase.com](https://supabase.com) and sign in
2. Open your project
3. Go to the **SQL Editor** in the left sidebar

## Step 2: Run the Database Setup Script

Copy and paste the entire contents of `database-setup.sql` into the SQL Editor and run it.

This will create:
- `recurrent_expenses` table
- `non_recurrent_expenses` table
- `transactions` table
- All necessary indexes
- Row Level Security policies
- Triggers for automatic transaction creation
- Sample data

## Step 3: Verify Tables Exist

After running the script, you can verify the tables were created by running:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('recurrent_expenses', 'non_recurrent_expenses', 'transactions');
```

## Step 4: Test the Connection

Go back to your app and use the Debug view to test:
1. Click "🔍 Check Database Setup" to verify all tables exist
2. Click "Test Recurrent Insert" to test recurring expenses
3. Click "Test Non-Recurrent Insert" to test one-time expenses
4. Click "Test Fetch" to see transactions

## How It Works

### Recurrent Expenses
- When you add a recurrent expense (e.g., rent from Jan to Dec 2024), it automatically creates 12 transaction records
- Each transaction has the deadline calculated from the payment_day_deadline

### Non-Recurrent Expenses
- When you add a non-recurrent expense, it creates a single transaction record
- The deadline is taken directly from the payment_deadline field

### Transactions Table
- Contains individual expense records for each month
- Used for dashboard display and status tracking
- Automatically maintained by database triggers

## Common Issues

### Issue: "relation does not exist"
**Solution**: The table wasn't created. Run the database-setup.sql script again.

### Issue: "permission denied"
**Solution**: Check that your `.env.local` file has the correct Supabase URL and anon key.

### Issue: "column does not exist"
**Solution**: The table structure might be different. Drop and recreate the tables using the setup script.

## Manual Table Creation (if needed)

If the setup script doesn't work, you can create tables manually:

```sql
-- Create recurrent_expenses table
CREATE TABLE recurrent_expenses (
  id BIGSERIAL PRIMARY KEY,
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

-- Create non_recurrent_expenses table
CREATE TABLE non_recurrent_expenses (
  id BIGSERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  payment_deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  description TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('recurrent', 'non_recurrent')),
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on recurrent_expenses" ON recurrent_expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations on non_recurrent_expenses" ON non_recurrent_expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
``` 