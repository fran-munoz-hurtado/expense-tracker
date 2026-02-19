'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import LoginPage from '../components/LoginPage'
import { texts } from '@/lib/translations'
import { ROUTES } from '@/lib/routes'

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-primary mx-auto mb-4"></div>
        <p className="text-gray-600">{texts.loading}</p>
      </div>
    </div>
  )
}

export default function LoginRoutePage() {
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

  if (isLoading) return <LoadingFallback />
  if (!user) return <LoginPage onLogin={() => {}} />

  return <LoadingFallback />
}
