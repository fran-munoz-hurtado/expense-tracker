import { supabase, createOptimizedQuery, createGroupQuery, batchQuery, type User, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type TransactionAttachment } from './supabase'
import { CATEGORIES, TRANSACTION_TYPES, DEFAULT_VALUES, type Category, type TransactionType } from './config/constants'
import { AppError, asyncHandler, ErrorHandler } from './errors/AppError'
import { TransactionValidator, ExpenseValidator, ValidationHelper } from './validation/validators'
import { globalCaches } from './cache/CacheManager'
import { APP_CONFIG } from './config/constants'

// Enhanced data fetching functions with comprehensive error handling and validation
export const fetchUserTransactions = asyncHandler(async (
  user: User,
  month?: number,
  year?: number,
  type?: TransactionType,
  category?: Category,
  groupId?: string | null
): Promise<Transaction[]> => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to fetchUserTransactions')
  }
  if (!groupId) {
    return [] // Group required for group-based view
  }

  // Validate month and year if provided
  if (month !== undefined && (month < 1 || month > 12)) {
    throw AppError.validation('Invalid month provided to fetchUserTransactions')
  }
  if (year !== undefined && (year < 1900 || year > 2100)) {
    throw AppError.validation('Invalid year provided to fetchUserTransactions')
  }

  const cacheKey = `transactions-${groupId}-${month || 'all'}-${year || 'all'}-${type || 'all'}-${category || 'all'}`
  const cached = globalCaches.transactions.get<Transaction[]>(cacheKey)
  if (cached) return cached

  let query = createGroupQuery('transactions', groupId)

  if (month && year) {
    query = query.eq('month', month).eq('year', year)
  } else if (year) {
    query = query.eq('year', year)
  } else if (month) {
    query = query.eq('month', month)
  }
  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) {
    throw AppError.database(`Failed to fetch transactions: ${error.message}`, error)
  }
  const result = data || []
  globalCaches.transactions.set(cacheKey, result)
  return result
})

export const fetchUserExpenses = asyncHandler(async (
  user: User,
  groupId: string | null,
  type?: TransactionType,
  category?: Category
): Promise<{ recurrent: RecurrentExpense[]; nonRecurrent: NonRecurrentExpense[] }> => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to fetchUserExpenses')
  }
  if (!groupId) {
    return { recurrent: [], nonRecurrent: [] }
  }

  const cacheKey = `expenses-${groupId}-${type || 'all'}-${category || 'all'}`
  const cached = globalCaches.userData.get<{ recurrent: RecurrentExpense[]; nonRecurrent: NonRecurrentExpense[] }>(cacheKey)
  if (cached) return cached

  let recurrentQuery = createGroupQuery('recurrent_expenses', groupId)
  let nonRecurrentQuery = createGroupQuery('non_recurrent_expenses', groupId)
  if (type) {
    recurrentQuery = recurrentQuery.eq('type', type)
    nonRecurrentQuery = nonRecurrentQuery.eq('type', type)
  }
  if (category) {
    recurrentQuery = recurrentQuery.eq('category', category)
    nonRecurrentQuery = nonRecurrentQuery.eq('category', category)
  }

  const [recurrent, nonRecurrent] = await Promise.all([
    recurrentQuery.select('*'),
    nonRecurrentQuery.select('*')
  ])
  const result = {
    recurrent: recurrent.data || [],
    nonRecurrent: nonRecurrent.data || []
  }
  globalCaches.userData.set(cacheKey, result)
  return result
})

export const fetchMonthlyStats = asyncHandler(async (user: User, month: number, year: number, groupId: string | null) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to fetchMonthlyStats')
  }
  if (month < 1 || month > 12) {
    throw AppError.validation('Invalid month provided to fetchMonthlyStats')
  }
  if (year < 1900 || year > 2100) {
    throw AppError.validation('Invalid year provided to fetchMonthlyStats')
  }
  if (!groupId) {
    return { total: 0, paid: 0, pending: 0, expenses: 0, income: 0, goals: 0, overdue: 0 }
  }

  const cacheKey = `monthly-stats-${groupId}-${month}-${year}`
  const cached = globalCaches.stats.get(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('transactions')
    .select('value, status, type, category')
    .eq('group_id', groupId)
    .eq('month', month)
    .eq('year', year)

  if (error) {
    throw AppError.database(`Failed to fetch monthly stats: ${error.message}`, error)
  }

  const { data: goalData, error: goalError } = await supabase
    .from('recurrent_expenses')
    .select('id, value')
    .eq('group_id', groupId)
    .eq('isgoal', true)

  if (goalError) {
    console.warn('Failed to fetch goal data for stats:', goalError.message)
  }

  const goalTransactions = goalData
    ? (await supabase
        .from('transactions')
        .select('value')
        .eq('month', month)
        .eq('year', year)
        .in('source_id', goalData.map(g => g.id))
        .eq('source_type', 'recurrent')
        .eq('group_id', groupId))
        .data || []
    : []

  const stats = {
    total: data?.reduce((sum, t) => sum + Number(t.value), 0) || 0,
    paid: data?.filter(t => t.status === 'paid').reduce((sum, t) => sum + Number(t.value), 0) || 0,
    pending: data?.filter(t => t.status === 'pending').reduce((sum, t) => sum + Number(t.value), 0) || 0,
    expenses: data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.value), 0) || 0,
    income: data?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.value), 0) || 0,
    goals: goalTransactions.reduce((sum, t) => sum + Number(t.value), 0) || 0,
    overdue: 0
  }
  globalCaches.stats.set(cacheKey, stats)
  return stats
})

export const fetchAttachmentCounts = asyncHandler(async (user: User, transactionIds: number[]) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to fetchAttachmentCounts')
  }

  if (transactionIds.length === 0) return {}

  const { data, error } = await supabase
    .from('transaction_attachments')
    .select('transaction_id')
    .in('transaction_id', transactionIds)
    .eq('user_id', user.id)

  if (error) {
    throw AppError.database(`Failed to fetch attachment counts: ${error.message}`, error)
  }

  const counts: Record<number, number> = {}
  data?.forEach(attachment => {
    counts[attachment.transaction_id] = (counts[attachment.transaction_id] || 0) + 1
  })

  return counts
})

// Enhanced batch operations with validation and error handling
export const batchUpdateTransactions = asyncHandler(async (user: User, updates: Array<{ 
  id: number; 
  status?: 'paid' | 'pending';
  type?: TransactionType;
  category?: Category;
}>) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to batchUpdateTransactions')
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    throw AppError.validation('Invalid updates array provided to batchUpdateTransactions')
  }

  // Validate each update
  for (const update of updates) {
    if (!update.id || update.id <= 0) {
      throw AppError.validation('Invalid transaction ID in batch update')
    }
  }

  const { data, error } = await supabase
    .from('transactions')
    .upsert(updates.map(update => ({
      ...update,
      user_id: user.id,
      updated_at: new Date().toISOString()
    })))
    .select()

  if (error) {
    throw AppError.database(`Failed to batch update transactions: ${error.message}`, error)
  }

  // Clear related caches
  globalCaches.transactions.clear()
  globalCaches.stats.clear()

  return data || []
})

export const batchDeleteTransactions = asyncHandler(async (user: User, transactionIds: number[]) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to batchDeleteTransactions')
  }

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw AppError.validation('Invalid transaction IDs array provided to batchDeleteTransactions')
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', transactionIds)
    .eq('user_id', user.id)

  if (error) {
    throw AppError.database(`Failed to batch delete transactions: ${error.message}`, error)
  }

  // Clear related caches
  globalCaches.transactions.clear()
  globalCaches.stats.clear()

  return { deletedCount: transactionIds.length }
})

// Real-time subscription with error handling
export const subscribeToUserData = (user: User, callback: (payload: any) => void) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to subscribeToUserData')
  }

  if (typeof callback !== 'function') {
    throw AppError.validation('Invalid callback provided to subscribeToUserData')
  }

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

// Performance measurement utility
export const measureQueryPerformance = async <T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now()
  
  try {
    const result = await queryFn()
    const duration = performance.now() - startTime
    
    if (APP_CONFIG.MONITORING.ENABLE_PERFORMANCE_TRACKING) {
      console.info(`Query performance - ${operation}: ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`Query failed - ${operation}: ${duration.toFixed(2)}ms`, error)
    throw error
  }
}

// Enhanced transaction creation with validation
export const createTransaction = asyncHandler(async (
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
  }
) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to createTransaction')
  }

  // Validate transaction data
  const validationResult = TransactionValidator.validateCreation({
    ...transactionData,
    user_id: user.id
  })
  
  if (!validationResult.isValid) {
    throw AppError.validation('Invalid transaction data', { fields: validationResult.errors })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...transactionData,
      user_id: user.id,
      status: transactionData.status || DEFAULT_VALUES.TRANSACTION.STATUS,
      type: transactionData.type || DEFAULT_VALUES.TRANSACTION.TYPE,
      category: transactionData.category || DEFAULT_VALUES.TRANSACTION.CATEGORY,
    })
    .select()
    .single()

  if (error) {
    throw AppError.database(`Failed to create transaction: ${error.message}`, error)
  }

  // Clear related caches
  globalCaches.transactions.clear()
  globalCaches.stats.clear()

  return data
})

// Enhanced recurrent expense creation with validation
export const createRecurrentExpense = asyncHandler(async (
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
  },
  groupId?: string | null
) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to createRecurrentExpense')
  }
  if (!groupId) {
    throw AppError.validation('Grupo requerido para crear gasto recurrente')
  }

  const validationResult = ExpenseValidator.validateRecurrentCreation({
    ...expenseData,
    user_id: user.id
  })
  if (!validationResult.isValid) {
    throw AppError.validation('Invalid recurrent expense data', { fields: validationResult.errors })
  }

  const { data, error } = await supabase
    .from('recurrent_expenses')
    .insert({
      ...expenseData,
      user_id: user.id,
      group_id: groupId,
      type: expenseData.type || DEFAULT_VALUES.EXPENSE.TYPE,
      category: expenseData.category || DEFAULT_VALUES.EXPENSE.CATEGORY,
      isgoal: expenseData.isgoal || DEFAULT_VALUES.EXPENSE.ISGOAL,
    })
    .select()
    .single()

  if (error) {
    throw AppError.database(`Failed to create recurrent expense: ${error.message}`, error)
  }

  // Clear related caches
  globalCaches.userData.clear()

  return data
})

// Enhanced non-recurrent expense creation with validation
export const createNonRecurrentExpense = asyncHandler(async (
  user: User,
  expenseData: {
    description: string
    year: number
    month: number
    value: number
    payment_deadline?: string | null
    type?: TransactionType
    category?: Category
  },
  groupId?: string | null
) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to createNonRecurrentExpense')
  }
  if (!groupId) {
    throw AppError.validation('Grupo requerido para crear gasto')
  }

  const validationResult = ExpenseValidator.validateNonRecurrentCreation({
    ...expenseData,
    user_id: user.id
  })
  
  if (!validationResult.isValid) {
    throw AppError.validation('Invalid non-recurrent expense data', { fields: validationResult.errors })
  }

  const { data, error } = await supabase
    .from('non_recurrent_expenses')
    .insert({
      ...expenseData,
      user_id: user.id,
      group_id: groupId,
      type: expenseData.type || DEFAULT_VALUES.EXPENSE.TYPE,
      category: expenseData.category || DEFAULT_VALUES.EXPENSE.CATEGORY,
    })
    .select()
    .single()

  if (error) {
    throw AppError.database(`Failed to create non-recurrent expense: ${error.message}`, error)
  }

  // Clear related caches
  globalCaches.userData.clear()

  return data
})

// Enhanced transaction update with validation
export const updateTransaction = asyncHandler(async (
  user: User,
  transactionId: number,
  updateData: {
    description?: string
    value?: number
    status?: 'paid' | 'pending'
    deadline?: string | null
    notes?: string | null
    type?: TransactionType
    category?: Category
  }
) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to updateTransaction')
  }

  if (!transactionId || transactionId <= 0) {
    throw AppError.validation('Invalid transaction ID provided to updateTransaction')
  }

  // Validate update data
  const validationResult = TransactionValidator.validateUpdate(updateData)
  
  if (!validationResult.isValid) {
    throw AppError.validation('Invalid transaction update data', { fields: validationResult.errors })
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    throw AppError.database(`Failed to update transaction: ${error.message}`, error)
  }

  if (!data) {
    throw AppError.notFound('Transaction not found')
  }

  // Clear related caches
  globalCaches.transactions.clear()
  globalCaches.stats.clear()

  return data
})

// Enhanced category-based queries
export const fetchTransactionsByCategory = asyncHandler(async (user: User, groupId: string | null, category: Category, month?: number, year?: number) => {
  if (!user || !user.id) throw AppError.validation('Invalid user provided to fetchTransactionsByCategory')
  if (!groupId) return []
  const cacheKey = `transactions-category-${groupId}-${category}-${month || 'all'}-${year || 'all'}`
  const cached = globalCaches.transactions.get<Transaction[]>(cacheKey)
  if (cached) return cached
  let query = createGroupQuery('transactions', groupId).eq('category', category)
  if (month && year) query = query.eq('month', month).eq('year', year)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw AppError.database(`Failed to fetch transactions by category: ${error.message}`, error)
  const result = data || []
  globalCaches.transactions.set(cacheKey, result)
  return result
})

export const fetchTransactionsByType = asyncHandler(async (user: User, groupId: string | null, type: TransactionType, month?: number, year?: number) => {
  if (!user || !user.id) throw AppError.validation('Invalid user provided to fetchTransactionsByType')
  if (!groupId) return []
  const cacheKey = `transactions-type-${groupId}-${type}-${month || 'all'}-${year || 'all'}`
  const cached = globalCaches.transactions.get<Transaction[]>(cacheKey)
  if (cached) return cached
  let query = createGroupQuery('transactions', groupId).eq('type', type)
  if (month && year) query = query.eq('month', month).eq('year', year)
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) {
    throw AppError.database(`Failed to fetch transactions by type: ${error.message}`, error)
  }

  const result = data || []
  globalCaches.transactions.set(cacheKey, result)
  return result
})

// Note: fetchGoalTransactions function needs to be updated to work with recurrent_expenses table
// since isgoal only exists in that table, not in transactions
export const fetchGoalTransactions = asyncHandler(async (user: User, month?: number, year?: number) => {
  if (!user || !user.id) {
    throw AppError.validation('Invalid user provided to fetchGoalTransactions')
  }

  const cacheKey = `transactions-goals-${user.id}-${month || 'all'}-${year || 'all'}`
  const cached = globalCaches.transactions.get<Transaction[]>(cacheKey)
  
  if (cached) {
    return cached
  }

  // Since isgoal is in recurrent_expenses table, we need to join with transactions
  // to get the actual transaction records for goal expenses
  let query = supabase
    .from('recurrent_expenses')
    .select(`
      id,
      description,
      type,
      category,
      isgoal,
      transactions!inner(
        id,
        user_id,
        year,
        month,
        description,
        source_id,
        source_type,
        value,
        status,
        deadline,
        type,
        category,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('isgoal', true)
  
  if (month && year) {
    query = query.eq('transactions.month', month).eq('transactions.year', year)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) {
    throw AppError.database(`Failed to fetch goal transactions: ${error.message}`, error)
  }

  // Extract transactions from the joined result
  const transactions = data?.flatMap(item => item.transactions || []) || []
  globalCaches.transactions.set(cacheKey, transactions)
  return transactions
})

// Cache management utilities
export const clearUserCache = (userId: string): void => {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.warn('[clearUserCache] Invalid userId provided:', userId)
    return
  }
  
  // Clear all caches for the user
  globalCaches.transactions.clear()
  globalCaches.userData.clear()
  globalCaches.stats.clear()
  globalCaches.attachments.clear()
  
  console.log(`🗑️ [clearUserCache] Cleared all caches for user: ${userId}`)
}

export const getCacheStats = () => {
  return {
    transactions: globalCaches.transactions.getStats(),
    userData: globalCaches.userData.getStats(),
    stats: globalCaches.stats.getStats(),
    attachments: globalCaches.attachments.getStats(),
  }
} 