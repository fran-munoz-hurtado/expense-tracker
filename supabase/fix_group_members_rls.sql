-- =====================================================
-- FIX: Elimina recursión infinita en políticas RLS de group_members
-- =====================================================
-- Ejecuta esto en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar TODAS las políticas existentes en group_members
DROP POLICY IF EXISTS "Users can view group members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view own group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add themselves" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_members;

-- 2. Política SELECT: usuarios ven solo sus propias filas (sin subconsultas recursivas)
CREATE POLICY "Users can view own memberships" ON public.group_members
  FOR SELECT USING (user_id = auth.uid());

-- 3. Política INSERT: creadores pueden añadirse como primer miembro
CREATE POLICY "Creators can add themselves" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  );

-- 4. Política INSERT: admins pueden invitar a otros (usa subconsulta pero en INSERT, no recursivo)
CREATE POLICY "Admins can add members" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- 5. Política UPDATE: usuarios pueden aceptar su propia invitación (cambiar status)
CREATE POLICY "Users can update own membership" ON public.group_members
  FOR UPDATE USING (user_id = auth.uid());

-- 6. Política UPDATE/DELETE: admins pueden gestionar otros miembros
CREATE POLICY "Admins can update members" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete members" ON public.group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );
