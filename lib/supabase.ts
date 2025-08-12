import { createClient } from '@supabase/supabase-js'

// Environment validation for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
export const createOptimizedQuery = (table: string, userId: string) => {
  if (!userId || userId.trim() === '') {
    throw new Error('Invalid user ID provided to createOptimizedQuery')
  }
  
  return supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
}

// Batch query helper for multiple operations with error handling
export const batchQuery = async (queries: Promise<any>[]) => {
  try {
    const results = await Promise.all(queries)
    return {
      success: true,
      data: results,
      error: null
    }
  } catch (error) {
    console.error('Batch query error:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown batch query error'
    }
  }
}

// Cache configuration for better performance
export const CACHE_CONFIG = {
  // Cache duration in milliseconds
  TRANSACTIONS_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  USER_DATA_CACHE_DURATION: 10 * 60 * 1000,   // 10 minutes
  STATS_CACHE_DURATION: 2 * 60 * 1000,        // 2 minutes
  ATTACHMENTS_CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
} as const

// Updated TypeScript types for UUID user_id
export type User = {
  id: string // UUID from auth.users
  first_name: string
  last_name: string
  username: string
  email: string
  status: 'active' | 'inactive' | 'banned'
  role: 'user' | 'admin'
  subscription_tier: 'free' | 'trial' | 'pro' | 'enterprise'
  is_on_trial: boolean
  trial_started_at?: string
  trial_expires_at?: string
  created_at: string
  updated_at: string
}

export type UserInput = Omit<User, 'id' | 'created_at' | 'updated_at'>

export type Transaction = {
  id: number
  user_id: string // UUID
  year: number
  month: number
  description: string
  source_id: number
  source_type: 'recurrent' | 'non_recurrent'
  value: number
  status: 'paid' | 'pending'
  deadline?: string | null // Allow null from database
  type: 'expense' | 'income'
  category: string
  created_at: string
  updated_at: string
}

export type RecurrentExpense = {
  id: number
  user_id: string // UUID
  description: string
  month_from: number
  month_to: number
  year_from: number
  year_to: number
  value: number
  payment_day_deadline?: number
  type: 'expense' | 'income'
  category: string
  created_at: string
  updated_at: string
}

export type NonRecurrentExpense = {
  id: number
  user_id: string // UUID
  description: string
  year: number
  month: number
  value: number
  payment_deadline?: string
  type: 'expense' | 'income'
  category: string
  created_at: string
  updated_at: string
}

export type UserCategory = {
  id: number
  user_id: string // UUID
  category_name: string
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export type TransactionAttachment = {
  id: number
  transaction_id: number
  user_id: string // UUID
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  mime_type: string
  description?: string
  uploaded_at: string
  created_at: string
  updated_at: string
}

// File upload response type
export type FileUploadResponse = {
  success: boolean
  file_path?: string
  error?: string
  attachment?: TransactionAttachment
} 