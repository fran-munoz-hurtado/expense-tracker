import { createClient } from '@supabase/supabase-js'

// Environment validation for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Enhanced Supabase client with security and performance optimizations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Database configuration
  db: {
    schema: 'public'
  },
  // Global headers for security and monitoring
  global: {
    headers: {
      'X-Client-Info': 'expense-tracker-web',
      'X-Client-Version': '1.0.0'
    }
  },
  // Real-time configuration with rate limiting
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  // Auth configuration with security best practices
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Performance-optimized query helpers with error handling
export const createOptimizedQuery = (table: string, userId: number) => {
  if (!userId || userId <= 0) {
    throw new Error('Invalid user ID provided to createOptimizedQuery')
  }
  
  return supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
}

// Batch query helper for multiple operations with error handling
export const batchQuery = async (queries: Promise<any>[]) => {
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error('Invalid queries array provided to batchQuery')
  }
  
  return Promise.all(queries)
}

// Cache configuration for better performance
export const CACHE_CONFIG = {
  // Cache duration in milliseconds
  TRANSACTIONS_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  USER_DATA_CACHE_DURATION: 10 * 60 * 1000,   // 10 minutes
  STATS_CACHE_DURATION: 2 * 60 * 1000,        // 2 minutes
  ATTACHMENTS_CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
} as const

// User type
export type User = {
  id: number
  first_name: string
  last_name: string
  username: string
  email: string
  password_hash: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export type UserInput = Omit<User, 'id' | 'created_at' | 'updated_at'>

// Recurrent Expenses (creates multiple transactions)
export type RecurrentExpense = {
  id: number
  user_id: number
  description: string
  month_from: number
  month_to: number
  year_from: number
  year_to: number
  value: number
  payment_day_deadline: number | null
  type: 'expense' | 'income'
  category: string
  isgoal: boolean
  created_at: string
  updated_at: string
}

export type RecurrentExpenseInput = Omit<RecurrentExpense, 'id' | 'created_at' | 'updated_at'>

// Non-Recurrent Expenses (creates single transaction)
export type NonRecurrentExpense = {
  id: number
  user_id: number
  description: string
  year: number
  month: number
  value: number
  payment_deadline: string | null
  type: 'expense' | 'income'
  category: string
  isgoal: boolean
  created_at: string
  updated_at: string
}

export type NonRecurrentExpenseInput = Omit<NonRecurrentExpense, 'id' | 'created_at' | 'updated_at'>

// Transactions (individual expense records)
export type Transaction = {
  id: number
  user_id: number
  year: number
  month: number
  description: string
  source_id: number
  source_type: 'recurrent' | 'non_recurrent'
  value: number
  status: 'paid' | 'pending'
  deadline: string | null
  type: 'expense' | 'income'
  category: string
  created_at: string
  updated_at: string
}

export type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>

// Transaction Attachments (files uploaded for transactions)
export type TransactionAttachment = {
  id: number
  transaction_id: number
  user_id: number
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  mime_type: string
  description: string | null
  uploaded_at: string
  created_at: string
  updated_at: string
}

export type TransactionAttachmentInput = Omit<TransactionAttachment, 'id' | 'uploaded_at' | 'created_at' | 'updated_at'>

// File upload response type
export type FileUploadResponse = {
  success: boolean
  file_path?: string
  error?: string
  attachment?: TransactionAttachment
}

// Legacy types for backward compatibility (will be removed later)
export type Expense = Transaction
export type ExpenseInput = TransactionInput 