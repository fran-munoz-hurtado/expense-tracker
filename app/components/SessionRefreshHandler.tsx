'use client'

import { useRefreshSessionOnVisible } from '@/lib/hooks/useRefreshSessionOnVisible'

/**
 * Keeps Supabase session valid when user switches tabs.
 * Mount once in root layout — no UI, runs in background.
 */
export default function SessionRefreshHandler() {
  useRefreshSessionOnVisible()
  return null
}
