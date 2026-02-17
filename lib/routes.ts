/**
 * Centralized routing utilities for SEO-friendly, scalable URLs.
 *
 * Route structure:
 * - /                    → Login or redirect to mis-cuentas
 * - /mis-cuentas         → Redirect to current month
 * - /mis-cuentas/[year]/[month]  → Dashboard with specific month
 * - /mis-cuentas/[year]/[month]?tipo=recurrente|unico|todos  → With type filter
 *
 * Future sections: /mis-metas, /configuracion, etc.
 */

export const ROUTES = {
  home: '/',
  login: '/',
  misCuentas: '/mis-cuentas',
  misCuentasMonth: (year: number, month: number) => `/mis-cuentas/${year}/${month}`,
} as const

export type FilterType = 'all' | 'recurrent' | 'non_recurrent'

/** URL param for filter type - SEO friendly Spanish values */
export const FILTER_PARAMS = {
  all: 'todos',
  recurrent: 'recurrente',
  non_recurrent: 'unico',
} as const

export const FILTER_PARAMS_REVERSE: Record<string, FilterType> = {
  todos: 'all',
  recurrente: 'recurrent',
  unico: 'non_recurrent',
}

/**
 * Build full dashboard URL with optional query params.
 */
export function buildMisCuentasUrl(
  year: number,
  month: number,
  options?: { tipo?: FilterType }
): string {
  const path = ROUTES.misCuentasMonth(year, month)
  if (!options?.tipo || options.tipo === 'all') {
    return path
  }
  const param = FILTER_PARAMS[options.tipo]
  return `${path}?tipo=${param}`
}

/**
 * Parse year and month from pathname segments.
 * Returns null if invalid.
 */
export function parseMisCuentasPath(pathname: string): {
  year: number
  month: number
} | null {
  const match = pathname.match(/^\/mis-cuentas\/(\d{4})\/(\d{1,2})\/?$/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  if (month < 1 || month > 12 || year < 2020 || year > 2100) return null
  return { year, month }
}
