-- =====================================================
-- FIX: Permitir crear grupos (RLS bloqueaba el INSERT)
-- =====================================================
-- La app usa la función create_group_for_user (migración 20250219000002).
-- Ejecuta migraciones: supabase db push
--
-- Si no usas migraciones, ejecuta esto en Supabase SQL Editor:
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
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF new_name = '' OR new_name IS NULL THEN RAISE EXCEPTION 'El nombre del grupo no puede estar vacío'; END IF;
  INSERT INTO public.groups (name, created_by) VALUES (new_name, uid) RETURNING id INTO new_group_id;
  INSERT INTO public.group_members (group_id, user_id, role, status, joined_at)
  VALUES (new_group_id, uid, 'admin', 'active', now());
  RETURN jsonb_build_object('id', new_group_id, 'name', new_name, 'created_by', uid, 'created_at', now(), 'updated_at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.create_group_for_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_for_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_for_user(TEXT) TO service_role;
