'use client'

import { useState, useEffect } from 'react'
import { X, Trophy } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { useDataSync } from '@/lib/hooks/useDataSync'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useGroupStore } from '@/lib/store/groupStore'
import DashboardView from '@/app/components/DashboardView'
import AppLayoutWithSidebar from '@/app/components/AppLayoutWithSidebar'
import AppLoadingView from '@/app/components/AppLoadingView'
import LoginPage from '@/app/components/LoginPage'
import BaseMovementForm from '@/app/components/forms/BaseMovementForm'
import { texts } from '@/lib/translations'
import { MOVEMENT_TYPES, type MovementType } from '@/lib/config/icons'
import { createRecurrentExpense, createNonRecurrentExpense } from '@/lib/dataUtils'
import { analytics } from '@/lib/analytics'
import TransactionIcon from '@/app/components/TransactionIcon'
import { FILTER_PARAMS_REVERSE, buildMisCuentasUrl, parseMisCuentasPath, type FilterType } from '@/lib/routes'

function LoadingFallback() {
  return <AppLoadingView message={texts.loading} />
}

interface MisCuentasClientProps {
  year: number
  month: number
  filterParam?: string
  /** When present, canonical URL with group (SEO) */
  groupId?: string
}

export default function MisCuentasClient({ year, month, filterParam, groupId: urlGroupId }: MisCuentasClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { refreshData } = useDataSync()
  const { user, isLoading, logout, initAuth } = useAuthStore()
  const { fetchGroups, reset: resetGroups, currentGroupId, setCurrentGroupId } = useGroupStore()

  const [showForm, setShowForm] = useState(false)
  const [selectedMovementType, setSelectedMovementType] = useState<MovementType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const initialFilter: FilterType =
    (filterParam && FILTER_PARAMS_REVERSE[filterParam]) || 'all'

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
    if (user?.id) fetchGroups(user.id)
  }, [user?.id, fetchGroups])

  // Sync group from URL → store ( canonical route with groupId )
  useEffect(() => {
    if (urlGroupId) setCurrentGroupId(urlGroupId)
  }, [urlGroupId, setCurrentGroupId])

  // Legacy route: replace URL with canonical (with group) when we have one
  useEffect(() => {
    if (!urlGroupId && currentGroupId && pathname.startsWith('/mis-cuentas')) {
      const parsed = parseMisCuentasPath(pathname)
      if (parsed?.year && parsed.month) {
        const tipo = searchParams.get('tipo')
        const filterType = tipo && FILTER_PARAMS_REVERSE[tipo] ? FILTER_PARAMS_REVERSE[tipo] : undefined
        router.replace(buildMisCuentasUrl(parsed.year, parsed.month, {
          tipo: filterType === 'all' ? undefined : filterType,
          grupo: currentGroupId,
        }))
      }
    }
  }, [urlGroupId, currentGroupId, pathname, searchParams, router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      resetGroups()
      await logout()
      router.push('/')
    } catch (error) {
      console.error('[page] Error durante logout:', error)
      setIsLoggingOut(false)
      router.push('/')
    }
  }

  const handleAddExpense = () => setShowForm(true)

  const handleMovementTypeSelect = (type: MovementType) => setSelectedMovementType(type)

  const handleFormSubmit = async (payload: any) => {
    setIsSubmitting(true)
    try {
      if (payload.type === 'expense') {
        if (selectedMovementType === 'RECURRENT_EXPENSE' || selectedMovementType === 'GOAL' || selectedMovementType === 'SAVINGS') {
          await createRecurrentExpense(user!, {
            description: payload.description,
            month_from: payload.month_from,
            month_to: payload.month_to,
            year_from: payload.year_from,
            year_to: payload.year_to,
            value: payload.value,
            payment_day_deadline: payload.payment_day_deadline,
            type: payload.type,
            category: payload.category,
            isgoal: payload.isgoal
          }, currentGroupId!)
        } else {
          await createNonRecurrentExpense(user!, {
            description: payload.description,
            year: payload.year,
            month: payload.month,
            value: payload.value,
            payment_deadline: payload.payment_deadline,
            type: payload.type,
            category: payload.category,
          }, currentGroupId!)
        }
      } else {
        if (selectedMovementType === 'RECURRENT_INCOME') {
          await createRecurrentExpense(user!, {
            description: payload.description,
            month_from: payload.month_from,
            month_to: payload.month_to,
            year_from: payload.year_from,
            year_to: payload.year_to,
            value: payload.value,
            payment_day_deadline: payload.payment_day_deadline,
            type: payload.type,
            category: payload.category,
            isgoal: payload.isgoal
          }, currentGroupId!)
        } else {
          await createNonRecurrentExpense(user!, {
            description: payload.description,
            year: payload.year,
            month: payload.month,
            value: payload.value,
            payment_deadline: payload.payment_deadline,
            type: payload.type,
            category: payload.category,
          }, currentGroupId!)
        }
      }
      if (selectedMovementType) analytics.addMovement(selectedMovementType, user!.id)
      await refreshData(user!.id, 'create_transaction')
      handleCloseForm()
    } catch (error) {
      console.error('❌ Error creating transaction:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedMovementType(null)
    setIsSubmitting(false)
  }

  const getMovementTypeContainer = (movementType: MovementType) => {
    const mockTransaction = {
      id: 0,
      user_id: user?.id || '',
      description: '',
      value: 0,
      month: 1,
      year: 2025,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deadline: null,
      notes: null,
      status: 'pending' as const,
      type: MOVEMENT_TYPES[movementType].type,
      source_type: MOVEMENT_TYPES[movementType].source_type,
      source_id: 1,
      category: movementType === 'SAVINGS' ? 'Ahorro' : 'general',
    }
    const mockRecurrentGoalMap = { 1: movementType === 'GOAL' }
    return (
      <TransactionIcon
        transaction={mockTransaction}
        recurrentGoalMap={mockRecurrentGoalMap}
        size="w-5 h-5"
        showBackground={true}
      />
    )
  }

  if (isLoading || isLoggingOut) return <AppLoadingView message={isLoggingOut ? texts.loggingOut : texts.loading} />
  if (!user) return <LoginPage onLogin={() => {}} />

  const navigationParams = { month, year }
  const hasGroup = !!currentGroupId

  return (
    <AppLayoutWithSidebar user={user} onLogout={handleLogout}>
      <DashboardView
          navigationParams={navigationParams}
          user={user}
          onDataChange={refreshData}
          initialFilterType={initialFilter}
          syncToUrl={true}
          onAddExpense={hasGroup ? handleAddExpense : undefined}
        />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          {!selectedMovementType ? (
            <section className="relative bg-neutral-bg rounded-xl px-6 py-6 w-full max-w-lg shadow-soft border border-border-light max-h-[90vh] overflow-y-auto">
              <button
                onClick={handleCloseForm}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center mb-3">
                <h2 className="text-lg text-gray-dark font-semibold mb-2">Agregar ingreso u obligación</h2>
                <p className="text-sm text-green-dark">Selecciona qué deseas registrar en este espacio</p>
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase text-green-dark mb-1 mt-4">Ingresos</p>
                <div className="flex flex-col gap-1">
                  <div onClick={() => handleMovementTypeSelect('RECURRENT_INCOME')} className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer">
                    {getMovementTypeContainer('RECURRENT_INCOME')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">{MOVEMENT_TYPES.RECURRENT_INCOME.label}</span>
                      <span className="text-xs text-green-dark leading-tight">{MOVEMENT_TYPES.RECURRENT_INCOME.description}</span>
                    </div>
                  </div>
                  <div onClick={() => handleMovementTypeSelect('SINGLE_INCOME')} className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer">
                    {getMovementTypeContainer('SINGLE_INCOME')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">{MOVEMENT_TYPES.SINGLE_INCOME.label}</span>
                      <span className="text-xs text-green-dark leading-tight">{MOVEMENT_TYPES.SINGLE_INCOME.description}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs uppercase text-green-dark mb-1 mt-4">OBLIGACIONES Y GASTOS</p>
                <div className="flex flex-col gap-1">
                  <div onClick={() => handleMovementTypeSelect('RECURRENT_EXPENSE')} className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer">
                    {getMovementTypeContainer('RECURRENT_EXPENSE')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">{MOVEMENT_TYPES.RECURRENT_EXPENSE.label}</span>
                      <span className="text-xs text-green-dark leading-tight">{MOVEMENT_TYPES.RECURRENT_EXPENSE.description}</span>
                    </div>
                  </div>
                  <div onClick={() => handleMovementTypeSelect('SINGLE_EXPENSE')} className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer">
                    {getMovementTypeContainer('SINGLE_EXPENSE')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">{MOVEMENT_TYPES.SINGLE_EXPENSE.label}</span>
                      <span className="text-xs text-green-dark leading-tight">{MOVEMENT_TYPES.SINGLE_EXPENSE.description}</span>
                    </div>
                  </div>
                  <div onClick={() => handleMovementTypeSelect('GOAL')} className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer">
                    {getMovementTypeContainer('GOAL')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">{MOVEMENT_TYPES.GOAL.label}</span>
                      <span className="text-xs text-green-dark leading-tight">{MOVEMENT_TYPES.GOAL.description}</span>
                    </div>
                  </div>
                  <div onClick={() => handleMovementTypeSelect('SAVINGS')} className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer">
                    {getMovementTypeContainer('SAVINGS')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">{MOVEMENT_TYPES.SAVINGS.label}</span>
                      <span className="text-xs text-green-dark leading-tight">{MOVEMENT_TYPES.SAVINGS.description}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <BaseMovementForm
                movementType={selectedMovementType}
                user={user}
                onSubmit={handleFormSubmit}
                onCancel={handleCloseForm}
                isSubmitting={isSubmitting}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </AppLayoutWithSidebar>
  )
}
