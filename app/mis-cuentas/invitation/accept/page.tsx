'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useGroupStore } from '@/lib/store/groupStore'
import { acceptInvitationByToken } from '@/lib/services/invitationService'
import { ROUTES } from '@/lib/routes'
import LoginPage from '@/app/components/LoginPage'

export default function InvitationAcceptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { user, isLoading: authLoading, initAuth } = useAuthStore()
  const { fetchGroups } = useGroupStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    let unsub: (() => void) | null = null
    initAuth().then((fn) => { unsub = fn })
    return () => unsub?.()
  }, [initAuth])

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      setStatus('error')
      setMessage('Enlace inválido. Falta el token de invitación.')
      return
    }
    if (!user) return

    let cancelled = false
    acceptInvitationByToken(token).then((result) => {
      if (cancelled) return
      if (result.success && result.group_id) {
        setStatus('success')
        setMessage(result.group_name || 'Grupo')
        fetchGroups(user.id)
        setTimeout(() => {
          router.replace(ROUTES.misCuentasGrupoDetail(result.group_id!))
        }, 1500)
      } else {
        setStatus('error')
        setMessage(result.error || 'Enlace inválido o expirado')
      }
    })
    return () => { cancelled = true }
  }, [token, user, authLoading, router, fetchGroups])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4" />
          <p className="text-gray-600">Comprobando invitación...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={() => {}} />
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4" />
          <p className="text-gray-600">Aceptando invitación...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">¡Bienvenido a {message}!</h2>
          <p className="text-sm text-gray-600">Redirigiendo al grupo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-red-600">✕</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No se pudo aceptar</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <button
          onClick={() => router.replace(ROUTES.misCuentas)}
          className="px-4 py-2 bg-sky-600 text-white rounded-md text-sm font-medium hover:bg-sky-700"
        >
          Ir a Mis cuentas
        </button>
      </div>
    </div>
  )
}
