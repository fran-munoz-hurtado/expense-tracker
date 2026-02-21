'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { pageview, setUserId } from '@/lib/analytics'

/**
 * Envía pageview en cada cambio de ruta (SPA).
 * Sincroniza user_id con gtag cuando hay sesión para poder filtrar/agrupar en GA.
 * El script de gtag se carga en layout.tsx (head) para que GA reconozca la instalación.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) pageview(pathname)
  }, [pathname])

  useEffect(() => {
    const setGaUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user?.id ?? null)
    }
    setGaUserId()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setGaUserId()
    })
    return () => subscription.unsubscribe()
  }, [])

  return null
}
