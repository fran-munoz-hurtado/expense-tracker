-- =====================================================
-- Fix: Replace gen_random_bytes with md5 (built-in, no extension)
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

  -- Generate token (md5 is built-in, no pgcrypto needed. 64 hex chars for uniqueness.)
  inv_token := md5(random()::text || clock_timestamp()::text || target_user_id::text || p_group_id::text)
    || md5(clock_timestamp()::text || random()::text || p_group_id::text);

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
