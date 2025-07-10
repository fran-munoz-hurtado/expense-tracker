'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, measureQueryPerformance } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useSearchParams } from 'next/navigation'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'
import { getMonthlyColumnStats, getPercentage, type ColumnType } from '@/lib/utils/dashboardTable'
import { getColor, getGradient } from '@/lib/config/colors'

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
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [monthlyData, setMonthlyData] = useState<Record<number, {
    transactions: Transaction[]
    recurrent: number
    nonRecurrent: number
    total: number
    paid: number
    pending: number
    overdue: number
    income: number
    incomePaid: number
    incomePending: number
    incomeOverdue: number
  }>>({})

  // Helper function to compare dates without time
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

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
  const availableYears = Array.from({ length: 16 }, (_, i) => 2025 + i)

  // Get current month and year for highlighting
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11, we need 1-12
  const currentYear = currentDate.getFullYear()

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
          // Get all transactions for the year at once, then process by month
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
        income: number
        incomePaid: number
        incomePending: number
        incomeOverdue: number
      }> = {}

      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        // Get all transactions for the month
        const monthTransactions = result.transactions.filter((t: Transaction) => t.month === month)
        
        // Use helpers to get stats for each column type
        const recurrentStats = getMonthlyColumnStats(monthTransactions, 'recurrent', isDateOverdue)
        const nonRecurrentStats = getMonthlyColumnStats(monthTransactions, 'non_recurrent', isDateOverdue)
        const incomeStats = getMonthlyColumnStats(monthTransactions, 'income', isDateOverdue)
        const totalStats = getMonthlyColumnStats(monthTransactions, 'total', isDateOverdue)

        monthlyStats[month] = {
          transactions: monthTransactions.filter((t: Transaction) => t.type === 'expense'),
          recurrent: recurrentStats.total,
          nonRecurrent: nonRecurrentStats.total,
          total: totalStats.total,
          paid: totalStats.paid,
          pending: totalStats.pending,
          overdue: totalStats.overdue,
          income: incomeStats.total,
          incomePaid: incomeStats.paid,
          incomePending: incomeStats.pending,
          incomeOverdue: incomeStats.overdue
        }
      }

      setMonthlyData(monthlyStats)

      // Log detailed debugging information
      console.log('🔄 GeneralDashboardView: Monthly data calculated')
      console.log('🔄 GeneralDashboardView: Total transactions for year:', result.transactions.length)
      console.log('🔄 GeneralDashboardView: Transactions by type:', {
        expense: result.transactions.filter(t => t.type === 'expense').length,
        income: result.transactions.filter(t => t.type === 'income').length
      })
      
      Object.entries(monthlyStats).forEach(([month, data]) => {
        if (data.total > 0) {
          // Calculate how much of each type is paid
          const recurrentPaid = data.transactions
            .filter((t: Transaction) => t.source_type === 'recurrent' && t.status === 'paid')
            .reduce((sum: number, t: Transaction) => sum + t.value, 0)
          
          const nonRecurrentPaid = data.transactions
            .filter((t: Transaction) => t.source_type === 'non_recurrent' && t.status === 'paid')
            .reduce((sum: number, t: Transaction) => sum + t.value, 0)
          
          const recurrentPercentage = getPercentage(recurrentPaid, data.recurrent)
          const nonRecurrentPercentage = getPercentage(nonRecurrentPaid, data.nonRecurrent)
          const totalPercentage = getPercentage(data.paid, data.total)
          
          console.log(`🔄 Month ${month}: ${data.transactions.length} transactions, Total: ${formatCurrency(data.total)}, Recurrent: ${formatCurrency(data.recurrent)} (${recurrentPercentage}%), NonRecurrent: ${formatCurrency(data.nonRecurrent)} (${nonRecurrentPercentage}%), Overall: ${totalPercentage}%`)
        } else {
          console.log(`🔄 Month ${month}: No transactions`)
        }
      })

      // Log income statistics for debugging
      Object.entries(monthlyStats).forEach(([month, data]) => {
        if (data.income > 0) {
          const incomePercentage = calculateIncomePercentage(data)
          console.log(`🔄 Month ${month} Income: ${formatCurrency(data.income)} (${incomePercentage}% received)`)
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
    if (percentage === 0) return 'bg-gray-100 text-gray-600'
    if (percentage === 100) return 'bg-green-100 text-green-700'
    return 'bg-blue-100 text-blue-700'
  }

  // Helper function to calculate the correct percentage for each expense type
  function calculateExpenseTypePercentage(data: any, expenseType: 'recurrent' | 'non_recurrent'): number {
    const typePaid = data.transactions
      .filter((t: Transaction) => t.source_type === expenseType && t.status === 'paid')
      .reduce((sum: number, t: Transaction) => sum + t.value, 0)
    
    const typeTotal = expenseType === 'recurrent' ? data.recurrent : data.nonRecurrent
    
    return getPercentage(typePaid, typeTotal)
  }

  /**
   * Calculates the percentage of income transactions that have been paid for a given month.
   * Follows the same pattern as expense percentage calculations for consistency.
   * 
   * @param data - Monthly data object containing income statistics
   * @returns Percentage of income paid (0-100)
   */
  function calculateIncomePercentage(data: any): number {
    return getPercentage(data.incomePaid, data.income)
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
      {/* 1. Fancy header con explicación de porcentajes */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Filtro de año */}
          <div className="flex items-center gap-4">
            <label className="block text-sm font-medium text-gray-700 mr-2 flex items-center gap-1">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              Año
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={e => {
                  const newYear = Number(e.target.value)
                  setSelectedYear(newYear)
                }}
                className="appearance-none px-4 py-2 border border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-blue-700 font-semibold transition-all duration-150 hover:border-blue-400 cursor-pointer pr-8"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
              </span>
            </div>
          </div>
          {/* Botón de explicación de porcentajes */}
          <div className="flex-shrink-0">
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4m0-4h.01" />
                </svg>
                <span className="text-sm font-medium">¿Qué son los porcentajes?</span>
              </button>
              
              {/* Tooltip content */}
              <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-bold">💡</span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-2">¿Qué significan los porcentajes?</h3>
                    <div>
                      <span className="font-bold text-blue-700">🧾 <u>Gastos e ingresos</u>:</span><br />
                      <span>Indica <span className="font-bold text-blue-700">qué parte</span> de ese gasto o ingreso <span className="font-bold">ya está pagado o recibido</span>.</span><br />
                      <span className="text-gray-600">Ejemplo: <span className="font-bold text-blue-700">60%</span> en “Mensual” significa que ya pagaste el 60% de tus gastos mensuales.</span>
                    </div>
                    <div>
                      <span className="font-bold text-blue-700">💰 <u>CuantoQueda</u>:</span><br />
                      <span>Muestra <span className="font-bold text-blue-700">qué porcentaje</span> de tus ingresos <span className="font-bold">te queda libre</span> después de pagar todos tus gastos.</span><br />
                      <span className="text-gray-600">Ejemplo: <span className="font-bold text-blue-700">40%</span> significa que, tras pagar todo, te queda el 40% de lo que ganaste ese mes.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 2. Filtro de año más sofisticado */}
      {error && <div className="mb-4 text-red-600">{error}</div>}
      
      {/* 3. Fancy tabla con tooltips en porcentajes */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border overflow-x-auto" onMouseLeave={() => setHoveredRow(null)}>
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <colgroup>
            <col style={{ width: '110px' }} /> {/* Mes */}
            <col style={{ width: '150px' }} /> {/* Ingresos */}
            <col style={{ width: '110px' }} /> {/* Total */}
            <col style={{ width: '100px' }} /> {/* Mensual */}
            <col style={{ width: '100px' }} /> {/* Único */}
            <col style={{ width: '170px' }} /> {/* CuantoQueda */}
          </colgroup>
          <thead>
            {/* Header principal con agrupación visual */}
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider bg-blue-900 border-b-2 border-blue-700 shadow-sm" rowSpan={2} style={{borderLeft: '3px solid #1e40af', borderTopLeftRadius: '0.5rem'}}>
                {texts.month}
              </th>
              <th className={`px-6 py-3 text-center text-xs font-bold text-${getColor('income', 'text')} uppercase tracking-wider bg-gradient-to-r ${getGradient('income')} border-b border-${getColor('income', 'border')}`} rowSpan={2}>
                Ingresos
                <div className="mt-1">
                  <span className={`text-${getColor('income', 'primary')}`} title="Porcentaje de ingresos ya recibidos en el mes">%</span>
                </div>
              </th>
              <th className={`px-6 py-3 text-center text-xs font-bold text-${getColor('expense', 'text')} uppercase tracking-wider bg-gradient-to-r ${getGradient('expense')} border-b border-${getColor('expense', 'border')}`} colSpan={3}>
                Gastos
                <div className={`mt-1 text-${getColor('expense', 'primary')}`} title="Desglose de gastos mensuales y únicos">
                  <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border-b border-blue-200" style={{ minWidth: '200px', whiteSpace: 'nowrap' }} rowSpan={2}>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  CuantoQueda
                </span>
                <div className="mt-1 text-blue-500 text-xs" title="Diferencia entre ingresos y gastos totales">
                  Balance mensual
                </div>
              </th>
            </tr>
            {/* Sub-header para las columnas de gastos */}
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-bold text-${getColor('expense', 'text')} uppercase tracking-wider bg-gradient-to-r ${getGradient('expense')} border-b border-${getColor('expense', 'border')}`}>
                Total
                <span className={`ml-1 text-${getColor('expense', 'primary')}`} title="Porcentaje del total de gastos ya pagados en el mes">%</span>
              </th>
              <th className={`px-6 py-3 text-left text-xs font-bold text-${getColor('expense', 'text')} uppercase tracking-wider bg-gradient-to-r ${getGradient('expense')} border-b border-${getColor('expense', 'border')}`}>
                {texts.recurrent}
                <span className={`ml-1 text-${getColor('expense', 'primary')}`} title="Porcentaje de gastos mensuales ya pagados en el mes">%</span>
              </th>
              <th className={`px-6 py-3 text-left text-xs font-bold text-${getColor('expense', 'text')} uppercase tracking-wider bg-gradient-to-r ${getGradient('expense')} border-b border-${getColor('expense', 'border')}`}>
                {texts.nonRecurrent}
                <span className={`ml-1 text-${getColor('expense', 'primary')}`} title="Porcentaje de gastos únicos ya pagados en el mes">%</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400 animate-pulse">{texts.loading}</td></tr>
            ) :
              Object.entries(monthlyData).map(([monthStr, data], idx) => {
                const month = parseInt(monthStr)
                const totalAmount = data.total
                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                return (
                  <tr key={month} className={`transition-colors duration-150 hover:bg-blue-100 ${rowBg}`} onMouseEnter={() => setHoveredRow(month)} onMouseLeave={() => setHoveredRow(null)}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-white bg-blue-900 border-l-3 border-blue-700 shadow-sm transition-all duration-200 ${hoveredRow === month ? 'bg-blue-800 shadow-md' : ''}`} style={{letterSpacing: '0.02em'}}>
                      <button
                        onClick={() => onNavigateToMonth(month, selectedYear)}
                        className="text-white hover:text-blue-100 font-semibold transition-all duration-200 text-sm cursor-pointer group"
                        style={{textShadow: '0 1px 3px rgba(30,64,175,0.3)'}}
                      >
                        <div className="flex items-center gap-2">
                          {months[month - 1]}
                          {selectedYear === currentYear && month === currentMonth && (
                            <span className="bg-blue-400 text-blue-900 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{fontSize: '0.65rem'}}>
                              Actual
                            </span>
                          )}
                          {/* Ícono de enlace - siempre visible */}
                          <svg 
                            className="w-3 h-3 opacity-60 transition-opacity duration-200" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            viewBox="0 0 24 24"
                          >
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </button>
                    </td>
                    <td 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-center border-r-2 border-blue-200 bg-slate-50 transition-all duration-200 ${hoveredRow === month ? 'bg-slate-200 shadow-sm' : ''}`}
                    >
                      <span className={`text-${getColor('income', 'dark')} font-bold`}>{formatCurrency(data.income)}</span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-${getColor('income', 'medium')} text-${getColor('income', 'primary')}`} title="Porcentaje de ingresos ya recibidos en el mes">
                        {calculateIncomePercentage(data)}%
                      </span>
                    </td>
                    <td 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-center bg-yellow-50 transition-all duration-200 ${hoveredRow === month ? 'bg-orange-100 shadow-md' : ''}`}
                    >
                      <span className={`text-${getColor('expense', 'dark')} font-bold`}>{formatCurrency(totalAmount)}</span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-${getColor('expense', 'medium')} text-${getColor('expense', 'primary')}`} title="Porcentaje del total pagado">
                        {getPercentage(data.paid, totalAmount)}%
                      </span>
                    </td>
                    <td 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-center bg-yellow-50 transition-all duration-200 ${hoveredRow === month ? 'bg-orange-100 shadow-md' : ''}`}
                    >
                      <span className={`text-${getColor('expense', 'dark')}`}>{formatCurrency(data.recurrent)}</span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-${getColor('expense', 'medium')} text-${getColor('expense', 'primary')}`} title="Porcentaje de gastos mensuales pagados">
                        {calculateExpenseTypePercentage(data, 'recurrent')}%
                      </span>
                    </td>
                    <td 
                      className={`px-6 py-4 whitespace-nowrap text-sm text-center bg-yellow-50 transition-all duration-200 ${hoveredRow === month ? 'bg-orange-100 shadow-md' : ''}`}
                    >
                      <span className={`text-${getColor('expense', 'dark')}`}>{formatCurrency(data.nonRecurrent)}</span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-${getColor('expense', 'medium')} text-${getColor('expense', 'primary')}`} title="Porcentaje de gastos únicos pagados">
                        {calculateExpenseTypePercentage(data, 'non_recurrent')}%
                      </span>
                    </td>
                    <td 
                      className={`px-2 py-3 whitespace-nowrap text-sm text-center bg-blue-50 border-l-2 border-blue-200 transition-all duration-200 ${hoveredRow === month ? 'bg-blue-200 shadow-sm' : ''}`} 
                      style={{ minWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      <span className="font-bold text-blue-700">
                        {formatCurrency(data.income - data.total)}
                      </span>
                      {(() => {
                        const ratio = data.income > 0 ? Math.round(((data.income - data.total) / data.income) * 100) : 0;
                        const isPositive = ratio >= 0;
                        return (
                          <span
                            className={`ml-2 align-middle text-xs font-semibold px-3 py-1 rounded-full border ${isPositive ? 'border-blue-400 text-blue-700 bg-white' : 'border-red-400 text-red-700 bg-white'} flex items-center gap-1 inline-flex`}
                            style={{ fontSize: '0.95em', verticalAlign: 'middle' }}
                            title="Porcentaje de tus ingresos que te queda libre este mes"
                          >
                            {ratio}%
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                )
              })
            }
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
            const paidPercentage = getPercentage(data.paid, totalAmount)
            
            return (
              <div key={month} className="bg-white rounded-lg shadow-sm border p-4 mobile-card">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => onNavigateToMonth(month, selectedYear)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-lg cursor-pointer transition-colors duration-200 group"
                  >
                    <div className="flex items-center gap-2">
                      {months[month - 1]}
                      {selectedYear === currentYear && month === currentMonth && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Actual
                        </span>
                      )}
                      {/* Ícono de enlace - siempre visible */}
                      <svg 
                        className="w-3 h-3 opacity-60" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </button>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPercentageColor(paidPercentage)}`}>
                        {paidPercentage}%
                      </span>
                      <span className="text-sm text-gray-600">{texts.paid}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Sección de Ingresos */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm text-${getColor('income', 'text')} font-medium`}>Ingresos:</span>
                      <div className="text-right">
                        <div className={`text-sm text-${getColor('income', 'dark')}`}>{formatCurrency(data.income)}</div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full bg-${getColor('income', 'medium')} text-${getColor('income', 'primary')}`}>
                            {calculateIncomePercentage(data)}%
                          </span>
                          <span className="text-xs text-gray-600">Recibido</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sección de Gastos */}
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <div className="mb-2">
                      <span className={`text-sm text-${getColor('expense', 'text')} font-medium`}>Gastos:</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total:</span>
                        <div className="text-right">
                          <div className={`text-sm text-${getColor('expense', 'dark')}`}>{formatCurrency(data.total)}</div>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full bg-${getColor('expense', 'medium')} text-${getColor('expense', 'primary')}`}>
                              {getPercentage(data.paid, data.total)}%
                            </span>
                            <span className="text-xs text-gray-600">{texts.paid}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{texts.recurrent}:</span>
                        <div className="text-right">
                          <div className={`text-sm text-${getColor('expense', 'dark')}`}>{formatCurrency(data.recurrent)}</div>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full bg-${getColor('expense', 'medium')} text-${getColor('expense', 'primary')}`}>
                              {calculateExpenseTypePercentage(data, 'recurrent')}%
                            </span>
                            <span className="text-xs text-gray-600">{texts.paid}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{texts.nonRecurrent}:</span>
                        <div className="text-right">
                          <div className={`text-sm text-${getColor('expense', 'dark')}`}>{formatCurrency(data.nonRecurrent)}</div>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full bg-${getColor('expense', 'medium')} text-${getColor('expense', 'primary')}`}>
                              {calculateExpenseTypePercentage(data, 'non_recurrent')}%
                            </span>
                            <span className="text-xs text-gray-600">{texts.paid}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sección de CuantoQueda */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-700 font-medium">CuantoQueda:</span>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${data.income - data.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(data.income - data.total)}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${data.income - data.total >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {data.total > 0 ? Math.round(((data.income - data.total) / data.total) * 100) : 0}%
                        </span>
                        <span className="text-xs text-gray-600">Diferencia</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={handleCancelDelete}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-5 flex flex-col gap-4 items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-2">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Confirmar Eliminación</h2>
              <p className="text-gray-700 text-sm font-medium mb-4 text-center">¿Estás seguro de que quieres eliminar esta transacción?</p>
              
              {/* Información de la transacción */}
              <div className="w-full bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Descripción:</span>
                  <span className="text-sm text-gray-900 font-semibold">{deleteModalData.transaction.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Valor:</span>
                  <span className="text-sm text-gray-900 font-semibold">{formatCurrency(deleteModalData.transaction.value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Fecha:</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {deleteModalData.transaction.deadline ? (() => {
                      const [year, month, day] = deleteModalData.transaction.deadline!.split('-').map(Number);
                      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                    })() : `${months[deleteModalData.transaction.month - 1]} ${deleteModalData.transaction.year}`}
                  </span>
                </div>
              </div>

              {/* Mensaje específico según el tipo */}
              {deleteModalData.isRecurrent ? (
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">Esta es una transacción de gasto recurrente.</p>
                  <p className="text-sm text-blue-700">Elige qué quieres eliminar:</p>
                </div>
              ) : (
                <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">¿Estás seguro de que quieres eliminar esta transacción?</p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="w-full space-y-3">
                {deleteModalData.isRecurrent ? (
                  <>
                    <button
                      onClick={() => handleConfirmDelete(true)}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Eliminar Serie Completa
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(false)}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                    >
                      Eliminar Solo Esta
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConfirmDelete(false)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Eliminar Transacción
                  </button>
                )}
                
                <button
                  onClick={handleCancelDelete}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
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