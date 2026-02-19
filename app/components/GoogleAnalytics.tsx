'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { pageview } from '@/lib/analytics'

/**
 * Envía pageview en cada cambio de ruta (SPA).
 * El script de gtag se carga en layout.tsx (head) para que GA reconozca la instalación.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) pageview(pathname)
  }, [pathname])

  return null
}
