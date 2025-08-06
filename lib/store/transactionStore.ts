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

type TransactionStore = {
  transactions: Transaction[]
  isLoading: boolean
  lastFetchedScopes: Record<string, number>
  setTransactions: (txs: Transaction[]) => void
  setLoading: (loading: boolean) => void
  fetchTransactions: (params: {
    userId: number
    year: number
    month: number
    syncVersion?: number
    force?: boolean
  }) => Promise<void>
  markTransactionStatus: (params: {
    transactionId: number
    newStatus: 'paid' | 'pending'
    userId: number
  }) => Promise<void>
  createTransaction: (params: {
    userId: number
    movementType: MovementType
    payload: any
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
  fetchTransactions: async ({ userId, year, month, syncVersion, force }) => {
    const scopeKey = `${userId}:${year}:${month}`
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
      console.log('[zustand] fetchTransactions: loading transactions for user', userId, 'month', month, 'year', year, syncVersion ? `(version ${syncVersion})` : '(no version)')
    }
    
    const { setLoading } = get()
    
    try {
      setLoading(true)
      // Create a mock user object for fetchUserTransactions
      const user = { id: userId } as User
      const transactions = await fetchUserTransactions(user, month, year)
      
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

    // ✅ 2. Persistir en Supabase
    const { error } = await supabase
      .from('transactions')
      .update({ status: newStatus })
      .eq('id', transactionId)
      .eq('user_id', userId)

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
  }
}))

if (process.env.NODE_ENV === 'development') {
  console.log('[zustand] Transaction store initialized')
} 