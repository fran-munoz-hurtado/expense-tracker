'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import LoginPage from './components/LoginPage'
import { texts } from '@/lib/translations'
import { ROUTES } from '@/lib/routes'

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{texts.loading}</p>
      </div>
    </div>
  )
}

function HomePage() {
  const router = useRouter()
  const { user, isLoading, initAuth } = useAuthStore()

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    const initialize = async () => {
      try {
        unsubscribe = await initAuth()
      } catch (error) {
        console.error('[page] Error inicializando autenticación:', error)
      }
    }
    initialize()
    return () => unsubscribe?.()
  }, [initAuth])

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(ROUTES.misCuentas)
    }
  }, [user, isLoading, router])

  if (isLoading) return <LoadingFallback />
  if (!user) return <LoginPage onLogin={() => {}} />

  // User is logged in – redirect will happen; show loading meanwhile
  return <LoadingFallback />
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePage />
    </Suspense>
  )
}
