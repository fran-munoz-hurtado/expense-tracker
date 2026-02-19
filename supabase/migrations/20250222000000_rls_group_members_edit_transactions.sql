-- =====================================================
-- RLS: Permitir a miembros del grupo EDITAR y ELIMINAR transacciones del grupo
-- =====================================================
-- Actualmente solo el creador (user_id) puede update/delete.
-- Con esta migración, cualquier miembro activo del grupo puede editar/eliminar.
-- =====================================================

-- Transacciones: miembros del grupo pueden UPDATE y DELETE
CREATE POLICY "Group members can update group transactions" ON public.transactions
  FOR UPDATE
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

CREATE POLICY "Group members can delete group transactions" ON public.transactions
  FOR DELETE
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

-- Recurrent expenses: miembros del grupo pueden UPDATE y DELETE
CREATE POLICY "Group members can update group recurrent expenses" ON public.recurrent_expenses
  FOR UPDATE
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

CREATE POLICY "Group members can delete group recurrent expenses" ON public.recurrent_expenses
  FOR DELETE
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

-- Non-recurrent expenses: miembros del grupo pueden UPDATE y DELETE
CREATE POLICY "Group members can update group non-recurrent expenses" ON public.non_recurrent_expenses
  FOR UPDATE
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

CREATE POLICY "Group members can delete group non-recurrent expenses" ON public.non_recurrent_expenses
  FOR DELETE
  USING (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.status = 'active'
    )
  );

-- Transaction attachments: miembros del grupo pueden INSERT, UPDATE, DELETE en transacciones de grupo
CREATE POLICY "Group members can manage group transaction attachments" ON public.transaction_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.group_members gm ON t.group_id = gm.group_id AND gm.status = 'active'
      WHERE t.id = transaction_attachments.transaction_id
      AND t.group_id IS NOT NULL
      AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.group_members gm ON t.group_id = gm.group_id AND gm.status = 'active'
      WHERE t.id = transaction_attachments.transaction_id
      AND t.group_id IS NOT NULL
      AND gm.user_id = auth.uid()
    )
  );

-- Abonos: miembros del grupo pueden INSERT, UPDATE, DELETE en transacciones de grupo
CREATE POLICY "Group members can manage group abonos" ON public.abonos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.group_members gm ON t.group_id = gm.group_id AND gm.status = 'active'
      WHERE t.id = abonos.transaction_id
      AND t.group_id IS NOT NULL
      AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.group_members gm ON t.group_id = gm.group_id AND gm.status = 'active'
      WHERE t.id = abonos.transaction_id
      AND t.group_id IS NOT NULL
      AND gm.user_id = auth.uid()
    )
  );
