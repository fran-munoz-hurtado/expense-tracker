-- Add notes column to transactions table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.transactions.notes IS 'Optional user notes for the transaction (max 500 chars enforced in app)';
