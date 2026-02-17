'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Refreshes the Supabase auth session whenever the tab becomes visible again.
 *
 * Browsers throttle JS in background tabs, so the token refresh timer may not fire.
 * When the user switches back (even for milliseconds), the session can be stale.
 * This hook ensures the token is always fresh before any Supabase call.
 *
 * Use once at app root (e.g. layout) — applies to all Supabase operations app-wide.
 */
export function useRefreshSessionOnVisible(): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void supabase.auth
          .refreshSession()
          .then(({ error }) => {
            if (error && process.env.NODE_ENV === 'development') {
              console.warn('[session] refreshSession on visible:', error.message)
            }
          })
          .catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[session] Error refreshing session on tab focus:', err)
            }
          })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
