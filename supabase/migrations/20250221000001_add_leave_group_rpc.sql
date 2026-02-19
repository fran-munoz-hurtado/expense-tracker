-- =====================================================
-- RPC para que miembros (no admins) puedan salir del grupo
-- =====================================================

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  my_role TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT gm.role INTO my_role
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = uid;

  IF my_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eres miembro de este grupo');
  END IF;

  IF my_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Los administradores no pueden salir del grupo');
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = uid;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.leave_group(UUID) IS 'Permite a miembros (no admins) salir del grupo.';

REVOKE ALL ON FUNCTION public.leave_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO service_role;
