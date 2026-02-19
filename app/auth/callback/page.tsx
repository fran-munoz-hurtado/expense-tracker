'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = searchParams.get('next') || '/mis-cuentas'
    const code = searchParams.get('code')

    const finish = () => {
      // Remove auth params from URL before redirecting
      router.replace(next)
    }

    if (!code) {
      // No code - might be a direct visit or error from provider
      finish()
      return
    }

    let mounted = true

    const run = async () => {
      try {
        // Supabase client with detectSessionInUrl will auto-exchange the code.
        // getSession() triggers/waits for the exchange when code is present.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          console.error('[auth/callback] Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(finish, 3000)
          return
        }

        if (session?.user) {
          finish()
        } else {
          // Exchange might still be in progress - wait and retry once
          await new Promise((r) => setTimeout(r, 1500))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (mounted && retrySession?.user) {
            finish()
          } else {
            setError('No se pudo completar el inicio de sesión')
            setTimeout(finish, 3000)
          }
        }
      } catch (err) {
        console.error('[auth/callback] Error:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error inesperado')
          setTimeout(finish, 3000)
        }
      }
    }

    run()
    return () => { mounted = false }
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>
      <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Completando inicio de sesión...</p>
      </div>
    </div>
  )
}

/**
 * OAuth callback handler for Google (and other providers).
 * Supabase redirects here with ?code= after auth. The client exchanges the code
 * and we redirect to the intended destination.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
