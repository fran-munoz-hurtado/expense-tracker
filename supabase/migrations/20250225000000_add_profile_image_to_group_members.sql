-- =====================================================
-- Add profile_image_url to get_group_members RPC
-- =====================================================
-- Permite mostrar avatar de Google en la columna de asignación.
-- DROP necesario porque cambiamos el tipo de retorno (nueva columna).
-- =====================================================

DROP FUNCTION IF EXISTS public.get_group_members(UUID);

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  profile_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    u.email,
    u.profile_image_url
  FROM public.group_members gm
  LEFT JOIN public.users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY (gm.role = 'admin') DESC, u.first_name, u.last_name;
END;
$$;

COMMENT ON FUNCTION public.get_group_members(UUID) IS 'Devuelve todos los miembros de un grupo (incl. profile_image_url). Solo accesible si auth.uid() es miembro.';

REVOKE ALL ON FUNCTION public.get_group_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO service_role;
