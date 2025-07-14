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
  const [movementType, setMovementType] = useState<'expense' | 'income' | null>(null)
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
    payment_day_deadline: '',
    isgoal: false,
    category: ''
  })

  // Form data for non-recurrent expenses
  const [nonRecurrentFormData, setNonRecurrentFormData] = useState({
    description: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    value: 0,
    payment_deadline: '',
    category: ''
  })

  // Category management state
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategoriesForDelete, setSelectedCategoriesForDelete] = useState<string[]>([])
  const [categoryToModify, setCategoryToModify] = useState<string>('')
  const [modifyingCategory, setModifyingCategory] = useState<string>('')

  // Custom confirmation modals state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [confirmationModalData, setConfirmationModalData] = useState<{
    title: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
    confirmText?: string
    cancelText?: string
    type?: 'confirm' | 'prompt'
    inputValue?: string
    inputPlaceholder?: string
    onInputChange?: (value: string) => void
  } | null>(null)

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
  const availableYears = Array.from({ length: 16 }, (_, i) => 2025 + i)

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

  // Category management functions
  const getAvailableCategories = (): string[] => {
    // Get predefined categories (excluding 'Otros')
    const predefinedCategories = Object.values(CATEGORIES.EXPENSE)
      .filter(cat => cat !== 'Otros')
      .sort()
    
    // Combine with custom categories and sort
    const allCategories = [...predefinedCategories, ...customCategories].sort()
    
    // Always put 'Otros' first
    return ['Otros', ...allCategories]
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    
    // Clear custom input when switching away from "Otros"
    if (category !== 'Otros') {
      setCustomCategoryInput('')
    }
  }

  const handleCustomCategoryInputChange = (value: string) => {
    setCustomCategoryInput(value)
    
    // Update form data if "Otros" is selected
    if (selectedCategory === 'Otros') {
      if (expenseType === 'recurrent') {
        setRecurrentFormData(prev => ({ ...prev, category: value.trim() || 'sin categoría' }))
      } else {
        setNonRecurrentFormData(prev => ({ ...prev, category: value.trim() || 'sin categoría' }))
      }
    }
  }

  const handleAddCategory = (newCategory: string) => {
    if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
      setCustomCategories(prev => [...prev, newCategory.trim()].sort())
    }
  }

  const handleDeleteSelectedCategories = () => {
    setCustomCategories(prev => prev.filter(cat => !selectedCategoriesForDelete.includes(cat)))
    setSelectedCategoriesForDelete([])
  }

  const handleModifyCategory = (oldCategory: string, newCategory: string) => {
    if (newCategory.trim() && oldCategory !== newCategory.trim()) {
      setCustomCategories(prev => 
        prev.map(cat => cat === oldCategory ? newCategory.trim() : cat).sort()
      )
    }
  }

  const toggleCategorySelection = (category: string) => {
    setSelectedCategoriesForDelete(prev => 
      prev.includes(category) 
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    )
  }

  // Custom confirmation modal functions
  const showCustomConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirmar', cancelText = 'Cancelar') => {
    setConfirmationModalData({
      title,
      message,
      onConfirm,
      onCancel: () => {
        setShowConfirmationModal(false)
        setConfirmationModalData(null)
      },
      confirmText,
      cancelText,
      type: 'confirm'
    })
    setShowConfirmationModal(true)
  }

  const showCustomPrompt = (title: string, message: string, onConfirm: (value: string) => void, placeholder = '', initialValue = '') => {
    let inputValue = initialValue
    
    setConfirmationModalData({
      title,
      message,
      onConfirm: () => onConfirm(inputValue),
      onCancel: () => {
        setShowConfirmationModal(false)
        setConfirmationModalData(null)
      },
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      type: 'prompt',
      inputValue: initialValue,
      inputPlaceholder: placeholder,
      onInputChange: (value: string) => {
        inputValue = value
        setConfirmationModalData(prev => prev ? { ...prev, inputValue: value } : null)
      }
    })
    setShowConfirmationModal(true)
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
        // Determine final category value
        const finalCategory = (() => {
          if (selectedCategory === 'Otros' && customCategoryInput.trim()) {
            return customCategoryInput.trim()
          } else if (selectedCategory) {
            return selectedCategory
          } else {
            return 'sin categoría'
          }
        })()

        const recurrentData = {
          user_id: user.id,
          description: recurrentFormData.description,
          month_from: recurrentFormData.month_from,
          month_to: recurrentFormData.month_to,
          year_from: recurrentFormData.year_from,
          year_to: recurrentFormData.year_to,
          value: Number(recurrentFormData.value),
          payment_day_deadline: recurrentFormData.payment_day_deadline ? Number(recurrentFormData.payment_day_deadline) : null,
          type: movementType,
          isgoal: recurrentFormData.isgoal,
          category: finalCategory
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
        // Determine final category value
        const finalCategory = (() => {
          if (selectedCategory === 'Otros' && customCategoryInput.trim()) {
            return customCategoryInput.trim()
          } else if (selectedCategory) {
            return selectedCategory
          } else {
            return 'sin categoría'
          }
        })()

        const nonRecurrentData = {
          user_id: user.id,
          description: nonRecurrentFormData.description,
          year: nonRecurrentFormData.year,
          month: nonRecurrentFormData.month,
          value: Number(nonRecurrentFormData.value),
          payment_deadline: nonRecurrentFormData.payment_deadline || null,
          type: movementType,
          category: finalCategory
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

      // Add custom category to the list if "Otros" was selected and user typed something
      if (selectedCategory === 'Otros' && customCategoryInput.trim()) {
        handleAddCategory(customCategoryInput.trim())
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
      payment_day_deadline: '',
      isgoal: false,
      category: ''
    })
    setNonRecurrentFormData({
      description: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      value: 0,
      payment_deadline: '',
      category: ''
    })
    
    // Reset category state
    setSelectedCategory('')
    setCustomCategoryInput('')
    setShowCategoryModal(false)
    setSelectedCategoriesForDelete([])
    setCategoryToModify('')
    setModifyingCategory('')
    
    // Reset confirmation modal state
    setShowConfirmationModal(false)
    setConfirmationModalData(null)
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

      {/* Expense Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={resetForm}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Selección unificada de tipo de movimiento y tipo de recurrencia */}
            {!(movementType && expenseType) && (
              <div className="p-5 flex flex-col gap-4 items-center">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1" id="add-movement-title">{texts.addTransaction}</h2>
                <p className="text-gray-700 text-sm font-medium mb-1">Selecciona el tipo de movimiento y periodicidad</p>
                  {/* Toggle Gasto/Ingreso */}
                  <div className="flex w-full gap-0 rounded-lg overflow-hidden border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setMovementType('expense')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold transition-all
                        ${movementType === 'expense' ? 'bg-red-100 text-red-700 border-r border-red-400 shadow-inner' : 'bg-white text-gray-700 hover:bg-red-50 border-r border-gray-200'}`}
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white font-bold text-xs">-</span>
                      Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementType('income')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold transition-all
                        ${movementType === 'income' ? 'bg-green-100 text-green-700 shadow-inner' : 'bg-white text-gray-700 hover:bg-green-50'}`}
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white font-bold text-xs">+</span>
                      Ingreso
                    </button>
                  </div>
                  {/* Toggle Recurrente/Único */}
                  <div className="flex w-full gap-0 rounded-lg overflow-hidden border border-gray-200 bg-white mt-2">
                    <button
                      type="button"
                      onClick={() => setExpenseType('recurrent')}
                      className={`flex-1 py-2 px-4 text-sm font-semibold transition-all
                        ${expenseType === 'recurrent' ? 'bg-blue-600 text-white shadow-inner' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                      disabled={!movementType}
                    >
                      Recurrente
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseType('non_recurrent')}
                      className={`flex-1 py-2 px-4 text-sm font-semibold transition-all
                        ${expenseType === 'non_recurrent' ? 'bg-blue-600 text-white shadow-inner' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                      disabled={!movementType}
                    >
                      Único
                    </button>
                  </div>
                  <div className="flex justify-center mt-2">
                    {(movementType || expenseType) && (
                      <button
                        type="button"
                        onClick={() => { setMovementType(null); setExpenseType(null); }}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        ← Cambiar selección
                      </button>
                    )}
                  </div>
                </div>
            )}

            {expenseType && movementType && (
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-6 p-6 sm:p-8 bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
                    onClick={() => setExpenseType(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none focus:underline"
                  >
                    ← Volver a selección
                  </button>
                </div>

                {/* Descripción */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">{texts.description}</label>
                  <input
                    type="text"
                    value={expenseType === 'recurrent' ? recurrentFormData.description : nonRecurrentFormData.description}
                    onChange={(e) => expenseType === 'recurrent'
                      ? setRecurrentFormData(prev => ({ ...prev, description: e.target.value }))
                      : setNonRecurrentFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                    placeholder="Descripción"
                    required
                  />
                </div>

                {/* Categoría - Solo para gastos */}
                {movementType === 'expense' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Categoría</label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        editar categorías
                      </button>
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                    >
                      <option value="">Seleccionar categoría</option>
                      {getAvailableCategories().map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    
                    {/* Input personalizado para "Otros" */}
                    {selectedCategory === 'Otros' && (
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => handleCustomCategoryInputChange(e.target.value)}
                        placeholder="Escriba la categoría personalizada"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                      />
                    )}
                  </div>
                )}

                {/* Mes y Año */}
                {expenseType === 'recurrent' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4">
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Mes desde</label>
                        <select
                          value={recurrentFormData.month_from}
                          onChange={e => setRecurrentFormData(prev => ({ ...prev, month_from: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Año desde</label>
                        <select
                          value={recurrentFormData.year_from}
                          onChange={e => setRecurrentFormData(prev => ({ ...prev, year_from: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Mes hasta</label>
                        <select
                          value={recurrentFormData.month_to}
                          onChange={e => setRecurrentFormData(prev => ({ ...prev, month_to: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Año hasta</label>
                        <select
                          value={recurrentFormData.year_to}
                          onChange={e => setRecurrentFormData(prev => ({ ...prev, year_to: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">{texts.month}</label>
                      <select
                        value={nonRecurrentFormData.month}
                        onChange={e => setNonRecurrentFormData(prev => ({ ...prev, month: Number(e.target.value) }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                        required
                      >
                        {months.map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">{texts.date}</label>
                      <select
                        value={nonRecurrentFormData.year}
                        onChange={e => setNonRecurrentFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                        required
                      >
                        {availableYears.map((year, index) => (
                          <option key={index} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Monto y Día de Vencimiento para recurrente */}
                {expenseType === 'recurrent' ? (
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">{texts.amount} ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(recurrentFormData.value)}
                        onChange={e => setRecurrentFormData(prev => ({ ...prev, value: parseCurrency(e.target.value) }))}
                        placeholder="$0.00"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                        required
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Día de Vencimiento (1-31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={recurrentFormData.payment_day_deadline}
                        onChange={e => setRecurrentFormData(prev => ({ ...prev, payment_day_deadline: e.target.value }))}
                        placeholder="15"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">{texts.amount} ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(nonRecurrentFormData.value)}
                        onChange={(e) => setNonRecurrentFormData(prev => ({ ...prev, value: parseCurrency(e.target.value) }))}
                        placeholder="$0.00"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                        required
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        {texts.date}
                      </label>
                      <input
                        type="date"
                        value={nonRecurrentFormData.payment_deadline}
                        onChange={(e) => setNonRecurrentFormData(prev => ({ ...prev, payment_deadline: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                      />
                    </div>
                  </div>
                )}

                {/* Checkbox de meta (isgoal) solo para GASTO/RECURRENTE */}
                {movementType === 'expense' && expenseType === 'recurrent' && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-2 shadow-sm">
                    <input
                      id="isgoal-checkbox"
                      type="checkbox"
                      checked={recurrentFormData.isgoal || false}
                      onChange={e => setRecurrentFormData(prev => ({ ...prev, isgoal: e.target.checked }))}
                      className="accent-blue-600 w-5 h-5 rounded-lg border-2 border-blue-400 focus:ring-2 focus:ring-blue-300 transition-all shadow-sm"
                    />
                    <label htmlFor="isgoal-checkbox" className="flex-1 text-sm text-blue-900 font-medium select-none cursor-pointer">
                      ¿Este gasto recurrente es una <span className="font-bold text-blue-700">meta</span> que quieres cumplir?<br />
                      <span className="text-xs text-blue-700 font-normal">Ejemplo: pagar un carro, un viaje, un crédito, etc. Marca esta opción si este gasto es un objetivo personal que estás pagando mes a mes.</span>
                    </label>
                  </div>
                )}

                {/* Botones */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  >
                    {texts.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    Continuar
                  </button>
                </div>
              </form>
            )}
          </section>
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

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Gestionar Categorías</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Add Category Section */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Añadir nueva categoría</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryToModify}
                  onChange={(e) => setCategoryToModify(e.target.value)}
                  placeholder="Nombre de la categoría"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      showCustomConfirm(
                        'Confirmar agregar categoría',
                        `¿Está seguro de que desea añadir la categoría "${categoryToModify}"?`,
                        () => {
                          handleAddCategory(categoryToModify)
                          setCategoryToModify('')
                          setShowConfirmationModal(false)
                          setConfirmationModalData(null)
                        }
                      )
                    }
                  }}
                />
                <button
                  onClick={() => {
                    showCustomConfirm(
                      'Confirmar agregar categoría',
                      `¿Está seguro de que desea añadir la categoría "${categoryToModify}"?`,
                      () => {
                        handleAddCategory(categoryToModify)
                        setCategoryToModify('')
                        setShowConfirmationModal(false)
                        setConfirmationModalData(null)
                      }
                    )
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Añadir
                </button>
              </div>
            </div>

            {/* Custom Categories List */}
            {customCategories.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Categorías personalizadas</h4>
                
                {/* Texto explicativo full width */}
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-700 font-medium text-center">
                    💡 <span className="font-semibold">Instrucciones:</span> Haz clic en las categorías que quieres modificar o eliminar. Las seleccionadas aparecerán con fondo azul.
                  </p>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {customCategories.map((category) => (
                    <div
                      key={category}
                      onClick={() => toggleCategorySelection(category)}
                      className={`cursor-pointer p-2 rounded-lg transition-all ${
                        selectedCategoriesForDelete.includes(category)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {category}
                    </div>
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {selectedCategoriesForDelete.length > 0 && (
                    <button
                      onClick={() => {
                        showCustomConfirm(
                          'Confirmar eliminación',
                          `¿Está seguro de que desea eliminar ${selectedCategoriesForDelete.length} categoría${selectedCategoriesForDelete.length !== 1 ? 's' : ''}?\n\nCategorías a eliminar: ${selectedCategoriesForDelete.join(', ')}`,
                          () => {
                            handleDeleteSelectedCategories()
                            setShowConfirmationModal(false)
                            setConfirmationModalData(null)
                          },
                          'Eliminar',
                          'Cancelar'
                        )
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm"
                    >
                      Eliminar ({selectedCategoriesForDelete.length})
                    </button>
                  )}
                  
                  {selectedCategoriesForDelete.length === 1 && (
                    <button
                      onClick={() => {
                        const categoryToEdit = selectedCategoriesForDelete[0]
                        showCustomPrompt(
                          'Modificar categoría',
                          `Ingrese el nuevo nombre para la categoría "${categoryToEdit}":`,
                          (newName: string) => {
                            if (newName && newName.trim() && newName.trim() !== categoryToEdit) {
                              showCustomConfirm(
                                'Confirmar modificación',
                                `¿Está seguro de que desea cambiar "${categoryToEdit}" a "${newName.trim()}"?`,
                                () => {
                                  handleModifyCategory(categoryToEdit, newName.trim())
                                  setSelectedCategoriesForDelete([])
                                  setShowConfirmationModal(false)
                                  setConfirmationModalData(null)
                                }
                              )
                            } else {
                              setShowConfirmationModal(false)
                              setConfirmationModalData(null)
                            }
                          },
                          'Nuevo nombre de la categoría',
                          categoryToEdit
                        )
                      }}
                      className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all text-sm"
                    >
                      Modificar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmationModal && confirmationModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{confirmationModalData.title}</h3>
              <button
                onClick={() => {
                  setShowConfirmationModal(false)
                  setConfirmationModalData(null)
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {confirmationModalData.message}
              </p>
              
              {confirmationModalData.type === 'prompt' && (
                <input
                  type="text"
                  value={confirmationModalData.inputValue || ''}
                  onChange={(e) => confirmationModalData.onInputChange?.(e.target.value)}
                  placeholder={confirmationModalData.inputPlaceholder}
                  className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  confirmationModalData.onCancel?.()
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                {confirmationModalData.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => {
                  confirmationModalData.onConfirm()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                {confirmationModalData.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 