-- =====================================================
-- RLS: Permitir a miembros del grupo VER (SELECT) gastos del grupo
-- =====================================================
-- Los miembros pueden ver transacciones via "Users can view group transactions",
-- pero al editar se hace fetch de non_recurrent_expenses/recurrent_expenses por id.
-- Esas tablas solo tenían SELECT con user_id = auth.uid(), así que gastos creados
-- por otros miembros del grupo no eran accesibles. Esta migración lo corrige.
-- =====================================================

-- Recurrent expenses: miembros del grupo pueden SELECT
CREATE POLICY "Group members can view group recurrent expenses" ON public.recurrent_expenses
  FOR SELECT
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

-- Non-recurrent expenses: miembros del grupo pueden SELECT
CREATE POLICY "Group members can view group non-recurrent expenses" ON public.non_recurrent_expenses
  FOR SELECT
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );
