import { supabase, createOptimizedQuery, batchQuery, CACHE_CONFIG, type User, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type TransactionAttachment } from './supabase'

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
export const fetchUserTransactions = async (user: User, month?: number, year?: number) => {
  const cacheKey = getCacheKey(user.id, 'transactions', { month, year })
  const cached = getCachedData(cacheKey, CACHE_CONFIG.TRANSACTIONS_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  let query = createOptimizedQuery('transactions', user.id)
  
  if (month && year) {
    query = query.eq('month', month).eq('year', year)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  
  setCachedData(cacheKey, data)
  return data
}

export const fetchUserExpenses = async (user: User) => {
  const cacheKey = getCacheKey(user.id, 'expenses')
  const cached = getCachedData(cacheKey, CACHE_CONFIG.USER_DATA_CACHE_DURATION)
  
  if (cached) {
    return cached
  }

  const [recurrentResult, nonRecurrentResult] = await Promise.all([
    createOptimizedQuery('recurrent_expenses', user.id).order('created_at', { ascending: false }),
    createOptimizedQuery('non_recurrent_expenses', user.id).order('created_at', { ascending: false })
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
    .select('value, status')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)

  if (error) throw error

  const stats = {
    total: data?.reduce((sum, t) => sum + t.value, 0) || 0,
    paid: data?.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0) || 0,
    pending: data?.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.value, 0) || 0,
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
export const batchUpdateTransactions = async (user: User, updates: Array<{ id: number; status: 'paid' | 'pending' }>) => {
  const promises = updates.map(update =>
    supabase
      .from('transactions')
      .update({ status: update.status })
      .eq('id', update.id)
      .eq('user_id', user.id)
  )

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

// Export cache utilities for manual cache management
export { clearUserCache, getCachedData, setCachedData } 