import { supabase, type User, type Abono } from '@/lib/supabase'
import { AppError, asyncHandler } from '@/lib/errors/AppError'

export const fetchAbonosByTransactionIds = asyncHandler(
  async (userId: string, transactionIds: number[]): Promise<Record<number, Abono[]>> => {
    if (!userId || transactionIds.length === 0) return {}

    const { data, error } = await supabase
      .from('abonos')
      .select('*')
      .eq('user_id', userId)
      .in('transaction_id', transactionIds)
      .order('paid_at', { ascending: false })

    if (error) throw AppError.database(`Failed to fetch abonos: ${error.message}`, error)

    const byTransaction: Record<number, Abono[]> = {}
    for (const id of transactionIds) byTransaction[id] = []
    for (const row of data || []) {
      const t = row as Abono
      if (!byTransaction[t.transaction_id]) byTransaction[t.transaction_id] = []
      byTransaction[t.transaction_id].push(t)
    }
    return byTransaction
  }
)

export const createAbono = asyncHandler(
  async (userId: string, transactionId: number, amount: number, paidAt?: string): Promise<Abono> => {
    const { data, error } = await supabase
      .from('abonos')
      .insert({
        transaction_id: transactionId,
        user_id: userId,
        amount,
        paid_at: paidAt || new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw AppError.database(`Failed to create abono: ${error.message}`, error)
    return data as Abono
  }
)

export const updateAbono = asyncHandler(
  async (userId: string, abonoId: number, amount: number, paidAt: string): Promise<Abono> => {
    const { data, error } = await supabase
      .from('abonos')
      .update({ amount, paid_at: paidAt, updated_at: new Date().toISOString() })
      .eq('id', abonoId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw AppError.database(`Failed to update abono: ${error.message}`, error)
    return data as Abono
  }
)

export const deleteAbono = asyncHandler(
  async (userId: string, abonoId: number): Promise<void> => {
    const { error } = await supabase
      .from('abonos')
      .delete()
      .eq('id', abonoId)
      .eq('user_id', userId)

    if (error) throw AppError.database(`Failed to delete abono: ${error.message}`, error)
  }
)
