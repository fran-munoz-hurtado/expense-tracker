'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Calendar, DollarSign, FileText, AlertCircle, Check, Edit2, Trash2, Trophy } from 'lucide-react'
import { supabase, type User } from '@/lib/supabase'
import { useDataSync, DataSyncProvider } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import DashboardView from './components/DashboardView'
import GeneralDashboardView from './components/GeneralDashboardView'
import MisMetasView from './components/MisMetasView'
import CategoriesView from './components/CategoriesView'
import ComoVamosView from './components/ComoVamosView'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import LoginPage from './components/LoginPage'
import DebugTest from './components/DebugTest'
import BaseMovementForm from './components/forms/BaseMovementForm'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'
import { texts } from '@/lib/translations'
import { 
  MOVEMENT_TYPES, 
  CUSTOM_ICONS, 
  getMovementConfig, 
  type MovementType 
} from '@/lib/config/icons'
import { createRecurrentExpense, createNonRecurrentExpense } from '@/lib/dataUtils'
import TransactionIcon from './components/TransactionIcon'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

function Home() {
  const navigation = useAppNavigation()
  const { refreshData } = useDataSync()
  
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Form state - NUEVA IMPLEMENTACIÓN
  const [showForm, setShowForm] = useState(false)
  const [selectedMovementType, setSelectedMovementType] = useState<MovementType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load user from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('expenseTrackerUser')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('expenseTrackerUser')
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    // Save user to localStorage
    localStorage.setItem('expenseTrackerUser', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    // Navigate to home on logout
    navigation.navigateToHome()
    // Remove user from localStorage
    localStorage.removeItem('expenseTrackerUser')
  }

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser)
    // Update user in localStorage
    localStorage.setItem('expenseTrackerUser', JSON.stringify(updatedUser))
  }

  const handleViewChange = async (view: 'dashboard' | 'general-dashboard' | 'debug' | 'mis-metas' | 'categories' | 'como-vamos') => {
    console.log('🔄 handleViewChange called with view:', view)
    try {
      switch (view) {
        case 'dashboard':
          console.log('📍 Navigating to dashboard...')
          // Navigate to current month dashboard
          const currentMonth = new Date().getMonth() + 1
          const currentYear = new Date().getFullYear()
          await navigation.navigateToDashboard(currentMonth, currentYear)
          console.log('✅ Dashboard navigation completed')
          break
        case 'general-dashboard':
          console.log('📍 Navigating to general-dashboard...')
          await navigation.navigateToGeneralDashboard(new Date().getFullYear())
          console.log('✅ General dashboard navigation completed')
          break
        case 'debug':
          console.log('📍 Navigating to debug...')
          await navigation.navigateToDebug()
          console.log('✅ Debug navigation completed')
          break
        case 'mis-metas':
          console.log('📍 Navigating to mis-metas...')
          await navigation.navigateToMisMetas()
          console.log('✅ Mis metas navigation completed')
          break
        case 'categories':
          console.log('📍 Navigating to categories...')
          await navigation.navigateToCategories()
          console.log('✅ Categories navigation completed')
          break
        case 'como-vamos':
          console.log('📍 Navigating to como-vamos...')
          await navigation.navigateToComoVamos()
          console.log('✅ Como vamos navigation completed')
          break
      }
    } catch (error) {
      console.error('❌ Navigation error:', error)
    }
  }

  const handleNavigateToMonth = async (month: number, year: number) => {
    try {
      await navigation.navigateToDashboard(month, year)
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }

  const handleAddExpense = () => {
    console.log('🎯 Opening add expense modal...')
    setShowForm(true)
  }

  const handleMovementTypeSelect = (type: MovementType) => {
    console.log('🎯 Movement type selected:', type)
    setSelectedMovementType(type)
  }

  const handleFormSubmit = async (payload: any) => {
    console.log('🎯 Form submitted with payload:', payload)
    console.log('🎯 Selected movement type:', selectedMovementType)
    console.log('🎯 Payload type:', payload.type)
    console.log('🎯 Payload category:', payload.category)
    setIsSubmitting(true)
    
    try {
      if (payload.type === 'expense') {
        // Handle expense creation
        if (selectedMovementType === 'RECURRENT_EXPENSE' || selectedMovementType === 'GOAL' || selectedMovementType === 'SAVINGS') {
          // Create recurrent expense
          console.log('🔄 Creating recurrent expense...')
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
          })
        } else {
          // Create non-recurrent expense
          console.log('🔄 Creating non-recurrent expense...')
          await createNonRecurrentExpense(user!, {
            description: payload.description,
            year: payload.year,
            month: payload.month,
            value: payload.value,
            payment_deadline: payload.payment_deadline,
            type: payload.type,
            category: payload.category,
            // isgoal is NOT included because non_recurrent_expenses table doesn't have this column
          })
        }
      } else {
        // Handle income creation
        if (selectedMovementType === 'RECURRENT_INCOME') {
          // Create recurrent income
          console.log('🔄 Creating recurrent income...')
          console.log('📋 Recurrent income payload:', {
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
          })
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
          })
        } else {
          // Create non-recurrent income
          console.log('🔄 Creating non-recurrent income...')
          await createNonRecurrentExpense(user!, {
            description: payload.description,
            year: payload.year,
            month: payload.month,
            value: payload.value,
            payment_deadline: payload.payment_deadline,
            type: payload.type,
            category: payload.category,
            // isgoal is NOT included because non_recurrent_expenses table doesn't have this column
          })
        }
      }
      
      console.log('✅ Transaction created successfully!')
      // Refresh data and close modal
      await refreshData(user!.id, 'create_transaction')
      handleCloseForm()
      
    } catch (error) {
      console.error('❌ Error creating transaction:', error)
      throw error // Re-throw to let BaseMovementForm handle the error display
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedMovementType(null)
    setIsSubmitting(false)
  }

  // Helper function to render custom SVG icons
  const renderCustomIcon = (iconType: keyof typeof CUSTOM_ICONS, className: string = "w-5 h-5") => {
    if (iconType === 'GOAL_TARGET') {
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" fill="#fef3c7" />
          <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="2.5" fill="#fef3c7" />
        </svg>
      )
    }
    
    if (iconType === 'SAVINGS_TROPHY') {
      // Use the minimalist Trophy icon from Lucide React
      return <Trophy className={className} />
    }
    
    if (iconType === 'SAVINGS_PIG') {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Moneda - círculo exterior mucho más grande y centrado */}
          <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="2.5" />
          
          {/* Trébol de 3 hojas más grande y sólido */}
          {/* Hoja izquierda */}
          <circle cx="8.5" cy="11" r="2.5" fill="currentColor" stroke="#22c55e" strokeWidth="1.2" />
          
          {/* Hoja derecha */}
          <circle cx="15.5" cy="11" r="2.5" fill="currentColor" stroke="#22c55e" strokeWidth="1.2" />
          
          {/* Hoja superior */}
          <circle cx="12" cy="7.5" r="2.5" fill="currentColor" stroke="#22c55e" strokeWidth="1.2" />
          
          {/* Tallo más corto */}
          <line x1="12" y1="12.5" x2="12" y2="15" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    }
    
    if (iconType === 'TICKET_TAG') {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Etiqueta principal - forma de casa invertida simétrica con todas las esquinas suavizadas */}
          <path d="M5 4 Q5 1 7 1 L17 1 Q19 1 19 4 L19 16 Q19 17 18 17 Q15 20 12 22 Q9 20 6 17 Q5 17 5 16 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
          
          {/* Agujero redondo en la parte superior */}
          <circle cx="12" cy="5" r="1.5" fill="white" stroke="white" strokeWidth="0.5" />
        </svg>
      )
    }
    
    return null
  }

  // Helper function to render movement type icon using TransactionIcon component
  const renderMovementTypeIcon = (movementType: MovementType) => {
    // Create a mock transaction to use with TransactionIcon
    const mockTransaction = {
      id: 0,
      user_id: typeof user?.id === 'string' ? parseInt(user.id) : (user?.id || 0),
      description: '',
      value: 0,
      month: 1,
      year: 2025,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deadline: null,
      notes: null,
      status: 'pending' as const,
      // Movement type specific properties
      type: MOVEMENT_TYPES[movementType].type,
      source_type: MOVEMENT_TYPES[movementType].source_type,
      source_id: 1,
      category: movementType === 'SAVINGS' ? 'Ahorro' : 'general',
    }
    
    // Mock recurrentGoalMap - only GOAL should be true
    const mockRecurrentGoalMap = {
      1: movementType === 'GOAL'
    }
    
    return (
      <TransactionIcon 
        transaction={mockTransaction}
        recurrentGoalMap={mockRecurrentGoalMap}
        size="w-5 h-5"
        showBackground={false}
      />
    )
  }

  // Helper function to get movement type container styling
  const getMovementTypeContainer = (movementType: MovementType) => {
    const mockTransaction = {
      id: 0,
      user_id: typeof user?.id === 'string' ? parseInt(user.id) : (user?.id || 0),
      description: '',
      value: 0,
      month: 1,
      year: 2025,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deadline: null,
      notes: null,
      status: 'pending' as const,
      // Movement type specific properties
      type: MOVEMENT_TYPES[movementType].type,
      source_type: MOVEMENT_TYPES[movementType].source_type,
      source_id: 1,
      category: movementType === 'SAVINGS' ? 'Ahorro' : 'general',
    }
    
    const mockRecurrentGoalMap = {
      1: movementType === 'GOAL'
    }
    
    return (
      <TransactionIcon 
        transaction={mockTransaction}
        recurrentGoalMap={mockRecurrentGoalMap}
        size="w-5 h-5"
        showBackground={true}
      />
    )
  }

  // Show loading state while checking localStorage
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      </div>
    )
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Determine which view to render based on current route
  const renderView = () => {
    switch (navigation.currentRoute.type) {
      case 'dashboard':
        return (
          <DashboardView 
            navigationParams={{ 
              month: navigation.currentRoute.month, 
              year: navigation.currentRoute.year 
            }} 
            user={user}
            onDataChange={refreshData}
          />
        )
      case 'general-dashboard':
        return (
          <GeneralDashboardView 
            onNavigateToMonth={handleNavigateToMonth} 
            user={user}
            navigationParams={{ year: navigation.currentRoute.year }}
          />
        )
      case 'debug':
        return <DebugTest user={user} />
      case 'mis-metas':
        return <MisMetasView user={user} navigationParams={{ year: navigation.currentRoute.year }} />
      case 'categories':
        return (
          <CategoriesView 
            user={user} 
            navigationParams={{ 
              year: navigation.currentRoute.year, 
              month: navigation.currentRoute.month 
            }} 
          />
        )
      case 'como-vamos':
        return <ComoVamosView user={user} />
      default:
        // Default to como-vamos for home route
        return <ComoVamosView user={user} />
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar 
        activeView={navigation.currentRoute.type === 'home' ? 'como-vamos' : navigation.currentRoute.type} 
        onViewChange={handleViewChange} 
        onAddExpense={handleAddExpense}
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <Navbar user={user} onLogout={handleLogout} onViewChange={handleViewChange} onUserUpdate={handleUserUpdate} />
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>

      {/* NUEVO MODAL DE AÑADIR MOVIMIENTO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          
          {/* Movement Type Selection or Form */}
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
                <h2 className="text-lg text-gray-dark font-semibold mb-2">Añadir Movimiento</h2>
                <p className="text-sm text-green-dark">Selecciona el tipo de movimiento que deseas crear</p>
              </div>

              {/* Movement Type Selection - Grouped */}
              <div className="mt-4">
                {/* Grupo: Plata que entra */}
                <p className="text-xs uppercase text-green-dark mb-1 mt-4">Ingresos</p>
                <div className="flex flex-col gap-1">
                  {/* Ingreso Recurrente */}
                  <div
                    onClick={() => handleMovementTypeSelect('RECURRENT_INCOME')}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer"
                  >
                    {getMovementTypeContainer('RECURRENT_INCOME')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">
                        {MOVEMENT_TYPES.RECURRENT_INCOME.label}
                      </span>
                      <span className="text-xs text-green-dark leading-tight">
                        {MOVEMENT_TYPES.RECURRENT_INCOME.description}
                      </span>
                    </div>
                  </div>

                  {/* Ingreso Único */}
                  <div
                    onClick={() => handleMovementTypeSelect('SINGLE_INCOME')}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer"
                  >
                    {getMovementTypeContainer('SINGLE_INCOME')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">
                        {MOVEMENT_TYPES.SINGLE_INCOME.label}
                      </span>
                      <span className="text-xs text-green-dark leading-tight">
                        {MOVEMENT_TYPES.SINGLE_INCOME.description}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grupo: Plata que sale */}
                <p className="text-xs uppercase text-green-dark mb-1 mt-4">Gastos</p>
                <div className="flex flex-col gap-1">
                  {/* Gasto Recurrente */}
                  <div
                    onClick={() => handleMovementTypeSelect('RECURRENT_EXPENSE')}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer"
                  >
                    {getMovementTypeContainer('RECURRENT_EXPENSE')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">
                        {MOVEMENT_TYPES.RECURRENT_EXPENSE.label}
                      </span>
                      <span className="text-xs text-green-dark leading-tight">
                        {MOVEMENT_TYPES.RECURRENT_EXPENSE.description}
                      </span>
                    </div>
                  </div>

                  {/* Gasto Único */}
                  <div
                    onClick={() => handleMovementTypeSelect('SINGLE_EXPENSE')}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer"
                  >
                    {getMovementTypeContainer('SINGLE_EXPENSE')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">
                        {MOVEMENT_TYPES.SINGLE_EXPENSE.label}
                      </span>
                      <span className="text-xs text-green-dark leading-tight">
                        {MOVEMENT_TYPES.SINGLE_EXPENSE.description}
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div
                    onClick={() => handleMovementTypeSelect('GOAL')}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer"
                  >
                    {getMovementTypeContainer('GOAL')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">
                        {MOVEMENT_TYPES.GOAL.label}
                      </span>
                      <span className="text-xs text-green-dark leading-tight">
                        {MOVEMENT_TYPES.GOAL.description}
                      </span>
                    </div>
                  </div>

                  {/* Ahorro */}
                  <div
                    onClick={() => handleMovementTypeSelect('SAVINGS')}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md cursor-pointer"
                  >
                    {getMovementTypeContainer('SAVINGS')}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-gray-dark">
                        {MOVEMENT_TYPES.SAVINGS.label}
                      </span>
                      <span className="text-xs text-green-dark leading-tight">
                        {MOVEMENT_TYPES.SAVINGS.description}
                      </span>
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
    </div>
  )
}

export default function App() {
  return (
    <DataSyncProvider>
      <Home />
    </DataSyncProvider>
  )
} 