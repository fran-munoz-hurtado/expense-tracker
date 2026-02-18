-- =====================================================
-- FIX: Crear grupos sin depender de RLS en INSERT
-- =====================================================
-- Usa una función SECURITY DEFINER para crear grupo + miembro
-- sin depender del JWT en el contexto del INSERT.
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_group_for_user(group_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  new_group_id UUID;
  new_name TEXT := trim(group_name);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF new_name = '' OR new_name IS NULL THEN
    RAISE EXCEPTION 'El nombre del grupo no puede estar vacío';
  END IF;

  INSERT INTO public.groups (name, created_by)
  VALUES (new_name, uid)
  RETURNING id INTO new_group_id;

  INSERT INTO public.group_members (group_id, user_id, role, status, joined_at)
  VALUES (new_group_id, uid, 'admin', 'active', now());

  RETURN jsonb_build_object(
    'id', new_group_id,
    'name', new_name,
    'created_by', uid,
    'created_at', now(),
    'updated_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.create_group_for_user(TEXT) IS 'Crea un grupo y añade al creador como admin. Evita problemas de RLS en INSERT.';

-- Solo usuarios autenticados pueden ejecutar
REVOKE ALL ON FUNCTION public.create_group_for_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_for_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_for_user(TEXT) TO service_role;
