'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useGroupStore } from '@/lib/store/groupStore'
import AppLayoutWithSidebar from '@/app/components/AppLayoutWithSidebar'
import LoginPage from '@/app/components/LoginPage'
import GroupDetailView from '@/app/components/GroupDetailView'
import { texts } from '@/lib/translations'

function LoadingFallback() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 25%, #eff6ff 50%, #f0fdf4 75%, #ecfdf5 100%)' }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{texts.loading}</p>
      </div>
    </div>
  )
}

interface GrupoDetailClientProps {
  groupId: string
}

export default function GrupoDetailClient({ groupId }: GrupoDetailClientProps) {
  const router = useRouter()
  const { user, isLoading, logout, initAuth } = useAuthStore()
  const { fetchGroups, reset: resetGroups } = useGroupStore()

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    const initialize = async () => {
      try {
        unsubscribe = await initAuth()
      } catch (error) {
        console.error('[grupo-detail] Error inicializando autenticación:', error)
      }
    }
    initialize()
    return () => unsubscribe?.()
  }, [initAuth])

  useEffect(() => {
    if (user?.id) fetchGroups(user.id)
  }, [user?.id, fetchGroups])

  const handleLogout = async () => {
    try {
      resetGroups()
      await logout()
      router.push('/')
    } catch (error) {
      console.error('[grupo-detail] Error durante logout:', error)
      router.push('/')
    }
  }

  if (isLoading) return <LoadingFallback />
  if (!user) return <LoginPage onLogin={() => {}} />

  return (
    <AppLayoutWithSidebar user={user} onLogout={handleLogout}>
      <GroupDetailView groupId={groupId} user={user} />
    </AppLayoutWithSidebar>
  )
}
