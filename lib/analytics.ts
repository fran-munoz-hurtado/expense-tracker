/**
 * Google Analytics 4 (GA4) helpers.
 * Use NEXT_PUBLIC_GA_MEASUREMENT_ID (e.g. G-XXXXXXXXXX) to enable tracking.
 */

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event',
      targetId: string,
      params?: Record<string, unknown>
    ) => void
    dataLayer?: unknown[]
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

export const isGAEnabled = () => !!GA_MEASUREMENT_ID

export function pageview(path: string, title?: string) {
  if (!isGAEnabled() || typeof window === 'undefined' || !window.gtag) return
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
  })
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (!isGAEnabled() || typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', eventName, params)
}

/** Establece user_id en gtag para asociar eventos al usuario (filtrar en GA) */
export function setUserId(userId: string | null) {
  if (!isGAEnabled() || typeof window === 'undefined' || !window.gtag) return
  window.gtag('config', GA_MEASUREMENT_ID, { user_id: userId || undefined })
}

/** Tipos de movimiento que se pueden añadir */
export type MovementTypeForAnalytics =
  | 'RECURRENT_EXPENSE'
  | 'SINGLE_EXPENSE'
  | 'RECURRENT_INCOME'
  | 'SINGLE_INCOME'
  | 'GOAL'
  | 'SAVINGS'

// Helper: siempre incluye user_id en params cuando está disponible
function withUserId<T extends Record<string, string | number | boolean>>(
  userId: string,
  params: T
): T & { user_id: string } {
  return { ...params, user_id: userId }
}

// Convenience events for the app - todos incluyen user_id cuando está disponible para filtrar en GA
export const analytics = {
  /** userId opcional: en login/signup puede no estar disponible aún (ej. redirect Google) */
  login: (method: 'email' | 'google', userId?: string) =>
    trackEvent('login', userId ? withUserId(userId, { method }) : { method }),
  signUp: (method: 'email' | 'google', userId?: string) =>
    trackEvent('sign_up', userId ? withUserId(userId, { method }) : { method }),
  /** Cuando se añade cualquier movimiento (incluye tipo) */
  addMovement: (movementType: MovementTypeForAnalytics, userId: string) =>
    trackEvent('add_movement', withUserId(userId, { movement_type: movementType })),
  createSpace: (userId: string) => trackEvent('create_space', withUserId(userId, {})),
  inviteMember: (userId: string) => trackEvent('invite_member', withUserId(userId, {})),
  /** Cuando se elimina una transacción/movimiento */
  deleteMovement: (userId: string) => trackEvent('delete_movement', withUserId(userId, {})),
  /** Cuando se marca un movimiento como pagado */
  markAsPaid: (userId: string) => trackEvent('mark_paid', withUserId(userId, {})),
}
