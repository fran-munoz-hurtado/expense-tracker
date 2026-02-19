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

// Convenience events for the app
export const analytics = {
  login: (method: 'email' | 'google') => trackEvent('login', { method }),
  signUp: (method: 'email' | 'google') => trackEvent('sign_up', { method }),
  createTransaction: () => trackEvent('create_transaction'),
  createSpace: () => trackEvent('create_space'),
  inviteMember: () => trackEvent('invite_member'),
}
