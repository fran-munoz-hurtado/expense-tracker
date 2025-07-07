'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, measureQueryPerformance } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useSearchParams } from 'next/navigation'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

interface GeneralDashboardViewProps {
  onNavigateToMonth: (month: number, year: number) => void
  user: User
  navigationParams?: { year?: number } | null
}

export default function GeneralDashboardView({ onNavigateToMonth, user, navigationParams }: GeneralDashboardViewProps) {
  const searchParams = useSearchParams()
  const { refreshData } = useDataSync()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set())
  const [monthlyData, setMonthlyData] = useState<Record<number, {
    transactions: Transaction[]
    recurrent: number
    nonRecurrent: number
    total: number
    paid: number
    pending: number
    overdue: number
  }>>({})

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteModalData, setDeleteModalData] = useState<{
    transactionId: number
    transaction: Transaction
    isRecurrent: boolean
  } | null>(null)

  // Modify modal state
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [modifyModalData, setModifyModalData] = useState<{
    transactionId: number
    transaction: Transaction
    isRecurrent: boolean
    modifySeries: boolean
  } | null>(null)

  // Modify form state
  const [showModifyForm, setShowModifyForm] = useState(false)
  const [modifyFormData, setModifyFormData] = useState<{
    type: ExpenseType
    description: string
    month_from: number
    month_to: number
    year_from: number
    year_to: number
    value: number
    payment_day_deadline: string
    month: number
    year: number
    payment_deadline: string
    originalId?: number
    modifySeries?: boolean
  } | null>(null)

  // Modify confirmation state
  const [showModifyConfirmation, setShowModifyConfirmation] = useState(false)
  const [modifyConfirmationData, setModifyConfirmationData] = useState<{
    type: ExpenseType
    description: string
    value: number
    period: string
    action: string
  } | null>(null)

  // Sync with URL parameters
  useEffect(() => {
    const yearFromUrl = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    if (yearFromUrl && yearFromUrl !== selectedYear) {
      setSelectedYear(yearFromUrl)
    }
  }, [searchParams])

  // Remove the problematic useEffect that was causing navigation cycles
  // The parent component (app/page.tsx) now handles URL updates through the navigation service

  // Use the new data synchronization system - only depend on dataVersion and lastOperation
  useDataSyncEffect(() => {
    console.log('🔄 GeneralDashboardView: Data sync triggered, refetching data')
    console.log('🔄 GeneralDashboardView: Current user:', user.id)
    console.log('🔄 GeneralDashboardView: Current selectedYear:', selectedYear)
    fetchMonthlyData()
  }, []) // Empty dependency array to avoid conflicts

  // Separate effect for user and selectedYear changes
  useEffect(() => {
    console.log('🔄 GeneralDashboardView: User or selectedYear changed, refetching data')
    fetchMonthlyData()
  }, [user, selectedYear])

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const monthAbbreviations = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
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

  const fetchMonthlyData = async () => {
    try {
      console.log('🔄 GeneralDashboardView: fetchMonthlyData started')
      setError(null)
      setLoading(true)
      
      // Use optimized data fetching with performance monitoring
      const result = await measureQueryPerformance(
        'fetchGeneralDashboardData',
        async () => {
          const [transactions, expenses] = await Promise.all([
            fetchUserTransactions(user, undefined, selectedYear),
            fetchUserExpenses(user)
          ])
          
          return { transactions, expenses }
        }
      )

      console.log('🔄 GeneralDashboardView: Data fetched successfully')
      console.log('🔄 GeneralDashboardView: Transactions count:', result.transactions.length)
      console.log('🔄 GeneralDashboardView: Recurrent expenses count:', result.expenses.recurrent.length)
      console.log('🔄 GeneralDashboardView: Non-recurrent expenses count:', result.expenses.nonRecurrent.length)

      setTransactions(result.transactions)
      setRecurrentExpenses(result.expenses.recurrent)
      setNonRecurrentExpenses(result.expenses.nonRecurrent)

      // Process monthly data with proper separation of recurrent and non-recurrent
      const monthlyStats: Record<number, {
        transactions: Transaction[]
        recurrent: number
        nonRecurrent: number
        total: number
        paid: number
        pending: number
        overdue: number
      }> = {}

      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        const monthTransactions = result.transactions.filter((t: Transaction) => t.month === month)
        
        // Separate recurrent and non-recurrent expenses
        const recurrentTransactions = monthTransactions.filter((t: Transaction) => t.source_type === 'recurrent')
        const nonRecurrentTransactions = monthTransactions.filter((t: Transaction) => t.source_type === 'non_recurrent')
        
        const recurrentTotal = recurrentTransactions.reduce((sum: number, t: Transaction) => sum + t.value, 0)
        const nonRecurrentTotal = nonRecurrentTransactions.reduce((sum: number, t: Transaction) => sum + t.value, 0)
        const total = recurrentTotal + nonRecurrentTotal
        
        const paid = monthTransactions.filter((t: Transaction) => t.status === 'paid').reduce((sum: number, t: Transaction) => sum + t.value, 0)
        const pending = monthTransactions.filter((t: Transaction) => {
          if (t.status !== 'pending') return false
          if (!t.deadline) return true
          return new Date(t.deadline) >= new Date()
        }).reduce((sum: number, t: Transaction) => sum + t.value, 0)
        const overdue = monthTransactions.filter((t: Transaction) => {
          if (t.status !== 'pending') return false
          if (!t.deadline) return false
          return new Date(t.deadline) < new Date()
        }).reduce((sum: number, t: Transaction) => sum + t.value, 0)

        monthlyStats[month] = {
          transactions: monthTransactions,
          recurrent: recurrentTotal,
          nonRecurrent: nonRecurrentTotal,
          total,
          paid,
          pending,
          overdue
        }
      }

      setMonthlyData(monthlyStats)

      // Log some sample percentages for debugging
      console.log('🔄 GeneralDashboardView: Monthly data calculated')
      Object.entries(monthlyStats).forEach(([month, data]) => {
        if (data.total > 0) {
          // Calculate how much of each type is paid
          const recurrentPaid = data.transactions
            .filter((t: Transaction) => t.source_type === 'recurrent' && t.status === 'paid')
            .reduce((sum: number, t: Transaction) => sum + t.value, 0)
          
          const nonRecurrentPaid = data.transactions
            .filter((t: Transaction) => t.source_type === 'non_recurrent' && t.status === 'paid')
            .reduce((sum: number, t: Transaction) => sum + t.value, 0)
          
          const recurrentPercentage = calculatePercentage(recurrentPaid, data.recurrent)
          const nonRecurrentPercentage = calculatePercentage(nonRecurrentPaid, data.nonRecurrent)
          const totalPercentage = calculatePercentage(data.paid, data.total)
          console.log(`🔄 Month ${month}: Recurrent ${recurrentPercentage}%, NonRecurrent ${nonRecurrentPercentage}%, Total ${totalPercentage}%`)
        }
      })

    } catch (error) {
      console.error('❌ Error in fetchMonthlyData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  function getPercentageColor(percentage: number): string {
    if (percentage === 100) return 'text-green-600'
    return 'text-gray-400'
  }

  function calculatePercentage(paid: number, total: number): number {
    if (total === 0) return 0
    return Math.round((paid / total) * 100)
  }

  // Helper function to calculate the correct percentage for each expense type
  function calculateExpenseTypePercentage(data: any, expenseType: 'recurrent' | 'non_recurrent'): number {
    const typePaid = data.transactions
      .filter((t: Transaction) => t.source_type === expenseType && t.status === 'paid')
      .reduce((sum: number, t: Transaction) => sum + t.value, 0)
    
    const typeTotal = expenseType === 'recurrent' ? data.recurrent : data.nonRecurrent
    
    return calculatePercentage(typePaid, typeTotal)
  }

  // Delete transaction functions
  const handleDeleteTransaction = (transaction: Transaction) => {
    setDeleteModalData({
      transactionId: transaction.id,
      transaction,
      isRecurrent: transaction.source_type === 'recurrent'
    })
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async (deleteSeries: boolean = false) => {
    if (!deleteModalData) return

    const { transactionId, transaction } = deleteModalData

    try {
      setLoading(true)
      setError(null)

      if (transaction.source_type === 'recurrent' && deleteSeries) {
        // Delete the entire recurrent series
        const { error } = await supabase
          .from('recurrent_expenses')
          .delete()
          .eq('id', transaction.source_id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Delete only this transaction
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId)
          .eq('user_id', user.id)

        if (error) throw error
      }

      // Trigger global data refresh using the new system
      console.log('🔄 Triggering global data refresh after deletion')
      refreshData(user.id, 'delete_transaction')
      
    } catch (error) {
      console.error('Error deleting:', error)
      setError(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
      setDeleteModalData(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteModalData(null)
  }

  // Modify transaction functions
  const handleModifyTransaction = (transaction: Transaction) => {
    setModifyModalData({
      transactionId: transaction.id,
      transaction,
      isRecurrent: transaction.source_type === 'recurrent',
      modifySeries: false
    })
    setShowModifyModal(true)
  }

  const handleConfirmModify = async (modifySeries: boolean) => {
    if (!modifyModalData) return

    const { transaction } = modifyModalData

    try {
      if (transaction.source_type === 'recurrent' && modifySeries) {
        // Get the original recurrent expense data
        const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
        if (!recurrentExpense) {
          setError('Original recurrent expense not found')
          return
        }

        // Set up form data for editing the entire series
        setModifyFormData({
          type: 'recurrent',
          description: recurrentExpense.description,
          month_from: recurrentExpense.month_from,
          month_to: recurrentExpense.month_to,
          year_from: recurrentExpense.year_from,
          year_to: recurrentExpense.year_to,
          value: recurrentExpense.value,
          payment_day_deadline: recurrentExpense.payment_day_deadline?.toString() || '',
          month: 1,
          year: 2025,
          payment_deadline: '',
          originalId: recurrentExpense.id,
          modifySeries: true
        })
      } else {
        // Set up form data for editing individual transaction
        if (transaction.source_type === 'recurrent') {
          const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
          if (!recurrentExpense) {
            setError('Original recurrent expense not found')
            return
          }

          setModifyFormData({
            type: 'recurrent',
            description: recurrentExpense.description,
            month_from: transaction.month,
            month_to: transaction.month,
            year_from: transaction.year,
            year_to: transaction.year,
            value: transaction.value,
            payment_day_deadline: recurrentExpense.payment_day_deadline?.toString() || '',
            month: transaction.month,
            year: transaction.year,
            payment_deadline: transaction.deadline || '',
            originalId: transaction.id,
            modifySeries: false
          })
        } else {
          const nonRecurrentExpense = nonRecurrentExpenses.find(nre => nre.id === transaction.source_id)
          if (!nonRecurrentExpense) {
            setError('Original non-recurrent expense not found')
            return
          }

          setModifyFormData({
            type: 'non_recurrent',
            description: nonRecurrentExpense.description,
            month_from: 1,
            month_to: 12,
            year_from: 2025,
            year_to: 2025,
            value: nonRecurrentExpense.value,
            payment_day_deadline: '',
            month: nonRecurrentExpense.month,
            year: nonRecurrentExpense.year,
            payment_deadline: nonRecurrentExpense.payment_deadline || '',
            originalId: nonRecurrentExpense.id,
            modifySeries: false
          })
        }
      }

      setShowModifyModal(false)
      setModifyModalData(null)
      setShowModifyForm(true)

    } catch (error) {
      console.error('Error setting up modify form:', error)
      setError(`Error al preparar modificación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleModifyFormSubmit = async (formData: any) => {
    setModifyFormData(formData)
    
    // Show confirmation modal
    const action = formData.modifySeries ? 'modificar toda la serie' : 'modificar esta transacción'
    const period = formData.type === 'recurrent' && formData.modifySeries 
      ? `${months[formData.month_from - 1]} ${formData.year_from} - ${months[formData.month_to - 1]} ${formData.year_to}`
      : `${months[formData.month - 1]} ${formData.year}`

    setModifyConfirmationData({
      type: formData.type,
      description: formData.description,
      value: Number(formData.value),
      period,
      action
    })
    setShowModifyConfirmation(true)
    setShowModifyForm(false)
  }

  const handleConfirmModifySubmit = async () => {
    if (!modifyConfirmationData || !modifyFormData) return

    setError(null)
    setLoading(true)

    try {
      if (modifyFormData.type === 'recurrent') {
        const recurrentData = {
          description: modifyFormData.description,
          month_from: modifyFormData.month_from,
          month_to: modifyFormData.month_to,
          year_from: modifyFormData.year_from,
          year_to: modifyFormData.year_to,
          value: Number(modifyFormData.value),
          payment_day_deadline: modifyFormData.payment_day_deadline ? Number(modifyFormData.payment_day_deadline) : null
        }

        if (modifyFormData.modifySeries && modifyFormData.originalId) {
          // Update the entire series
          const { error } = await supabase
            .from('recurrent_expenses')
            .update(recurrentData)
            .eq('id', modifyFormData.originalId)
            .eq('user_id', user.id)

          if (error) throw error
        } else {
          // Update individual transaction
          const { error } = await supabase
            .from('transactions')
            .update({
              description: modifyFormData.description,
              value: Number(modifyFormData.value),
              deadline: modifyFormData.payment_deadline || null
            })
            .eq('id', modifyFormData.originalId)
            .eq('user_id', user.id)

          if (error) throw error
        }
      } else if (modifyFormData.type === 'non_recurrent') {
        // Update non-recurrent expense
        const { error } = await supabase
          .from('non_recurrent_expenses')
          .update({
            description: modifyFormData.description,
            month: modifyFormData.month,
            year: modifyFormData.year,
            value: Number(modifyFormData.value),
            payment_deadline: modifyFormData.payment_deadline || null
          })
          .eq('id', modifyFormData.originalId)
          .eq('user_id', user.id)

        if (error) throw error
      }

      // Trigger global data refresh using the new system
      console.log('🔄 Triggering global data refresh after modification')
      refreshData(user.id, 'modify_transaction')

    } catch (error) {
      console.error('Error modifying:', error)
      setError(`Error al modificar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
      setShowModifyConfirmation(false)
      setModifyConfirmationData(null)
      setShowModifyForm(false)
      setModifyFormData(null)
    }
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{texts.allExpenses}</h1>
        <p className="text-gray-600 mt-2">{texts.yearlySummary}</p>
      </div>
      <div className="mb-6 flex items-center gap-4">
        <label className="block text-sm font-medium text-gray-700 mr-2">{texts.date}</label>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.month}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.recurrent}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.nonRecurrent}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.totalBalance}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">{texts.loading}</td></tr>
            ) : (
              Object.entries(monthlyData).map(([monthStr, data]) => {
                const month = parseInt(monthStr)
                const totalAmount = data.total
                
                return (
                  <tr key={month}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => onNavigateToMonth(month, selectedYear)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {months[month - 1]}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-gray-900">{formatCurrency(data.recurrent)}</span>
                      <span className={`ml-2 text-xs ${getPercentageColor(calculateExpenseTypePercentage(data, 'recurrent'))} font-semibold`}>
                        ({calculateExpenseTypePercentage(data, 'recurrent')}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-gray-900">{formatCurrency(data.nonRecurrent)}</span>
                      <span className={`ml-2 text-xs ${getPercentageColor(calculateExpenseTypePercentage(data, 'non_recurrent'))} font-semibold`}>
                        ({calculateExpenseTypePercentage(data, 'non_recurrent')}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-gray-900 font-bold">{formatCurrency(totalAmount)}</span>
                      <span className={`ml-2 text-xs ${getPercentageColor(calculatePercentage(data.paid, totalAmount))} font-semibold`}>
                        ({calculatePercentage(data.paid, totalAmount)}%)
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">{texts.loading}</div>
        ) : (
          Object.entries(monthlyData).map(([monthStr, data]) => {
            const month = parseInt(monthStr)
            const totalAmount = data.total
            const paidPercentage = calculatePercentage(data.paid, totalAmount)
            
            return (
              <div key={month} className="bg-white rounded-lg shadow-sm border p-4 mobile-card">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => onNavigateToMonth(month, selectedYear)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                  >
                    {months[month - 1]}
                  </button>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
                    <div className={`text-sm ${getPercentageColor(paidPercentage)} font-semibold`}>
                      {paidPercentage}% {texts.paid}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{texts.recurrent}:</span>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{formatCurrency(data.recurrent)}</div>
                      <div className={`text-xs ${getPercentageColor(calculateExpenseTypePercentage(data, 'recurrent'))}`}>
                        {calculateExpenseTypePercentage(data, 'recurrent')}% {texts.paid}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{texts.nonRecurrent}:</span>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{formatCurrency(data.nonRecurrent)}</div>
                      <div className={`text-xs ${getPercentageColor(calculateExpenseTypePercentage(data, 'non_recurrent'))}`}>
                        {calculateExpenseTypePercentage(data, 'non_recurrent')}% {texts.paid}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Description:</span> {deleteModalData.transaction.description}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Value:</span> {formatCurrency(deleteModalData.transaction.value)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {deleteModalData.transaction.deadline ? (() => {
                    const [year, month, day] = deleteModalData.transaction.deadline!.split('-').map(Number);
                    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                  })() : `${months[deleteModalData.transaction.month - 1]} ${deleteModalData.transaction.year}`}
                </p>
              </div>

              {deleteModalData.isRecurrent ? (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium mb-2">This is a recurrent expense transaction.</p>
                  <p className="text-sm text-blue-700">Choose what you want to delete:</p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">Are you sure you want to delete this transaction?</p>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              {deleteModalData.isRecurrent ? (
                <>
                  <button
                    onClick={() => handleConfirmDelete(true)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete Entire Series (All Related Transactions)
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(false)}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Delete Only This Transaction
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmDelete(false)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete Transaction
                </button>
              )}
              
              <button
                onClick={handleCancelDelete}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Modal */}
      {showModifyModal && modifyModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Edit className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Modify Transaction</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Description:</span> {modifyModalData.transaction.description}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Value:</span> {formatCurrency(modifyModalData.transaction.value)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {modifyModalData.transaction.deadline ? (() => {
                    const [year, month, day] = modifyModalData.transaction.deadline!.split('-').map(Number);
                    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                  })() : `${months[modifyModalData.transaction.month - 1]} ${modifyModalData.transaction.year}`}
                </p>
              </div>

              {modifyModalData.isRecurrent ? (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium mb-2">This is a recurrent expense transaction.</p>
                  <p className="text-sm text-blue-700">Choose what you want to modify:</p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">Are you sure you want to modify this transaction?</p>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              {modifyModalData.isRecurrent ? (
                <>
                  <button
                    onClick={() => handleConfirmModify(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Modify Entire Series (All Related Transactions)
                  </button>
                  <button
                    onClick={() => handleConfirmModify(false)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Modify Only This Transaction
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmModify(false)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Modify Transaction
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowModifyModal(false)
                  setModifyModalData(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Confirmation Modal */}
      {showModifyConfirmation && modifyConfirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Modification</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Description:</span> {modifyConfirmationData.description}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Value:</span> {formatCurrency(modifyConfirmationData.value)}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Period:</span> {modifyConfirmationData.period}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Action:</span> {modifyConfirmationData.action}
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-sm text-yellow-800">Are you sure you want to proceed with this modification?</p>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <button
                onClick={handleConfirmModifySubmit}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Confirm Modification
              </button>
              
              <button
                onClick={() => {
                  setShowModifyConfirmation(false)
                  setModifyConfirmationData(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Form Modal */}
      {showModifyForm && modifyFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Edit className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Modify Transaction</h3>
              </div>
              <button
                onClick={() => {
                  setShowModifyForm(false)
                  setModifyFormData(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              handleModifyFormSubmit(modifyFormData)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={modifyFormData.description}
                    onChange={(e) => setModifyFormData({
                      ...modifyFormData,
                      description: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    value={modifyFormData.value}
                    onChange={(e) => setModifyFormData({
                      ...modifyFormData,
                      value: Number(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                {modifyFormData.type === 'recurrent' && modifyFormData.modifySeries && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          From Month
                        </label>
                        <select
                          value={modifyFormData.month_from}
                          onChange={(e) => setModifyFormData({
                            ...modifyFormData,
                            month_from: Number(e.target.value)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          To Month
                        </label>
                        <select
                          value={modifyFormData.month_to}
                          onChange={(e) => setModifyFormData({
                            ...modifyFormData,
                            month_to: Number(e.target.value)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          From Year
                        </label>
                        <input
                          type="number"
                          value={modifyFormData.year_from}
                          onChange={(e) => setModifyFormData({
                            ...modifyFormData,
                            year_from: Number(e.target.value)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          To Year
                        </label>
                        <input
                          type="number"
                          value={modifyFormData.year_to}
                          onChange={(e) => setModifyFormData({
                            ...modifyFormData,
                            year_to: Number(e.target.value)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {modifyFormData.type === 'non_recurrent' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                      </label>
                      <select
                        value={modifyFormData.month}
                        onChange={(e) => setModifyFormData({
                          ...modifyFormData,
                          month: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {months.map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        value={modifyFormData.year}
                        onChange={(e) => setModifyFormData({
                          ...modifyFormData,
                          year: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={modifyFormData.payment_deadline}
                    onChange={(e) => setModifyFormData({
                      ...modifyFormData,
                      payment_deadline: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModifyForm(false)
                    setModifyFormData(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 