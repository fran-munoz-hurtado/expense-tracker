'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, LogOut } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import { DataSyncProvider, useDataSync } from '@/lib/hooks/useDataSync'
import Sidebar from './components/Sidebar'
import DashboardView from './components/DashboardView'
import DebugTest from './components/DebugTest'
import GeneralDashboardView from './components/GeneralDashboardView'
import LoginPage from './components/LoginPage'
import Navbar from './components/Navbar'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

// Main application component wrapped with DataSyncProvider
export default function App() {
  return (
    <DataSyncProvider>
      <Home />
    </DataSyncProvider>
  )
}

function Home() {
  const navigation = useAppNavigation()
  const { refreshData } = useDataSync()
  
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [expenseType, setExpenseType] = useState<ExpenseType>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationData, setConfirmationData] = useState<{
    type: ExpenseType
    description: string
    value: number
    transactionCount: number
    period?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Form data for recurrent expenses
  const [recurrentFormData, setRecurrentFormData] = useState({
    description: '',
    month_from: 1,
    month_to: 12,
    year_from: new Date().getFullYear(),
    year_to: new Date().getFullYear(),
    value: 0,
    payment_day_deadline: ''
  })

  // Form data for non-recurrent expenses
  const [nonRecurrentFormData, setNonRecurrentFormData] = useState({
    description: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    value: 0,
    payment_deadline: ''
  })

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

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Available years for selection - easy to extend in the future
  const availableYears = [2025]

  // Helper function to format currency for display (rounded, no decimals)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Helper function to parse currency string back to number
  const parseCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '')
    return parseFloat(cleanValue) || 0
  }

  // Helper function to get currency input value - just return the raw number as string
  const getCurrencyInputValue = (value: number): string => {
    if (value === 0) return ''
    return value.toString()
  }

  const calculateTransactionCount = (type: ExpenseType, formData: any): number => {
    if (type === 'recurrent') {
      const { month_from, month_to, year_from, year_to } = formData
      let count = 0
      let currentYear = year_from
      let currentMonth = month_from
      
      while ((currentYear < year_to) || (currentYear === year_to && currentMonth <= month_to)) {
        count++
        if (currentMonth === 12) {
          currentMonth = 1
          currentYear++
        } else {
          currentMonth++
        }
      }
      return count
    } else if (type === 'non_recurrent') {
      return 1
    }
    return 0
  }

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!expenseType || !user) return

    const transactionCount = calculateTransactionCount(expenseType, 
      expenseType === 'recurrent' ? recurrentFormData : nonRecurrentFormData
    )

    const formData = expenseType === 'recurrent' ? recurrentFormData : nonRecurrentFormData
    const period = expenseType === 'recurrent' 
      ? `${months[recurrentFormData.month_from - 1]} ${recurrentFormData.year_from} to ${months[recurrentFormData.month_to - 1]} ${recurrentFormData.year_to}`
      : `${months[nonRecurrentFormData.month - 1]} ${nonRecurrentFormData.year}`

    // Show confirmation dialog
    setConfirmationData({
      type: expenseType,
      description: formData.description,
      value: formData.value,
      transactionCount,
      period
    })
    setShowConfirmation(true)
  }

  const handleConfirmSubmit = async () => {
    if (!confirmationData || !expenseType || !user) return

    setError(null)
    setLoading(true)

    try {
      if (expenseType === 'recurrent') {
        const recurrentData = {
          user_id: user.id,
          description: recurrentFormData.description,
          month_from: recurrentFormData.month_from,
          month_to: recurrentFormData.month_to,
          year_from: recurrentFormData.year_from,
          year_to: recurrentFormData.year_to,
          value: Number(recurrentFormData.value),
          payment_day_deadline: recurrentFormData.payment_day_deadline ? Number(recurrentFormData.payment_day_deadline) : null
        }

        const { data, error } = await supabase
          .from('recurrent_expenses')
          .insert([recurrentData])
          .select()

        if (error) {
          console.error('Supabase error (recurrent):', error)
          setError(`Error al guardar gasto recurrente: ${error.message}`)
          throw error
        }

        console.log('Recurrent expense saved:', data)
      } else {
        const nonRecurrentData = {
          user_id: user.id,
          description: nonRecurrentFormData.description,
          year: nonRecurrentFormData.year,
          month: nonRecurrentFormData.month,
          value: Number(nonRecurrentFormData.value),
          payment_deadline: nonRecurrentFormData.payment_deadline || null
        }

        const { data, error } = await supabase
          .from('non_recurrent_expenses')
          .insert([nonRecurrentData])
          .select()

        if (error) {
          console.error('Supabase error (non-recurrent):', error)
          setError(`Error al guardar gasto no recurrente: ${error.message}`)
          throw error
        }

        console.log('Non-recurrent expense saved:', data)
      }

      // Reset form and close dialogs
      resetForm()
      setShowConfirmation(false)
      setConfirmationData(null)
      
      // Trigger global data refresh using the new system
      console.log('🔄 Triggering global data refresh after expense creation')
      refreshData(user.id, 'create_expense')
      
    } catch (error) {
      console.error('Error saving expense:', error)
      setError(`Error al guardar gasto: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setExpenseType(null)
    setShowForm(false)
    setRecurrentFormData({
      description: '',
      month_from: 1,
      month_to: 12,
      year_from: new Date().getFullYear(),
      year_to: new Date().getFullYear(),
      value: 0,
      payment_day_deadline: ''
    })
    setNonRecurrentFormData({
      description: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      value: 0,
      payment_deadline: ''
    })
  }

  const handleViewChange = async (view: 'dashboard' | 'general-dashboard' | 'debug') => {
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
    setShowForm(true)
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

      {/* Expense Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold">{texts.addTransaction}</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {!expenseType ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Selecciona el tipo de gasto que quieres agregar:</p>
                
                <button
                  onClick={() => setExpenseType('recurrent')}
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <Repeat className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{texts.recurrent}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Gastos que se repiten mensualmente (arriendo, servicios, suscripciones)</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setExpenseType('non_recurrent')}
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{texts.nonRecurrent}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Gastos únicos (reparaciones, médicos, compras especiales)</p>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setExpenseType(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ← Volver a selección de tipo
                  </button>
                </div>

                {expenseType === 'recurrent' ? (
                  // Recurrent Expense Form
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{texts.description}</label>
                      <input
                        type="text"
                        value={recurrentFormData.description}
                        onChange={(e) => setRecurrentFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde Mes</label>
                        <select
                          value={recurrentFormData.month_from}
                          onChange={(e) => setRecurrentFormData(prev => ({ ...prev, month_from: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta Mes</label>
                        <select
                          value={recurrentFormData.month_to}
                          onChange={(e) => setRecurrentFormData(prev => ({ ...prev, month_to: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde Año</label>
                        <select
                          value={recurrentFormData.year_from}
                          onChange={(e) => setRecurrentFormData(prev => ({ ...prev, year_from: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta Año</label>
                        <select
                          value={recurrentFormData.year_to}
                          onChange={(e) => setRecurrentFormData(prev => ({ ...prev, year_to: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{texts.amount} ($)</label>
                        <input
                          type="text"
                          value={getCurrencyInputValue(recurrentFormData.value)}
                          onChange={(e) => setRecurrentFormData(prev => ({ 
                            ...prev, 
                            value: parseCurrency(e.target.value)
                          }))}
                          placeholder="$1,200.00"
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Día de Pago (1-31)</label>
                        <input
                          type="text"
                          value={recurrentFormData.payment_day_deadline}
                          onChange={(e) => setRecurrentFormData(prev => ({ ...prev, payment_day_deadline: e.target.value }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Non-Recurrent Expense Form
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{texts.description}</label>
                      <input
                        type="text"
                        value={nonRecurrentFormData.description}
                        onChange={(e) => setNonRecurrentFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{texts.month}</label>
                        <select
                          value={nonRecurrentFormData.month}
                          onChange={(e) => setNonRecurrentFormData(prev => ({ ...prev, month: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{texts.date}</label>
                        <select
                          value={nonRecurrentFormData.year}
                          onChange={(e) => setNonRecurrentFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{texts.amount} ($)</label>
                        <input
                          type="text"
                          value={getCurrencyInputValue(nonRecurrentFormData.value)}
                          onChange={(e) => setNonRecurrentFormData(prev => ({ 
                            ...prev, 
                            value: parseCurrency(e.target.value)
                          }))}
                          placeholder="$500.00"
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          value={nonRecurrentFormData.payment_deadline}
                          onChange={(e) => setNonRecurrentFormData(prev => ({ ...prev, payment_deadline: e.target.value }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    {texts.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Continuar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Confirmar Agregar Gasto</h3>
            
            <div className="space-y-3 mb-6">
              <div>
                <span className="font-medium">Tipo:</span> {confirmationData.type === 'recurrent' ? texts.recurrent : texts.nonRecurrent}
              </div>
              <div>
                <span className="font-medium">{texts.description}:</span> {confirmationData.description}
              </div>
              <div>
                <span className="font-medium">{texts.amount}:</span> {formatCurrency(confirmationData.value)}
              </div>
              <div>
                <span className="font-medium">Período:</span> {confirmationData.period}
              </div>
              <div className="bg-blue-50 p-3 rounded-md">
                <span className="font-medium text-blue-800">
                  Esto creará {confirmationData.transactionCount} registro{confirmationData.transactionCount !== 1 ? 's' : ''} en la tabla de transacciones.
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  setConfirmationData(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                {texts.cancel}
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Agregando...' : 'Confirmar y Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 