'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { ROUTES } from '@/lib/routes'

/**
 * Redirige a /mis-cuentas solo cuando hay sesión activa.
 * Se ejecuta después de hidratación. No bloquea el HTML SSR inicial.
 */
export default function ClientAuthRedirect() {
  const router = useRouter()
  const { user, isLoading, initAuth } = useAuthStore()

  useEffect(() => {
    let unsub: (() => void) | null = null
    initAuth().then((fn) => { unsub = fn })
    return () => unsub?.()
  }, [initAuth])

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(ROUTES.misCuentas)
    }
  }, [user, isLoading, router])

  return null
}
