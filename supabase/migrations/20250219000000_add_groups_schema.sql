-- =====================================================
-- ADD GROUPS SCHEMA - Tables and columns for group-based transactions
-- =====================================================
-- This migration adds the groups infrastructure without changing app behavior.
-- Run the bootstrap script (20250219000001_bootstrap_my_group.sql) after this
-- to create your group and assign existing data.
-- =====================================================

-- Step 1: Create groups table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

COMMENT ON TABLE public.groups IS 'Groups for shared finances (family, team, etc.). All members see the same transactions.';

-- Step 2: Create group_members table (user-group with role and status)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending_invitation', 'active', 'deactivated')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(group_id, status);

COMMENT ON TABLE public.group_members IS 'Users in groups with role (admin/member) and status (pending_invitation, active, deactivated).';

-- Step 3: Add group_id and created_by to transactions
-- =====================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON public.transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

COMMENT ON COLUMN public.transactions.group_id IS 'Group this transaction belongs to. NULL = legacy (migrating).';
COMMENT ON COLUMN public.transactions.created_by IS 'User who created this transaction (traceability).';

-- Step 4: Add group_id to recurrent_expenses
-- =====================================================
ALTER TABLE public.recurrent_expenses
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_recurrent_expenses_group_id ON public.recurrent_expenses(group_id);

COMMENT ON COLUMN public.recurrent_expenses.group_id IS 'Group this recurrent expense belongs to. NULL = legacy.';

-- Step 5: Add group_id to non_recurrent_expenses
-- =====================================================
ALTER TABLE public.non_recurrent_expenses
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_non_recurrent_expenses_group_id ON public.non_recurrent_expenses(group_id);

COMMENT ON COLUMN public.non_recurrent_expenses.group_id IS 'Group this non-recurrent expense belongs to. NULL = legacy.';

-- Step 6: Enable RLS on new tables (permissive for now - app still uses user_id)
-- =====================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Groups: creator can manage; members can view (we'll refine when app uses groups)
CREATE POLICY "Users can view groups they belong to" ON public.groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update group" ON public.groups
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin')
  );

-- Group members: users can view members of groups they belong to
CREATE POLICY "Users can view group members of their groups" ON public.group_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

-- Group creator can add themselves as first member (bootstrap)
CREATE POLICY "Group creators can add themselves" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  );

-- Group admins can add/update/delete other members
CREATE POLICY "Group admins can manage members" ON public.group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

-- Users can update own membership (e.g. accept invite: pending -> active)
CREATE POLICY "Users can update own membership" ON public.group_members
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- MIGRATION COMPLETE - Run bootstrap script next
-- =====================================================
