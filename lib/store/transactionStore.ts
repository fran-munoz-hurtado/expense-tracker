import { create } from 'zustand'
import { fetchUserTransactions } from '@/lib/dataUtils'
import type { Transaction, User } from '@/lib/supabase'

type TransactionStore = {
  transactions: Transaction[]
  isLoading: boolean
  setTransactions: (txs: Transaction[]) => void
  setLoading: (loading: boolean) => void
  fetchTransactions: ({ userId, year, month }: { userId: number; year: number; month: number }) => Promise<void>
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoading: false,
  setTransactions: (txs) => {
    console.log('[zustand] setTransactions called with', txs.length, 'items')
    set({ transactions: txs })
  },
  setLoading: (loading) => {
    set({ isLoading: loading })
  },
  fetchTransactions: async ({ userId, year, month }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[zustand] fetchTransactions: loading transactions for user', userId, 'month', month, 'year', year)
    }
    
    const { setTransactions, setLoading } = get()
    
    try {
      setLoading(true)
      // Create a mock user object for fetchUserTransactions
      const user = { id: userId } as User
      const transactions = await fetchUserTransactions(user, month, year)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] fetchTransactions: loaded', transactions.length, 'transactions')
      }
      
      setTransactions(transactions)
    } catch (error) {
      console.error('[zustand] fetchTransactions: error', error)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  },
}))

if (process.env.NODE_ENV === 'development') {
  console.log('[zustand] Transaction store initialized')
} 