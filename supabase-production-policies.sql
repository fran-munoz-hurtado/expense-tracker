-- =====================================================
-- PRODUCTION RLS POLICIES FOR NETLIFY DEPLOYMENT
-- =====================================================
-- Run this in Supabase SQL Editor after your main schema is set up
-- These policies ensure data security in production

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_recurrent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- RECURRENT EXPENSES POLICIES
-- =====================================================

-- Users can view their own recurrent expenses
CREATE POLICY "Users can view own recurrent expenses" ON public.recurrent_expenses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own recurrent expenses
CREATE POLICY "Users can insert own recurrent expenses" ON public.recurrent_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own recurrent expenses
CREATE POLICY "Users can update own recurrent expenses" ON public.recurrent_expenses
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own recurrent expenses
CREATE POLICY "Users can delete own recurrent expenses" ON public.recurrent_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- NON-RECURRENT EXPENSES POLICIES
-- =====================================================

-- Users can view their own non-recurrent expenses
CREATE POLICY "Users can view own non-recurrent expenses" ON public.non_recurrent_expenses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own non-recurrent expenses
CREATE POLICY "Users can insert own non-recurrent expenses" ON public.non_recurrent_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own non-recurrent expenses
CREATE POLICY "Users can update own non-recurrent expenses" ON public.non_recurrent_expenses
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own non-recurrent expenses
CREATE POLICY "Users can delete own non-recurrent expenses" ON public.non_recurrent_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view transactions of groups they belong to
CREATE POLICY "Users can view group transactions" ON public.transactions
  FOR SELECT
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- USER CATEGORIES POLICIES
-- =====================================================

-- Users can view their own categories
CREATE POLICY "Users can view own categories" ON public.user_categories
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own categories
CREATE POLICY "Users can insert own categories" ON public.user_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own categories
CREATE POLICY "Users can update own categories" ON public.user_categories
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own categories
CREATE POLICY "Users can delete own categories" ON public.user_categories
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TRANSACTION ATTACHMENTS POLICIES
-- =====================================================

-- Users can view attachments for their own transactions
CREATE POLICY "Users can view own transaction attachments" ON public.transaction_attachments
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Users can view attachments for group transactions
CREATE POLICY "Users can view group transaction attachments" ON public.transaction_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.group_members gm ON t.group_id = gm.group_id AND gm.status = 'active'
      WHERE t.id = transaction_attachments.transaction_id
      AND t.group_id IS NOT NULL
      AND gm.user_id = auth.uid()
    )
  );

-- Users can insert attachments for their own transactions
CREATE POLICY "Users can insert own transaction attachments" ON public.transaction_attachments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Users can update attachments for their own transactions
CREATE POLICY "Users can update own transaction attachments" ON public.transaction_attachments
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Users can delete attachments for their own transactions
CREATE POLICY "Users can delete own transaction attachments" ON public.transaction_attachments
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- =====================================================
-- VERIFY POLICIES ARE ACTIVE
-- =====================================================

-- Run this query to verify all policies are created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname; 