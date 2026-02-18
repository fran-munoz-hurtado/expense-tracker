-- Update triggers to pass group_id and created_by when inserting transactions
-- Run after 20250219000000_add_groups_schema.sql

-- Recreate create_recurrent_transactions to include group_id and created_by
CREATE OR REPLACE FUNCTION create_recurrent_transactions()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    payment_deadline DATE;
BEGIN
    current_year := NEW.year_from;
    current_month := NEW.month_from;

    WHILE (current_year < NEW.year_to) OR 
          (current_year = NEW.year_to AND current_month <= NEW.month_to) LOOP

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

        INSERT INTO transactions (
            user_id, group_id, created_by, year, month, description, source_id, source_type, value, status, deadline, type, category
        ) VALUES (
            NEW.user_id, NEW.group_id, NEW.user_id, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline, NEW.type, NEW.category
        );

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

-- Recreate create_non_recurrent_transaction to include group_id and created_by
CREATE OR REPLACE FUNCTION create_non_recurrent_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO transactions (
        user_id, group_id, created_by, year, month, description, source_id, source_type, value, status, deadline, type, category
    ) VALUES (
        NEW.user_id, NEW.group_id, NEW.user_id, NEW.year, NEW.month, NEW.description, NEW.id, 'non_recurrent', NEW.value, 'pending', NEW.payment_deadline, NEW.type, NEW.category
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate update_recurrent_transactions to include group_id
CREATE OR REPLACE FUNCTION update_recurrent_transactions()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    payment_deadline DATE;
BEGIN
    DELETE FROM transactions 
    WHERE source_id = NEW.id AND source_type = 'recurrent';

    current_year := NEW.year_from;
    current_month := NEW.month_from;

    WHILE (current_year < NEW.year_to) OR 
          (current_year = NEW.year_to AND current_month <= NEW.month_to) LOOP

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

        INSERT INTO transactions (
            user_id, group_id, created_by, year, month, description, source_id, source_type, value, status, deadline, type, category
        ) VALUES (
            NEW.user_id, NEW.group_id, NEW.user_id, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline, NEW.type, NEW.category
        );

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
