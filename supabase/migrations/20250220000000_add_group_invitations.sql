-- =====================================================
-- ADD GROUP INVITATIONS - Invite members by email + token link
-- =====================================================
-- Supports:
-- 1. Invite by email (user must be registered, looked up in public.users)
-- 2. group_invitations table for email link token
-- 3. RPC: invite_member_to_group, accept_group_invitation, reject_group_invitation
-- =====================================================

-- Step 1: Create group_invitations table for email link tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON public.group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_user_id ON public.group_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON public.group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_expires_at ON public.group_invitations(expires_at);

COMMENT ON TABLE public.group_invitations IS 'Tokens for email invitation links. One per (group, user). Used to accept via link.';

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: invitees see their own invitations (to accept via link); admins see invitations for their groups
CREATE POLICY "Users can view own invitations" ON public.group_invitations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view group invitations" ON public.group_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_invitations.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- No direct INSERT/UPDATE/DELETE from client - only via RPC (SECURITY DEFINER)

-- Step 2: Allow users to delete their own pending membership (reject invitation)
-- =====================================================
CREATE POLICY "Users can delete own pending membership" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid()
    AND status = 'pending_invitation'
  );

-- Step 3: RPC - invite_member_to_group
-- =====================================================
CREATE OR REPLACE FUNCTION public.invite_member_to_group(p_group_id UUID, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  target_user_id UUID;
  inv_token TEXT;
  group_name_val TEXT;
  inviter_email TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- Check inviter is admin of the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = uid
      AND gm.role = 'admin'
      AND gm.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para invitar a este grupo');
  END IF;

  -- Lookup user by email (case-insensitive)
  SELECT u.id INTO target_user_id
  FROM public.users u
  WHERE LOWER(trim(u.email)) = LOWER(trim(p_email))
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No encontramos ninguna cuenta con ese correo. Pídele que se registre primero.');
  END IF;

  -- Cannot invite self
  IF target_user_id = uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes invitarte a ti mismo');
  END IF;

  -- Check if already member (active or pending)
  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta persona ya es miembro o tiene una invitación pendiente');
  END IF;

  -- Insert group_member with pending_invitation
  INSERT INTO public.group_members (group_id, user_id, role, status, invited_by, invited_at, updated_at)
  VALUES (p_group_id, target_user_id, 'member', 'pending_invitation', uid, now(), now());

  -- Generate token and insert invitation (for email link)
  inv_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.group_invitations (group_id, user_id, invited_by, token, expires_at)
  VALUES (p_group_id, target_user_id, uid, inv_token, now() + interval '7 days');

  -- Get group name and inviter email for the response (app can use to build email)
  SELECT g.name INTO group_name_val FROM public.groups g WHERE g.id = p_group_id;
  SELECT u.email INTO inviter_email FROM public.users u WHERE u.id = uid;

  RETURN jsonb_build_object(
    'success', true,
    'invited_user_id', target_user_id,
    'token', inv_token,
    'group_name', group_name_val,
    'inviter_email', inviter_email,
    'expires_at', (SELECT expires_at FROM public.group_invitations WHERE token = inv_token)
  );
END;
$$;

COMMENT ON FUNCTION public.invite_member_to_group(UUID, TEXT) IS 'Invita a un usuario registrado por email. Devuelve token para el link de aceptación.';

REVOKE ALL ON FUNCTION public.invite_member_to_group(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_member_to_group(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_member_to_group(UUID, TEXT) TO service_role;

-- Step 4: RPC - accept_group_invitation (for email link or in-app)
-- =====================================================
CREATE OR REPLACE FUNCTION public.accept_group_invitation(p_token TEXT DEFAULT NULL, p_group_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  inv_group_id UUID;
  inv_user_id UUID;
  group_name_val TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- Path A: accept via token (email link)
  IF p_token IS NOT NULL AND p_token != '' THEN
    SELECT gi.group_id, gi.user_id INTO inv_group_id, inv_user_id
    FROM public.group_invitations gi
    WHERE gi.token = p_token AND gi.expires_at > now();

    IF inv_group_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Enlace inválido o expirado');
    END IF;

    IF inv_user_id != uid THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este enlace no corresponde a tu cuenta');
    END IF;

    -- Update group_members to active
    UPDATE public.group_members
    SET status = 'active', joined_at = now(), updated_at = now()
    WHERE group_id = inv_group_id AND user_id = uid AND status = 'pending_invitation';

    -- Delete invitation
    DELETE FROM public.group_invitations WHERE token = p_token;

    SELECT g.name INTO group_name_val FROM public.groups g WHERE g.id = inv_group_id;
    RETURN jsonb_build_object('success', true, 'group_id', inv_group_id, 'group_name', group_name_val);
  END IF;

  -- Path B: accept via group_id (in-app notification - user already has pending membership)
  IF p_group_id IS NOT NULL THEN
    -- Verify they have pending invitation
    IF NOT EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = p_group_id AND user_id = uid AND status = 'pending_invitation'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes una invitación pendiente para este grupo');
    END IF;

    UPDATE public.group_members
    SET status = 'active', joined_at = now(), updated_at = now()
    WHERE group_id = p_group_id AND user_id = uid;

    -- Clean up invitation if exists
    DELETE FROM public.group_invitations WHERE group_id = p_group_id AND user_id = uid;

    SELECT g.name INTO group_name_val FROM public.groups g WHERE g.id = p_group_id;
    RETURN jsonb_build_object('success', true, 'group_id', p_group_id, 'group_name', group_name_val);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Proporciona token o group_id');
END;
$$;

COMMENT ON FUNCTION public.accept_group_invitation(TEXT, UUID) IS 'Acepta invitación: por token (email link) o por group_id (in-app).';

REVOKE ALL ON FUNCTION public.accept_group_invitation(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_group_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_group_invitation(TEXT, UUID) TO service_role;

-- Step 5: RPC - reject_group_invitation (in-app only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.reject_group_invitation(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- Delete own pending membership
  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = uid AND status = 'pending_invitation';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes una invitación pendiente para este grupo');
  END IF;

  -- Clean up invitation
  DELETE FROM public.group_invitations WHERE group_id = p_group_id AND user_id = uid;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.reject_group_invitation(UUID) IS 'Rechaza una invitación pendiente (elimina la membresía).';

REVOKE ALL ON FUNCTION public.reject_group_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_group_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_group_invitation(UUID) TO service_role;
