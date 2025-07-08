-- Fix Database Functions - Remove isgoal from transactions table operations
-- This script corrects the functions to not use isgoal in transactions table
-- since isgoal only exists in recurrent_expenses table

-- Step 1: Fix create_recurrent_transactions function
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
        
        -- Insert the transaction record WITH type and category (but WITHOUT isgoal)
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
$$ language 'plpgsql';

-- Step 2: Fix create_non_recurrent_transaction function
CREATE OR REPLACE FUNCTION create_non_recurrent_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the transaction record WITH type and category (but WITHOUT isgoal)
    INSERT INTO transactions (
        user_id, year, month, description, source_id, source_type, value, status, deadline, type, category
    ) VALUES (
        NEW.user_id, NEW.year, NEW.month, NEW.description, NEW.id, 'non_recurrent', NEW.value, 'pending', NEW.payment_deadline, NEW.type, NEW.category
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 3: Fix update_recurrent_transactions function
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
        
        -- Insert the transaction record WITH type and category (but WITHOUT isgoal)
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
$$ language 'plpgsql';

-- Step 4: Fix update_non_recurrent_transaction function
CREATE OR REPLACE FUNCTION update_non_recurrent_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the corresponding transaction record WITH type and category (but WITHOUT isgoal)
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
$$ language 'plpgsql';

-- Verification: Check that the functions were updated correctly
SELECT 'Database functions fixed successfully - isgoal removed from transactions operations' as status; 