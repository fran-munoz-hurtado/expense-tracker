-- =====================================================
-- RLS: Permitir a miembros del grupo ver transacciones del grupo
-- =====================================================
-- La política "Users can view own transactions" solo permite user_id = auth.uid().
-- Las transacciones de grupo pueden tener user_id del creador (admin).
-- Los demás miembros no las veían. Esta política lo corrige.
-- =====================================================

-- Política adicional: ver transacciones de grupos donde el usuario es miembro
CREATE POLICY "Users can view group transactions" ON public.transactions
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

COMMENT ON POLICY "Users can view group transactions" ON public.transactions IS
  'Los miembros activos de un grupo pueden ver las transacciones de ese grupo.';

-- Política para ver attachments de transacciones de grupo
CREATE POLICY "Users can view group transaction attachments" ON public.transaction_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.group_members gm ON t.group_id = gm.group_id AND gm.status = 'active'
      WHERE t.id = transaction_attachments.transaction_id
      AND t.group_id IS NOT NULL
      AND gm.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view group transaction attachments" ON public.transaction_attachments IS
  'Los miembros del grupo pueden ver los adjuntos de las transacciones del grupo.';

-- Política para ver abonos de transacciones de grupo
CREATE POLICY "Users can view group transaction abonos" ON public.abonos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.group_members gm ON t.group_id = gm.group_id AND gm.status = 'active'
      WHERE t.id = abonos.transaction_id
      AND t.group_id IS NOT NULL
      AND gm.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view group transaction abonos" ON public.abonos IS
  'Los miembros del grupo pueden ver los abonos de las transacciones del grupo.';
