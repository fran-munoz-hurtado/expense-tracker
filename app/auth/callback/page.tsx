'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { savePrivacyConsent, handleSupabaseLogout } from '@/lib/services/supabaseAuth'
import AppLoadingView from '@/app/components/AppLoadingView'

const PRIVACY_CONSENT_STORAGE_KEY = 'privacy_consent_signup'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [missingConsent, setMissingConsent] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleGoToSignup = async () => {
    setSigningOut(true)
    await handleSupabaseLogout()
    if (typeof window !== 'undefined') sessionStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY)
    router.replace('/signup')
  }

  useEffect(() => {
    const next = searchParams.get('next') || '/mis-cuentas'
    const code = searchParams.get('code')
    const fromSignup = searchParams.get('from') === 'signup'

    const finish = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY)
      }
      router.replace(next)
    }

    if (!code) {
      finish()
      return
    }

    let mounted = true

    const run = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          console.error('[auth/callback] Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(finish, 3000)
          return
        }

        if (session?.user) {
          if (fromSignup && typeof window !== 'undefined') {
            const stored = sessionStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY)
            if (stored) {
              try {
                const { accepted, policy_version } = JSON.parse(stored)
                if (accepted === true && policy_version === '1.0') {
                  await savePrivacyConsent(session.user.id)
                }
              } catch (_) { /* ignore */ }
            }
          }

          const { data: consent } = await supabase
            .from('user_privacy_consents')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('accepted_privacy', true)
            .maybeSingle()

          if (!mounted) return

          if (!consent) {
            setMissingConsent(true)
            return
          }

          finish()
        } else {
          // Exchange might still be in progress - wait and retry once
          await new Promise((r) => setTimeout(r, 1500))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (mounted && retrySession?.user) {
            if (fromSignup && typeof window !== 'undefined') {
              const stored = sessionStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY)
              if (stored) {
                try {
                  const { accepted, policy_version } = JSON.parse(stored)
                  if (accepted === true && policy_version === '1.0') {
                    await savePrivacyConsent(retrySession.user.id)
                  }
                } catch (_) { /* ignore */ }
              }
            }
            const { data: retryConsent } = await supabase
              .from('user_privacy_consents')
              .select('id')
              .eq('user_id', retrySession.user.id)
              .eq('accepted_privacy', true)
              .maybeSingle()
            if (!retryConsent) {
              setMissingConsent(true)
              return
            }
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

  if (missingConsent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
          <p className="text-gray-800 mb-4">
            Para usar Controla debes aceptar la Política de Tratamiento de Datos.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Si entraste por &quot;ya tengo cuenta&quot; sin haber registrado antes, completa tu registro desde el signup.
          </p>
          <button
            type="button"
            onClick={handleGoToSignup}
            disabled={signingOut}
            className="w-full py-2.5 px-4 rounded-md text-white font-medium disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}
          >
            {signingOut ? 'Redirigiendo...' : 'Ir a sign up'}
          </button>
          <p className="mt-4 text-xs text-gray-500">
            <Link href="/privacidad" className="text-blue-600 hover:underline">
              Ver Política de Tratamiento de Datos
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return <AppLoadingView message="Completando inicio de sesión..." />
}

/**
 * OAuth callback handler for Google (and other providers).
 * Supabase redirects here with ?code= after auth. The client exchanges the code
 * and we redirect to the intended destination.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AppLoadingView />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
