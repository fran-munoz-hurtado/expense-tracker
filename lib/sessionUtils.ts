import { supabase } from '@/lib/supabase'

/**
 * Ensures the Supabase session has a valid token before a mutation.
 * Call this before any write operation (update, insert, delete) when the user
 * may have switched tabs — SELECTs can work with a stale token in some cases,
 * but writes often fail or hang without a fresh token.
 */
export async function ensureSessionFresh(): Promise<void> {
  const { error } = await supabase.auth.refreshSession()
  if (error && process.env.NODE_ENV === 'development') {
    console.warn('[session] ensureSessionFresh:', error.message)
  }
}
