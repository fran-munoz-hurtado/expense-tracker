-- =====================================================
-- RPC para obtener TODOS los miembros de un grupo
-- =====================================================
-- La política RLS "Users can view own memberships" solo permite ver la fila propia.
-- Esta RPC permite a cualquier miembro del grupo ver la lista completa.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo si el usuario actual es miembro del grupo (cualquier status)
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    gm.id,
    gm.user_id,
    gm.role,
    gm.status,
    gm.joined_at,
    u.first_name,
    u.last_name,
    u.email
  FROM public.group_members gm
  LEFT JOIN public.users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY (gm.role = 'admin') DESC, u.first_name, u.last_name;
END;
$$;

COMMENT ON FUNCTION public.get_group_members(UUID) IS 'Devuelve todos los miembros de un grupo. Solo accesible si auth.uid() es miembro.';

REVOKE ALL ON FUNCTION public.get_group_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO service_role;
