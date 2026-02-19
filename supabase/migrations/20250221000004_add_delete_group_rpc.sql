-- =====================================================
-- RPC para que el creador pueda eliminar su espacio
-- =====================================================
-- Solo el creador (groups.created_by) puede eliminar.
-- Al borrar el grupo, CASCADE elimina:
--   - group_members, group_invitations
--   - transactions (y por CASCADE: transaction_attachments, abonos)
--   - recurrent_expenses, non_recurrent_expenses donde group_id = X
-- Los archivos en Storage deben eliminarse desde el cliente antes de llamar.
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  group_creator UUID;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT g.created_by INTO group_creator
  FROM public.groups g
  WHERE g.id = p_group_id;

  IF group_creator IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El grupo no existe');
  END IF;

  IF group_creator != uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo el creador del espacio puede eliminarlo');
  END IF;

  -- CASCADE elimina: group_members, group_invitations, transactions (+ attachments, abonos), recurrent_expenses, non_recurrent_expenses
  DELETE FROM public.groups WHERE id = p_group_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.delete_group(UUID) IS 'Elimina el espacio y todo su contenido. Solo el creador puede ejecutarlo.';

REVOKE ALL ON FUNCTION public.delete_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group(UUID) TO service_role;
