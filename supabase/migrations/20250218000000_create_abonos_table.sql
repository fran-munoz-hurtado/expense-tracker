-- Create abonos table for partial payments on transactions
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.abonos (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abonos_transaction_id ON public.abonos(transaction_id);
CREATE INDEX IF NOT EXISTS idx_abonos_user_id ON public.abonos(user_id);

ALTER TABLE public.abonos ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own abonos
CREATE POLICY "Users can view own abonos"
  ON public.abonos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own abonos"
  ON public.abonos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own abonos"
  ON public.abonos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own abonos"
  ON public.abonos FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.abonos IS 'Partial payments (abonos) linked to expense transactions';
