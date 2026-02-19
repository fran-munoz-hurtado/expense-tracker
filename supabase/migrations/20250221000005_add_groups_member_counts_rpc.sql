-- =====================================================
-- RPC: Obtener cantidad de miembros por grupo
-- =====================================================
-- Devuelve group_id y member_count para grupos donde auth.uid() es miembro.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_groups_member_counts(p_group_ids UUID[])
RETURNS TABLE (group_id UUID, member_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gmc.group_id,
    gmc.cnt AS member_count
  FROM (
    SELECT gm.group_id, COUNT(*)::BIGINT AS cnt
    FROM public.group_members gm
    WHERE gm.group_id = ANY(p_group_ids) AND gm.status = 'active'
    GROUP BY gm.group_id
  ) gmc
  WHERE EXISTS (
    SELECT 1 FROM public.group_members m
    WHERE m.group_id = gmc.group_id AND m.user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.get_groups_member_counts(UUID[]) IS 'Devuelve cantidad de miembros por grupo. Solo para grupos donde auth.uid() es miembro.';

REVOKE ALL ON FUNCTION public.get_groups_member_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_groups_member_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_groups_member_counts(UUID[]) TO service_role;
