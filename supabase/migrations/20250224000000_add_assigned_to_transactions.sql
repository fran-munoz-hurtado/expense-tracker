-- =====================================================
-- ADD assigned_to TO TRANSACTIONS
-- =====================================================
-- Permite asignar cada transacción a un integrante del espacio.
-- Por defecto: asignada al creador del espacio (groups.created_by).
-- =====================================================

-- Step 1: Add column
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_assigned_to ON public.transactions(assigned_to);

COMMENT ON COLUMN public.transactions.assigned_to IS 'Usuario asignado a esta transacción (solo en espacios). Por defecto: creador del espacio.';

-- Step 2: Backfill transacciones existentes con group_id
UPDATE public.transactions t
SET assigned_to = g.created_by
FROM public.groups g
WHERE t.group_id = g.id
  AND t.assigned_to IS NULL;

-- Step 3: Update triggers to set assigned_to on insert
CREATE OR REPLACE FUNCTION create_recurrent_transactions()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    payment_deadline DATE;
    assign_to UUID;
BEGIN
    assign_to := CASE
        WHEN NEW.group_id IS NOT NULL THEN (SELECT created_by FROM public.groups WHERE id = NEW.group_id)
        ELSE NULL
    END;

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
            user_id, group_id, created_by, assigned_to, year, month, description, source_id, source_type, value, status, deadline, type, category
        ) VALUES (
            NEW.user_id, NEW.group_id, NEW.user_id, assign_to, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline, NEW.type, NEW.category
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

CREATE OR REPLACE FUNCTION create_non_recurrent_transaction()
RETURNS TRIGGER AS $$
DECLARE
    assign_to UUID;
BEGIN
    assign_to := CASE
        WHEN NEW.group_id IS NOT NULL THEN (SELECT created_by FROM public.groups WHERE id = NEW.group_id)
        ELSE NULL
    END;

    INSERT INTO transactions (
        user_id, group_id, created_by, assigned_to, year, month, description, source_id, source_type, value, status, deadline, type, category
    ) VALUES (
        NEW.user_id, NEW.group_id, NEW.user_id, assign_to, NEW.year, NEW.month, NEW.description, NEW.id, 'non_recurrent', NEW.value, 'pending', NEW.payment_deadline, NEW.type, NEW.category
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_recurrent_transactions()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    payment_deadline DATE;
    assign_to UUID;
BEGIN
    assign_to := CASE
        WHEN NEW.group_id IS NOT NULL THEN (SELECT created_by FROM public.groups WHERE id = NEW.group_id)
        ELSE NULL
    END;

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
            user_id, group_id, created_by, assigned_to, year, month, description, source_id, source_type, value, status, deadline, type, category
        ) VALUES (
            NEW.user_id, NEW.group_id, NEW.user_id, assign_to, current_year, current_month, NEW.description, NEW.id, 'recurrent', NEW.value, 'pending', payment_deadline, NEW.type, NEW.category
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
