'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Calendar, DollarSign, FileText, AlertCircle, Check, Edit2, Trash2 } from 'lucide-react'
import { supabase, type User } from '@/lib/supabase'
import { useDataSync, DataSyncProvider } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import DashboardView from './components/DashboardView'
import GeneralDashboardView from './components/GeneralDashboardView'
import MisMetasView from './components/MisMetasView'
import CategoriesView from './components/CategoriesView'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import LoginPage from './components/LoginPage'
import DebugTest from './components/DebugTest'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'
import { texts } from '@/lib/translations'
import { 
  MOVEMENT_TYPES, 
  CUSTOM_ICONS, 
  getMovementConfig, 
  type MovementType 
} from '@/lib/config/icons'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

function Home() {
  const navigation = useAppNavigation()
  const { refreshData } = useDataSync()
  
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Form state - NUEVA IMPLEMENTACIÓN
  const [showForm, setShowForm] = useState(false)
  const [selectedMovementType, setSelectedMovementType] = useState<MovementType | null>(null)

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

  const handleViewChange = async (view: 'dashboard' | 'general-dashboard' | 'debug' | 'mis-metas' | 'categories') => {
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
    // Here we'll later implement the specific form for each type
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedMovementType(null)
  }

  // Helper function to render custom SVG icons
  const renderCustomIcon = (iconType: keyof typeof CUSTOM_ICONS, className: string = "w-5 h-5") => {
    if (iconType === 'GOAL_TARGET') {
      return (
        <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="#713f12" strokeWidth="2" fill="#FEF9C3" />
          <circle cx="10" cy="10" r="4" stroke="#713f12" strokeWidth="2" fill="white" />
          <circle cx="10" cy="10" r="1.5" fill="#713f12" />
        </svg>
      )
    }
    
    if (iconType === 'SAVINGS_PIG') {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="14" rx="7" ry="4" fill="currentColor" fillOpacity="0.1" />
          <circle cx="12" cy="8" r="4" fill="currentColor" fillOpacity="0.1" />
          <ellipse cx="12" cy="9" rx="1.5" ry="1" fill="currentColor" fillOpacity="0.2" />
          <path d="M9 6l-1-2 M15 6l1-2" />
          <path d="M7 17v2 M17 17v2 M9 17v2 M15 17v2" />
          <rect x="11" y="4" width="2" height="0.5" fill="currentColor" />
          <circle cx="16" cy="6" r="1.5" fill="currentColor" fillOpacity="0.3" />
        </svg>
      )
    }
    
    return null
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
      default:
        // Default to general dashboard for home route
        return (
          <GeneralDashboardView 
            onNavigateToMonth={handleNavigateToMonth} 
            user={user}
            navigationParams={null}
          />
        )
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar 
        activeView={navigation.currentRoute.type === 'home' ? 'general-dashboard' : navigation.currentRoute.type} 
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

      {/* NUEVO MODAL DE AÑADIR MOVIMIENTO - IMPLEMENTACIÓN DESDE 0 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseForm}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-8">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                <Plus className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Añadir Movimiento</h2>
              <p className="text-gray-600">Selecciona el tipo de movimiento que deseas crear</p>
            </div>

            {/* Movement Type Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Gasto Recurrente */}
              <button
                onClick={() => handleMovementTypeSelect('RECURRENT_EXPENSE')}
                className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-6 text-left hover:border-red-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full bg-${getColor('expense', 'light')}`}>
                    <MOVEMENT_TYPES.RECURRENT_EXPENSE.icon className={`h-6 w-6 text-${getColor('expense', 'icon')}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                      {MOVEMENT_TYPES.RECURRENT_EXPENSE.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {MOVEMENT_TYPES.RECURRENT_EXPENSE.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-red-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>

              {/* Gasto Único */}
              <button
                onClick={() => handleMovementTypeSelect('SINGLE_EXPENSE')}
                className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-6 text-left hover:border-red-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full bg-${getColor('expense', 'light')}`}>
                    <MOVEMENT_TYPES.SINGLE_EXPENSE.icon className={`h-6 w-6 text-${getColor('expense', 'icon')}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                      {MOVEMENT_TYPES.SINGLE_EXPENSE.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {MOVEMENT_TYPES.SINGLE_EXPENSE.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-red-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>

              {/* Ingreso Recurrente */}
              <button
                onClick={() => handleMovementTypeSelect('RECURRENT_INCOME')}
                className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-6 text-left hover:border-blue-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full bg-${getColor('income', 'light')}`}>
                    <MOVEMENT_TYPES.RECURRENT_INCOME.icon className={`h-6 w-6 text-${getColor('income', 'icon')}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {MOVEMENT_TYPES.RECURRENT_INCOME.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {MOVEMENT_TYPES.RECURRENT_INCOME.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>

              {/* Ingreso Único */}
              <button
                onClick={() => handleMovementTypeSelect('SINGLE_INCOME')}
                className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-6 text-left hover:border-blue-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full bg-${getColor('income', 'light')}`}>
                    <MOVEMENT_TYPES.SINGLE_INCOME.icon className={`h-6 w-6 text-${getColor('income', 'icon')}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {MOVEMENT_TYPES.SINGLE_INCOME.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {MOVEMENT_TYPES.SINGLE_INCOME.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>

              {/* Meta */}
              <button
                onClick={() => handleMovementTypeSelect('GOAL')}
                className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-6 text-left hover:border-yellow-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full bg-${getColor('goal', 'light')}`}>
                    {renderCustomIcon('GOAL_TARGET', 'h-6 w-6')}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-yellow-700 transition-colors">
                      {MOVEMENT_TYPES.GOAL.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {MOVEMENT_TYPES.GOAL.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 to-yellow-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>

              {/* Ahorro */}
              <button
                onClick={() => handleMovementTypeSelect('SAVINGS')}
                className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-6 text-left hover:border-green-300 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full bg-${getColor('balance', 'light')}`}>
                    {renderCustomIcon('SAVINGS_PIG', 'h-6 w-6 text-green-600')}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                      {MOVEMENT_TYPES.SAVINGS.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {MOVEMENT_TYPES.SAVINGS.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-green-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
            </div>

            {/* Selected Type Debug Info */}
            {selectedMovementType && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900">
                  Tipo seleccionado: {getMovementConfig(selectedMovementType).label}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  🚧 Aquí se mostrará el formulario específico para este tipo de movimiento
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedMovementType}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continuar
              </button>
            </div>
          </section>
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