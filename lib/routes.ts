/**
 * Centralized routing utilities for SEO-friendly, scalable URLs.
 *
 * Route structure:
 * - /                    → Login or redirect to mis-cuentas
 * - /mis-cuentas         → Redirect to current month
 * - /mis-cuentas/[groupId]/[year]/[month]  → Dashboard (canonical, SEO)
 * - /mis-cuentas/[year]/[month]  → Legacy, redirects to group URL when possible
 * - ?tipo=recurrente|unico|todos  → Filter param
 *
 * Future sections: /mis-metas, /configuracion, etc.
 */

export const ROUTES = {
  home: '/',
  login: '/',
  misCuentas: '/mis-cuentas',
  misCuentasMonth: (year: number, month: number) => `/mis-cuentas/${year}/${month}`,
  misCuentasWithGroup: (groupId: string, year: number, month: number) =>
    `/mis-cuentas/${groupId}/${year}/${month}`,
  misCuentasGrupos: '/mis-cuentas/grupos',
  misCuentasGrupoDetail: (groupId: string) => `/mis-cuentas/grupos/${groupId}`,
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
 * Uses group URL when groupId is provided (canonical for SEO).
 */
export function buildMisCuentasUrl(
  year: number,
  month: number,
  options?: { tipo?: FilterType; grupo?: string }
): string {
  const path = options?.grupo
    ? ROUTES.misCuentasWithGroup(options.grupo, year, month)
    : ROUTES.misCuentasMonth(year, month)
  if (!options?.tipo || options.tipo === 'all') {
    return path
  }
  const param = FILTER_PARAMS[options.tipo]
  return `${path}?tipo=${param}`
}

/** UUID regex for groupId validation */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Parse slug array from catch-all route into year, month, groupId.
 * - [year, month] → legacy
 * - [groupId, year, month] → canonical
 */
export function parseMisCuentasSlug(slug: string[] | undefined): {
  year: number
  month: number
  groupId?: string
} | null {
  if (!slug?.length || slug.length < 2) return null
  if (slug.length === 2) {
    const year = parseInt(slug[0], 10)
    const month = parseInt(slug[1], 10)
    if (month < 1 || month > 12 || year < 2020 || year > 2100) return null
    return { year, month }
  }
  if (slug.length === 3) {
    const [groupId, yearStr, monthStr] = slug
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    if (month < 1 || month > 12 || year < 2020 || year > 2100) return null
    if (!UUID_REGEX.test(groupId)) return null
    return { year, month, groupId }
  }
  return null
}

/**
 * Parse pathname. Supports both canonical and legacy formats.
 * - /mis-cuentas/{groupId}/{year}/{month}
 * - /mis-cuentas/{year}/{month}
 */
export function parseMisCuentasPath(pathname: string): {
  year: number
  month: number
  groupId?: string
} | null {
  const withGroup = pathname.match(/^\/mis-cuentas\/([^/]+)\/(\d{4})\/(\d{1,2})\/?$/)
  if (withGroup) {
    const [, groupId, yearStr, monthStr] = withGroup
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    if (month < 1 || month > 12 || year < 2020 || year > 2100) return null
    if (!UUID_REGEX.test(groupId)) return null
    return { year, month, groupId }
  }
  const legacy = pathname.match(/^\/mis-cuentas\/(\d{4})\/(\d{1,2})\/?$/)
  if (!legacy) return null
  const year = parseInt(legacy[1], 10)
  const month = parseInt(legacy[2], 10)
  if (month < 1 || month > 12 || year < 2020 || year > 2100) return null
  return { year, month }
}
