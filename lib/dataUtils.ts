import { supabase, createOptimizedQuery, batchQuery, CACHE_CONFIG, type User, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type TransactionAttachment } from './supabase'
import { CATEGORIES, TRANSACTION_TYPES, DEFAULT_VALUES, type Category, type TransactionType } from './constants'

// Simple in-memory cache for performance
const cache = new Map<string, { data: any; timestamp: number }>()

// Cache management utilities
const getCacheKey = (userId: number, operation: string, params?: any) => {
  return `${userId}-${operation}-${JSON.stringify(params || {})}`
}

const getCachedData = (key: string, duration: number) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data
  }
  return null
}

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() })
}

const clearUserCache = (userId: number) => {
  const keysToDelete: string[] = []
  Array.from(cache.keys()).forEach(key => {
    if (key.startsWith(`${userId}-`)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => cache.delete(key))
}

// Optimized data fetching functions
export const fetchUserTransactions = async (user: User, month?: number, year?: number, type?: TransactionType, category?: Category) => {
  const cacheKey = getCacheKey(user.id, 'transactions', { month, year, type, category })
  const cached = getCachedData(cacheKey, CACHE_CONFIG.TRANSACTIONS_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  let query = createOptimizedQuery('transactions', user.id)
  
  if (month && year) {
    query = query.eq('month', month).eq('year', year)
  }
  
  if (type) {
    query = query.eq('type', type)
  }
  
  if (category) {
    query = query.eq('category', category)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  
  setCachedData(cacheKey, data)
  return data
}

export const fetchUserExpenses = async (user: User, type?: TransactionType, category?: Category) => {
  const cacheKey = getCacheKey(user.id, 'expenses', { type, category })
  const cached = getCachedData(cacheKey, CACHE_CONFIG.USER_DATA_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  let recurrentQuery = createOptimizedQuery('recurrent_expenses', user.id)
  let nonRecurrentQuery = createOptimizedQuery('non_recurrent_expenses', user.id)
  
  if (type) {
    recurrentQuery = recurrentQuery.eq('type', type)
    nonRecurrentQuery = nonRecurrentQuery.eq('type', type)
  }
  
  if (category) {
    recurrentQuery = recurrentQuery.eq('category', category)
    nonRecurrentQuery = nonRecurrentQuery.eq('category', category)
  }

  const [recurrentResult, nonRecurrentResult] = await Promise.all([
    recurrentQuery.order('created_at', { ascending: false }),
    nonRecurrentQuery.order('created_at', { ascending: false })
  ])

  if (recurrentResult.error) throw recurrentResult.error
  if (nonRecurrentResult.error) throw nonRecurrentResult.error

  const result = {
    recurrent: recurrentResult.data || [],
    nonRecurrent: nonRecurrentResult.data || []
  }

  setCachedData(cacheKey, result)
  return result
}

export const fetchMonthlyStats = async (user: User, month: number, year: number) => {
  const cacheKey = getCacheKey(user.id, 'monthly-stats', { month, year })
  const cached = getCachedData(cacheKey, CACHE_CONFIG.STATS_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('value, status, type, category, isgoal')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)

  if (error) throw error

  const stats = {
    total: data?.reduce((sum, t) => sum + t.value, 0) || 0,
    paid: data?.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0) || 0,
    pending: data?.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.value, 0) || 0,
    expenses: data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0) || 0,
    income: data?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0) || 0,
    goals: data?.filter(t => t.isgoal).reduce((sum, t) => sum + t.value, 0) || 0,
    overdue: data?.filter(t => {
      // Calculate overdue logic here if needed
      return false
    }).reduce((sum, t) => sum + t.value, 0) || 0
  }

  setCachedData(cacheKey, stats)
  return stats
}

export const fetchAttachmentCounts = async (user: User, transactionIds: number[]) => {
  if (transactionIds.length === 0) return {}

  const { data, error } = await supabase
    .from('transaction_attachments')
    .select('transaction_id')
    .in('transaction_id', transactionIds)
    .eq('user_id', user.id)

  if (error) throw error

  const counts: Record<number, number> = {}
  data?.forEach(attachment => {
    counts[attachment.transaction_id] = (counts[attachment.transaction_id] || 0) + 1
  })

  return counts
}

// Optimized batch operations
export const batchUpdateTransactions = async (user: User, updates: Array<{ 
  id: number; 
  status?: 'paid' | 'pending';
  type?: TransactionType;
  category?: Category;
  isgoal?: boolean;
}>) => {
  const promises = updates.map(update => {
    const updateData: any = {}
    if (update.status) updateData.status = update.status
    if (update.type) updateData.type = update.type
    if (update.category) updateData.category = update.category
    if (update.isgoal !== undefined) updateData.isgoal = update.isgoal
    
    return supabase
      .from('transactions')
      .update(updateData)
      .eq('id', update.id)
      .eq('user_id', user.id)
  })

  const results = await Promise.all(promises)
  
  // Clear cache after updates
  clearUserCache(user.id)
  
  return results
}

export const batchDeleteTransactions = async (user: User, transactionIds: number[]) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', transactionIds)
    .eq('user_id', user.id)

  if (error) throw error
  
  // Clear cache after deletion
  clearUserCache(user.id)
}

// Real-time subscription helpers (for future use)
export const subscribeToUserData = (user: User, callback: (payload: any) => void) => {
  return supabase
    .channel(`user-${user.id}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, 
      callback
    )
    .subscribe()
}

// Performance monitoring
export const measureQueryPerformance = async <T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = performance.now()
  
  try {
    const result = await queryFn()
    const duration = performance.now() - start
    
    // Log slow queries (over 1 second)
    if (duration > 1000) {
      console.warn(`Slow query detected: ${operation} took ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    console.error(`Query failed: ${operation} after ${duration.toFixed(2)}ms`, error)
    throw error
  }
}

// New transaction creation with enhanced fields
export const createTransaction = async (
  user: User,
  transactionData: {
    year: number
    month: number
    description: string
    source_id: number
    source_type: 'recurrent' | 'non_recurrent'
    value: number
    status?: 'paid' | 'pending'
    deadline?: string | null
    type?: TransactionType
    category?: Category
    isgoal?: boolean
  }
) => {
  const newTransaction = {
    user_id: user.id,
    year: transactionData.year,
    month: transactionData.month,
    description: transactionData.description,
    source_id: transactionData.source_id,
    source_type: transactionData.source_type,
    value: transactionData.value,
    status: transactionData.status || DEFAULT_VALUES.STATUS,
    deadline: transactionData.deadline || null,
    type: transactionData.type || DEFAULT_VALUES.TYPE,
    category: transactionData.category || DEFAULT_VALUES.CATEGORY,
    isgoal: transactionData.isgoal || DEFAULT_VALUES.ISGOAL
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(newTransaction)
    .select()
    .single()

  if (error) throw error
  
  // Clear cache after creation
  clearUserCache(user.id)
  
  return data
}

// Create recurrent expense with enhanced fields
export const createRecurrentExpense = async (
  user: User,
  expenseData: {
    description: string
    month_from: number
    month_to: number
    year_from: number
    year_to: number
    value: number
    payment_day_deadline?: number | null
    type?: TransactionType
    category?: Category
    isgoal?: boolean
  }
) => {
  const newExpense = {
    user_id: user.id,
    description: expenseData.description,
    month_from: expenseData.month_from,
    month_to: expenseData.month_to,
    year_from: expenseData.year_from,
    year_to: expenseData.year_to,
    value: expenseData.value,
    payment_day_deadline: expenseData.payment_day_deadline || null,
    type: expenseData.type || DEFAULT_VALUES.TYPE,
    category: expenseData.category || DEFAULT_VALUES.CATEGORY,
    isgoal: expenseData.isgoal || DEFAULT_VALUES.ISGOAL
  }

  const { data, error } = await supabase
    .from('recurrent_expenses')
    .insert(newExpense)
    .select()
    .single()

  if (error) throw error
  
  // Clear cache after creation
  clearUserCache(user.id)
  
  return data
}

// Create non-recurrent expense with enhanced fields
export const createNonRecurrentExpense = async (
  user: User,
  expenseData: {
    description: string
    year: number
    month: number
    value: number
    payment_deadline?: string | null
    type?: TransactionType
    category?: Category
    isgoal?: boolean
  }
) => {
  const newExpense = {
    user_id: user.id,
    description: expenseData.description,
    year: expenseData.year,
    month: expenseData.month,
    value: expenseData.value,
    payment_deadline: expenseData.payment_deadline || null,
    type: expenseData.type || DEFAULT_VALUES.TYPE,
    category: expenseData.category || DEFAULT_VALUES.CATEGORY,
    isgoal: expenseData.isgoal || DEFAULT_VALUES.ISGOAL
  }

  const { data, error } = await supabase
    .from('non_recurrent_expenses')
    .insert(newExpense)
    .select()
    .single()

  if (error) throw error
  
  // Clear cache after creation
  clearUserCache(user.id)
  
  return data
}

// Update transaction with enhanced fields
export const updateTransaction = async (
  user: User,
  transactionId: number,
  updateData: {
    description?: string
    value?: number
    status?: 'paid' | 'pending'
    deadline?: string | null
    type?: TransactionType
    category?: Category
    isgoal?: boolean
  }
) => {
  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  
  // Clear cache after update
  clearUserCache(user.id)
  
  return data
}

// Get transactions by category
export const fetchTransactionsByCategory = async (user: User, category: Category, month?: number, year?: number) => {
  const cacheKey = getCacheKey(user.id, 'transactions-by-category', { category, month, year })
  const cached = getCachedData(cacheKey, CACHE_CONFIG.TRANSACTIONS_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('category', category)
  
  if (month && year) {
    query = query.eq('month', month).eq('year', year)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  
  setCachedData(cacheKey, data)
  return data
}

// Get transactions by type (expense/income)
export const fetchTransactionsByType = async (user: User, type: TransactionType, month?: number, year?: number) => {
  const cacheKey = getCacheKey(user.id, 'transactions-by-type', { type, month, year })
  const cached = getCachedData(cacheKey, CACHE_CONFIG.TRANSACTIONS_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', type)
  
  if (month && year) {
    query = query.eq('month', month).eq('year', year)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  
  setCachedData(cacheKey, data)
  return data
}

// Get goal transactions
export const fetchGoalTransactions = async (user: User, month?: number, year?: number) => {
  const cacheKey = getCacheKey(user.id, 'goal-transactions', { month, year })
  const cached = getCachedData(cacheKey, CACHE_CONFIG.TRANSACTIONS_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('isgoal', true)
  
  if (month && year) {
    query = query.eq('month', month).eq('year', year)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  
  setCachedData(cacheKey, data)
  return data
}

// Export cache utilities for manual cache management
export { clearUserCache, getCachedData, setCachedData } 