import { create } from 'zustand'
import { fetchUserTransactions, clearUserCache } from '@/lib/dataUtils'
import { supabase } from '@/lib/supabase'
import type { Transaction, User } from '@/lib/supabase'

type MovementType =
  | 'SINGLE_EXPENSE'
  | 'RECURRENT_EXPENSE'
  | 'SINGLE_INCOME'
  | 'RECURRENT_INCOME'
  | 'GOAL'
  | 'SAVINGS'

type RecurrentFormData = {
  description: string
  month_from: number
  month_to: number
  year_from: number
  year_to: number
  value: number
  payment_day_deadline?: number | null
  isgoal?: boolean
  category?: string
}

interface TransactionStore {
  transactions: Transaction[]
  isLoading: boolean
  lastFetchedScopes: Record<string, number>
  setTransactions: (txs: Transaction[]) => void
  setLoading: (loading: boolean) => void
  fetchTransactions: (params: {
    userId: string // UUID
    groupId: string | null
    year?: number
    month?: number
    syncVersion?: number
    force?: boolean
    scope?: 'all'
  }) => Promise<void>
  markTransactionStatus: (params: {
    transactionId: number
    newStatus: 'paid' | 'pending'
    userId: string // UUID
  }) => Promise<void>
  updateTransaction: (params: {
    id: number
    userId: string // UUID
    description?: string
    value?: number
    deadline?: string | null
    notes?: string | null
  }) => Promise<void>
  updateRecurrentTransactionSeries: (params: {
    userId: string // UUID
    recurrentId: number
    updatedData: RecurrentFormData
    groupId?: string | null // cuando es gasto de grupo
  }) => Promise<void>
  createTransaction: (params: {
    userId: string // UUID
    movementType: MovementType
    payload: any
  }) => Promise<void>
  deleteTransaction: (params: {
    transactionId: number
    userId: string // UUID
  }) => Promise<void>
  deleteRecurrentSeries: (params: {
    sourceId: number
    userId: string // UUID
    groupId?: string | null // cuando es serie de grupo
  }) => Promise<void>
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoading: false,
  lastFetchedScopes: {},
  setTransactions: (txs) => {
    console.log('[zustand] setTransactions called with', txs.length, 'items')
    set({ transactions: txs })
  },
  setLoading: (loading) => {
    set({ isLoading: loading })
  },
  fetchTransactions: async ({ userId, groupId, year, month, syncVersion, force, scope }) => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('[zustand] fetchTransactions: invalid userId provided:', userId)
      return
    }
    if (!groupId) {
      set({ transactions: [] })
      return
    }

    const isYearOnly = !month && year && !scope
    if (!scope && !isYearOnly && (!month || !year)) {
      console.warn('[zustand] fetchTransactions: missing month/year and no scope:all — aborting')
      return
    }

    const scopeKey = scope === 'all'
      ? `${groupId}:all`
      : isYearOnly
        ? `${groupId}:year:${year}`
        : `${groupId}:${year}:${month}`
        
    const fetchedVersion = get().lastFetchedScopes?.[scopeKey]
    
    // Skip deduplication check if force is enabled
    if (!force && fetchedVersion === syncVersion && syncVersion !== undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] fetchTransactions: skipping fetch for', scopeKey, 'version', syncVersion)
      }
      return
    }

    if (process.env.NODE_ENV === 'development') {
      if (force) {
        console.log('[zustand] fetchTransactions: force enabled → refetching from Supabase for', scopeKey)
      }
      
      if (scope === 'all') {
        console.log('[zustand] fetchTransactions: loading all transactions for user', userId, syncVersion ? `(version ${syncVersion})` : '(no version)')
      } else if (isYearOnly) {
        console.log('[zustand] fetchTransactions: loading transactions for user', userId, 'year', year, syncVersion ? `(version ${syncVersion})` : '(no version)')
      } else {
        console.log('[zustand] fetchTransactions: loading transactions for user', userId, 'month', month, 'year', year, syncVersion ? `(version ${syncVersion})` : '(no version)')
      }
    }
    
    const { setLoading } = get()
    
    try {
      setLoading(true)
      // Create a mock user object for fetchUserTransactions
      const user = { id: userId } as User
      
      const transactions = scope === 'all'
        ? await fetchUserTransactions(user, undefined, undefined, undefined, undefined, groupId)
        : isYearOnly
          ? await fetchUserTransactions(user, undefined, year, undefined, undefined, groupId)
          : await fetchUserTransactions(user, month, year, undefined, undefined, groupId)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] fetchTransactions: loaded', transactions.length, 'transactions')
      }
      
      set((state) => ({
        transactions: transactions,
        lastFetchedScopes: {
          ...state.lastFetchedScopes,
          [scopeKey]: syncVersion ?? Date.now() // fallback para sesiones sin versión
        },
      }))
    } catch (error) {
      console.error('[zustand] fetchTransactions: error', error)
      set({ transactions: [] })
    } finally {
      setLoading(false)
    }
  },
  markTransactionStatus: async ({
    transactionId,
    newStatus,
    userId,
  }) => {
    const { transactions } = get()

    const original = transactions.find(t => t.id === transactionId)
    if (!original) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[zustand] markTransactionStatus: transaction not found', transactionId)
      }
      return
    }

    // ✅ 1. Mutación optimista
    set({
      transactions: transactions.map(t =>
        t.id === transactionId ? { ...t, status: newStatus } : t
      ),
    })

    // ✅ 2. Persistir en Supabase (group_id si es transacción de grupo)
    let query = supabase.from('transactions').update({ status: newStatus }).eq('id', transactionId)
    if (original.group_id) {
      query = query.eq('group_id', original.group_id)
    } else {
      query = query.eq('user_id', userId)
    }
    const { error } = await query

    // ❌ 3. Revertir si hay error
    if (error) {
      set({
        transactions: transactions.map(t =>
          t.id === transactionId ? original : t
        ),
      })
      console.error('[zustand] markTransactionStatus: failed to update', error)
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] markTransactionStatus: updated transaction', transactionId, 'to', newStatus)
      }
    }
  },
  updateTransaction: async ({
    id,
    userId,
    description,
    value,
    deadline,
    notes,
  }) => {
    const { transactions } = get()

    const original = transactions.find(t => t.id === id)
    if (!original) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[zustand] updateTransaction: transaction not found', id)
      }
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] updateTransaction: editing transaction', id, 'with new values', { description, value, deadline, notes })
    }

    // ✅ 1. Mutación optimista
    const updatedTransaction = {
      ...original,
      ...(description !== undefined && { description }),
      ...(value !== undefined && { value }),
      ...(deadline !== undefined && { deadline }),
      ...(notes !== undefined && { notes }),
    }

    set({
      transactions: transactions.map(t =>
        t.id === id ? updatedTransaction : t
      ),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] updateTransaction: updated transaction', id, 'optimistically')
    }

    // ✅ 2. Persistir en Supabase
    const updateData: any = {}
    if (description !== undefined) updateData.description = description
    if (value !== undefined) updateData.value = value
    if (deadline !== undefined) updateData.deadline = deadline
    if (notes !== undefined) updateData.notes = notes

    let updateQuery = supabase.from('transactions').update(updateData).eq('id', id)
    if (original.group_id) {
      updateQuery = updateQuery.eq('group_id', original.group_id)
    } else {
      updateQuery = updateQuery.eq('user_id', userId)
    }
    const { error } = await updateQuery

    // ❌ 3. Revertir si hay error
    if (error) {
      set({
        transactions: transactions.map(t =>
          t.id === id ? original : t
        ),
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] updateTransaction: rollback transaction', id, 'due to error')
      }
      console.error('[zustand] updateTransaction: failed to update', error)
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] updateTransaction: Supabase update confirmed for transaction', id)
      }

      // ✅ 4. Sincronización global
      try {
        clearUserCache(userId)
        if (process.env.NODE_ENV === 'development') {
          console.log('[zustand] updateTransaction: cleared cache for user', userId)
        }
      } catch (cacheError) {
        console.warn('[zustand] updateTransaction: error clearing cache', cacheError)
      }
    }
  },
  updateRecurrentTransactionSeries: async ({
    userId,
    recurrentId,
    updatedData,
    groupId,
  }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] 🔄 updateRecurrentTransactionSeries: start', { 
        userId, 
        recurrentId, 
        groupId,
        range: `${updatedData.month_from}/${updatedData.year_from} - ${updatedData.month_to}/${updatedData.year_to}`,
        description: updatedData.description,
        value: updatedData.value
      })
    }

    try {
      // ✅ 1. Actualizar recurrent_expenses (Supabase manejará los triggers)
      let recurrentQuery = supabase.from('recurrent_expenses').update({
        description: updatedData.description,
        month_from: updatedData.month_from,
        month_to: updatedData.month_to,
        year_from: updatedData.year_from,
        year_to: updatedData.year_to,
        value: updatedData.value,
        payment_day_deadline: updatedData.payment_day_deadline,
        isgoal: updatedData.isgoal || false,
        category: updatedData.category,
      }).eq('id', recurrentId)
      if (groupId) {
        recurrentQuery = recurrentQuery.eq('group_id', groupId)
      } else {
        recurrentQuery = recurrentQuery.eq('user_id', userId)
      }
      const { error } = await recurrentQuery

      if (error) {
        console.error('[zustand] ❌ updateRecurrentTransactionSeries: error updating recurrent_expenses', error)
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] ✅ updateRecurrentTransactionSeries: recurrent_expenses updated successfully')
        console.log('[zustand] 🔄 Supabase triggers will now DELETE old transactions and CREATE new ones for the updated range')
      }

      // ✅ 2. Esperar brevemente para dar tiempo a los triggers
      await new Promise(resolve => setTimeout(resolve, 600))

      // ✅ 3. Disparar sincronización global
      try {
        clearUserCache(userId)
        if (process.env.NODE_ENV === 'development') {
          console.log('[zustand] updateRecurrentTransactionSeries: cleared cache for user', userId, '- all views will refresh')
        }
      } catch (cacheError) {
        console.warn('[zustand] updateRecurrentTransactionSeries: error clearing cache', cacheError)
      }

    } catch (err) {
      console.error('[zustand] updateRecurrentTransactionSeries: unexpected error', err)
    }
  },
  createTransaction: async ({
    userId,
    movementType,
    payload,
  }) => {
    try {
      const table = ['SINGLE_EXPENSE', 'SINGLE_INCOME'].includes(movementType)
        ? 'non_recurrent_expenses'
        : 'recurrent_expenses'

      const { error } = await supabase
        .from(table)
        .insert([{ ...payload, user_id: userId }])

      if (error) {
        console.error('[zustand] createTransaction: failed to insert', error)
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] createTransaction: successfully inserted in', table)
      }

      // Esperar brevemente antes de refrescar para permitir que Supabase complete los triggers
      await new Promise(resolve => setTimeout(resolve, 600))

      // Clear cache to trigger data refresh across all components
      try {
        clearUserCache(userId)
        if (process.env.NODE_ENV === 'development') {
          console.log('[zustand] createTransaction: cleared cache for user', userId)
        }
      } catch (cacheError) {
        console.warn('[zustand] createTransaction: error clearing cache', cacheError)
      }
    } catch (err) {
      console.error('[zustand] createTransaction: unexpected error', err)
    }
  },
  deleteTransaction: async ({
    transactionId,
    userId,
  }) => {
    const { transactions } = get()

    const original = transactions.find(t => t.id === transactionId)
    if (!original) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[zustand] deleteTransaction: transaction not found', transactionId)
      }
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] deleteTransaction: initiating deletion for transaction', transactionId)
    }

    // ✅ 1. Mutación optimista - eliminar de la UI inmediatamente
    set({
      transactions: transactions.filter(t => t.id !== transactionId),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] deleteTransaction: removed transaction', transactionId, 'from UI optimistically')
    }

    // ✅ 2. Persistir en Supabase (group_id si es transacción de grupo)
    let deleteQuery = supabase.from('transactions').delete().eq('id', transactionId)
    if (original.group_id) {
      deleteQuery = deleteQuery.eq('group_id', original.group_id)
    } else {
      deleteQuery = deleteQuery.eq('user_id', userId)
    }
    const { error } = await deleteQuery

    // ❌ 3. Revertir si hay error
    if (error) {
      set({
        transactions: [...transactions], // Restaurar el array original completo
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] deleteTransaction: restoring transaction', transactionId, 'after failure')
      }
      console.error('[zustand] deleteTransaction: error deleting transaction', transactionId, ':', error)
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] deleteTransaction: successfully deleted transaction', transactionId)
      }

      // ✅ 4. Sincronización global
      try {
        clearUserCache(userId)
        if (process.env.NODE_ENV === 'development') {
          console.log('[zustand] deleteTransaction: cleared cache for user', userId)
        }
      } catch (cacheError) {
        console.warn('[zustand] deleteTransaction: error clearing cache', cacheError)
      }
    }
  },
  deleteRecurrentSeries: async ({
    sourceId,
    userId,
    groupId,
  }) => {
    const { transactions } = get()

    // Filtrar las transacciones que pertenecen a esta serie recurrente
    const seriesToDelete = transactions.filter(t => 
      t.source_id === sourceId && t.source_type === 'recurrent'
    )

    if (seriesToDelete.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[zustand] deleteRecurrentSeries: no transactions found for series', sourceId)
      }
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] deleteRecurrentSeries: deleting series', sourceId, 'with', seriesToDelete.length, 'transactions')
    }

    // ✅ 1. Mutación optimista - eliminar toda la serie de la UI inmediatamente
    const remainingTransactions = transactions.filter(t => 
      !(t.source_id === sourceId && t.source_type === 'recurrent')
    )
    
    set({
      transactions: remainingTransactions,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] deleteRecurrentSeries: optimistic deletion applied (', seriesToDelete.length, 'items)')
    }

    // ✅ 2. Persistir en Supabase: primero transacciones, luego recurrent_expenses
    const groupIdOr = groupId ?? seriesToDelete[0]?.group_id
    let txDeleteQuery = supabase.from('transactions').delete()
      .eq('source_id', sourceId)
      .eq('source_type', 'recurrent')
    if (groupIdOr) txDeleteQuery = txDeleteQuery.eq('group_id', groupIdOr)
    else txDeleteQuery = txDeleteQuery.eq('user_id', userId)
    const { error: txError } = await txDeleteQuery
    if (txError) {
      set({ transactions: [...transactions] })
      console.error('[zustand] deleteRecurrentSeries: error deleting transactions', sourceId, ':', txError)
      return
    }

    let recurrentDeleteQuery = supabase.from('recurrent_expenses').delete().eq('id', sourceId)
    if (groupIdOr) recurrentDeleteQuery = recurrentDeleteQuery.eq('group_id', groupIdOr)
    else recurrentDeleteQuery = recurrentDeleteQuery.eq('user_id', userId)
    const { error } = await recurrentDeleteQuery

    // ❌ 3. Revertir si hay error (no podemos restaurar transacciones ya borradas)
    if (error) {
      set({
        transactions: [...transactions], // Restaurar el array original completo
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] deleteRecurrentSeries: rollback applied due to error')
      }
      console.error('[zustand] deleteRecurrentSeries: error deleting series', sourceId, ':', error)
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] deleteRecurrentSeries: Supabase delete OK')
      }

      // ✅ 4. Esperar brevemente para que los triggers completen
      await new Promise(resolve => setTimeout(resolve, 600))

      // ✅ 5. Sincronización global
      try {
        clearUserCache(userId)
        if (process.env.NODE_ENV === 'development') {
          console.log('[zustand] deleteRecurrentSeries: global refresh triggered')
        }
      } catch (cacheError) {
        console.warn('[zustand] deleteRecurrentSeries: error clearing cache', cacheError)
      }
    }
  }
}))

if (process.env.NODE_ENV === 'development') {
  console.log('[zustand] Transaction store initialized')
} 