-- =====================================================
-- RPC para que admins puedan sacar a un miembro del grupo
-- =====================================================

CREATE OR REPLACE FUNCTION public.remove_group_member(p_group_id UUID, p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  is_admin BOOLEAN;
  target_role TEXT;
  admin_count INT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  IF p_target_user_id = uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Para salir tú mismo, usa "Salir del grupo"');
  END IF;

  -- Verificar que el llamador es admin
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = uid AND gm.role = 'admin' AND gm.status = 'active'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo los administradores pueden sacar miembros');
  END IF;

  -- Obtener rol del objetivo
  SELECT gm.role INTO target_role
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = p_target_user_id;

  IF target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El usuario no es miembro de este grupo');
  END IF;

  -- Si el objetivo es admin, verificar que quede al menos un admin
  IF target_role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.group_members
    WHERE group_id = p_group_id AND role = 'admin' AND status = 'active';

    IF admin_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'No puedes sacar al único administrador del grupo');
    END IF;
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.remove_group_member(UUID, UUID) IS 'Permite a admins sacar a un miembro del grupo.';

REVOKE ALL ON FUNCTION public.remove_group_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID) TO service_role;
