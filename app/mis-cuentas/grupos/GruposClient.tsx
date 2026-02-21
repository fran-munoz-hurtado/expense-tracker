'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useGroupStore } from '@/lib/store/groupStore'
import AppLayoutWithSidebar from '@/app/components/AppLayoutWithSidebar'
import AppLoadingView from '@/app/components/AppLoadingView'
import LoginPage from '@/app/components/LoginPage'
import GroupsManagementView from '@/app/components/GroupsManagementView'
import { texts } from '@/lib/translations'

export default function GruposClient() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, isLoading, logout, initAuth } = useAuthStore()
  const { fetchGroups, reset: resetGroups } = useGroupStore()

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    const initialize = async () => {
      try {
        unsubscribe = await initAuth()
      } catch (error) {
        console.error('[grupos] Error inicializando autenticación:', error)
      }
    }
    initialize()
    return () => unsubscribe?.()
  }, [initAuth])

  useEffect(() => {
    if (user?.id) fetchGroups(user.id)
  }, [user?.id, fetchGroups])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      resetGroups()
      await logout()
      router.push('/')
    } catch (error) {
      console.error('[grupos] Error durante logout:', error)
      setIsLoggingOut(false)
      router.push('/')
    }
  }

  if (isLoading || isLoggingOut) return <AppLoadingView message={isLoggingOut ? texts.loggingOut : texts.loading} />
  if (!user) return <LoginPage onLogin={() => {}} />

  return (
    <AppLayoutWithSidebar user={user} onLogout={handleLogout}>
      <GroupsManagementView user={user} />
    </AppLayoutWithSidebar>
  )
}
