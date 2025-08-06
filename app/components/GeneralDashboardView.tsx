'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, ChevronUp, ChevronDown, TrendingUp, Info } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, measureQueryPerformance } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useSearchParams } from 'next/navigation'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'
import { getMonthlyColumnStats, getPercentage, type ColumnType } from '@/lib/utils/dashboardTable'
import { getColor, getGradient } from '@/lib/config/colors'
import { useTransactionStore } from '@/lib/store/transactionStore'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

interface GeneralDashboardViewProps {
  onNavigateToMonth: (month: number, year: number) => void
  user: User
  navigationParams?: { year?: number } | null
}

export default function GeneralDashboardView({ onNavigateToMonth, user, navigationParams }: GeneralDashboardViewProps) {
  const searchParams = useSearchParams()
  const { refreshData } = useDataSync()
  
  // Zustand store
  const { transactions, isLoading } = useTransactionStore()
  
  // Ref to prevent duplicate fetch calls with same parameters
  const lastFetchedRef = useRef<{ userId: number; year: number } | null>(null)
  
  // Function to validate that all transactions belong to the selected year
  function validateYearTransactions(transactions: Transaction[], selectedYear: number) {
    const invalid = transactions.filter(tx => tx.year !== selectedYear)
    if (invalid.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('[zustand] GeneralDashboardView: Found', invalid.length, 'transactions with wrong year:', invalid.slice(0, 3))
    }
  }
  
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

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteModalData, setDeleteModalData] = useState<{
    transactionId: number
    transaction: Transaction
    isRecurrent: boolean
  } | null>(null)

  // Delete series confirmation state
  const [showDeleteSeriesConfirmation, setShowDeleteSeriesConfirmation] = useState(false)
  const [deleteSeriesConfirmationData, setDeleteSeriesConfirmationData] = useState<{
    description: string
    value: number
    period: string
    transactionId: number
    transaction: Transaction
  } | null>(null)

  // Delete individual transaction confirmation state
  const [showDeleteIndividualConfirmation, setShowDeleteIndividualConfirmation] = useState(false)
  const [deleteIndividualConfirmationData, setDeleteIndividualConfirmationData] = useState<{
    description: string
    value: number
    date: string
    transactionId: number
    transaction: Transaction
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

  const fetchMonthlyData = useCallback(async () => {
    if (!user || !selectedYear) return
    
    // Prevent duplicate fetch calls with same parameters
    if (lastFetchedRef.current?.userId === user.id &&
        lastFetchedRef.current?.year === selectedYear) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 GeneralDashboardView: Skipping duplicate fetch for year ${selectedYear}`)
      }
      return
    }
    
    try {
      setError(null)
      useTransactionStore.getState().setLoading(true)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 GeneralDashboardView: Loading data for year ${selectedYear}`)
        console.log('[zustand] GeneralDashboardView: fetching all transactions for year', selectedYear)
      }
      
      // Update last fetched parameters
      lastFetchedRef.current = { userId: user.id, year: selectedYear }
      
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

      // Only log summary in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ GeneralDashboardView: Loaded ${result.transactions.length} transactions for year ${selectedYear}`)
      }

      // Store data using Zustand for transactions and local state for expenses
      useTransactionStore.getState().setTransactions(result.transactions)
      setRecurrentExpenses(result.expenses.recurrent)
      setNonRecurrentExpenses(result.expenses.nonRecurrent)
      
      // Validate year consistency
      validateYearTransactions(result.transactions, selectedYear)

      // Monthly stats will be built by separate useEffect when Zustand transactions are ready
      // Remove verbose logging - calculations complete
      useTransactionStore.getState().setLoading(false)

    } catch (error) {
      console.error('❌ Error in fetchMonthlyData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      // Reset last fetched on error to allow retry
      lastFetchedRef.current = null
    } finally {
      useTransactionStore.getState().setLoading(false)
    }
  }, [user, selectedYear]) // Dependencies for useCallback

  // Use the new data synchronization system - only depend on dataVersion and lastOperation
  useDataSyncEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 GeneralDashboardView: Data sync triggered, refetching data')
    }
    fetchMonthlyData()
  }, [fetchMonthlyData]) // Now depends on fetchMonthlyData

  // Main effect for user and selectedYear changes
  useEffect(() => {
    fetchMonthlyData()
  }, [fetchMonthlyData]) // Now depends on fetchMonthlyData

  // Development logging for Zustand transactions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isLoading) {
      const txs = transactions.filter(t => t.year === selectedYear)
      console.log('[zustand] GeneralDashboardView: loaded', txs.length, 'transactions for year', selectedYear, 'from Zustand')
    }
  }, [isLoading, transactions, selectedYear])

  // Build monthlyData when Zustand transactions are available
  useEffect(() => {
    if (!isLoading && transactions.length > 0 && selectedYear) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] GeneralDashboardView: building monthlyStats with', transactions.length, 'transactions from Zustand')
      }
      
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
        // Get all transactions for the month using Zustand transactions
        const monthTransactions = transactions.filter((t: Transaction) => t.month === month && t.year === selectedYear)
        
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] GeneralDashboardView: renderizando tabla con', Object.keys(monthlyStats).length, 'meses y', transactions.length, 'transacciones')
      }
    }
  }, [isLoading, transactions, selectedYear])

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

  const handleDeleteSeries = async () => {
    if (!deleteModalData) return

    const { transaction } = deleteModalData
    
    // Get the recurrent expense data for the confirmation modal
    const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
    if (!recurrentExpense) {
      setError('Original recurrent expense not found')
      return
    }

    const period = `${months[recurrentExpense.month_from - 1]} ${recurrentExpense.year_from} - ${months[recurrentExpense.month_to - 1]} ${recurrentExpense.year_to}`

    setDeleteSeriesConfirmationData({
      description: transaction.description,
      value: transaction.value,
      period,
      transactionId: deleteModalData.transactionId,
      transaction: transaction
    })
    
    setShowDeleteModal(false)
    setShowDeleteSeriesConfirmation(true)
  }

  const handleConfirmDeleteSeries = async () => {
    if (!deleteSeriesConfirmationData) return

    const { transactionId, transaction } = deleteSeriesConfirmationData

    try {
      setLoading(true)
      setError(null)

      // Delete the entire recurrent series
      const { error } = await supabase
        .from('recurrent_expenses')
        .delete()
        .eq('id', transaction.source_id)
        .eq('user_id', user.id)

      if (error) throw error

      // Trigger global data refresh using the new system
      refreshData(user.id, 'delete_transaction')
      
    } catch (error) {
      console.error('Error deleting series:', error)
      setError(`Error al eliminar serie: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
      setShowDeleteSeriesConfirmation(false)
      setDeleteSeriesConfirmationData(null)
    }
  }

  const handleCancelDeleteSeries = () => {
    setShowDeleteSeriesConfirmation(false)
    setDeleteSeriesConfirmationData(null)
  }

  const handleDeleteIndividual = async () => {
    if (!deleteModalData) return

    const { transaction } = deleteModalData
    
    // Format date for display
    const date = transaction.deadline ? (() => {
      const [year, month, day] = transaction.deadline.split('-').map(Number);
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    })() : `${months[transaction.month - 1]} ${transaction.year}`

    setDeleteIndividualConfirmationData({
      description: transaction.description,
      value: transaction.value,
      date,
      transactionId: deleteModalData.transactionId,
      transaction: transaction
    })
    
    setShowDeleteModal(false)
    setShowDeleteIndividualConfirmation(true)
  }

  const handleConfirmDeleteIndividual = async () => {
    if (!deleteIndividualConfirmationData) return

    const { transactionId, transaction } = deleteIndividualConfirmationData

    try {
      setLoading(true)
      setError(null)

      // Delete only this transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id)

      if (error) throw error

      // Trigger global data refresh using the new system
      refreshData(user.id, 'delete_transaction')
      
    } catch (error) {
      console.error('Error deleting individual transaction:', error)
      setError(`Error al eliminar transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
      setShowDeleteIndividualConfirmation(false)
      setDeleteIndividualConfirmationData(null)
    }
  }

  const handleCancelDeleteIndividual = () => {
    setShowDeleteIndividualConfirmation(false)
    setDeleteIndividualConfirmationData(null)
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
      {/* 1. Header con filtro de año rediseñado */}
      <div className="mb-8">
        <div className="flex items-center">
          {/* Filtro de año rediseñado */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-mdplus bg-white border border-border-light text-gray-dark text-sm font-medium hover:shadow-soft transition-all">
            <svg className="w-4 h-4 text-green-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>Año</span>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={e => {
                  const newYear = Number(e.target.value)
                  setSelectedYear(newYear)
                }}
                className="appearance-none bg-transparent focus:outline-none focus:ring-2 focus:ring-green-primary text-gray-dark font-medium pr-6 cursor-pointer"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-green-dark pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* 2. Filtro de año más sofisticado */}
      {error && <div className="mb-4 text-red-600">{error}</div>}
      
      {/* 3. Fancy tabla con tooltips en porcentajes */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed general-dashboard-table">
          <colgroup>
            <col style={{ width: '110px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '170px' }} />
          </colgroup>
          <thead>
            {/* Header principal simplificado */}
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-dark uppercase tracking-wide bg-neutral-bg">
                {texts.month}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-dark uppercase tracking-wide bg-neutral-bg">
                Ingresos
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-dark uppercase tracking-wide bg-neutral-bg">
                Gastos Totales
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-dark uppercase tracking-wide bg-neutral-bg">
                Gastos Mensuales
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-dark uppercase tracking-wide bg-neutral-bg">
                Gastos Únicos
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-dark uppercase tracking-wide bg-neutral-bg">
                Balance (CuantoQueda)
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-3 py-2 text-center text-gray-400 animate-pulse">{texts.loading}</td></tr>
            ) :
              Object.entries(monthlyData).map(([monthStr, data], idx) => {
                const month = parseInt(monthStr)
                const totalAmount = data.total
                const balance = data.income - data.total
                const balanceColor = balance >= 0 ? 'text-[#3f70ad]' : 'text-[#d9534f]'
                
                return (
                  <tr key={month} className="bg-white">
                    <td className="px-3 py-2 text-sm text-gray-dark font-medium">
                      <button
                        onClick={() => onNavigateToMonth(month, selectedYear)}
                        className="text-gray-dark font-medium transition-colors duration-200 cursor-pointer group flex items-center gap-2"
                      >
                        {months[month - 1]}
                        {selectedYear === currentYear && month === currentMonth && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Actual
                          </span>
                        )}
                        {/* Ícono de enlace */}
                        <svg 
                          className="w-3 h-3 text-green-dark opacity-60" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          viewBox="0 0 24 24"
                        >
                          <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm text-[#3f70ad] font-medium">
                      {formatCurrency(data.income)}
                    </td>
                    <td className="px-3 py-2 text-sm text-[#a07b00]">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-sm text-[#a07b00]">
                      {formatCurrency(data.recurrent)}
                    </td>
                    <td className="px-3 py-2 text-sm text-[#a07b00]">
                      {formatCurrency(data.nonRecurrent)}
                    </td>
                    <td className={`px-3 py-2 text-sm font-medium ${balanceColor}`}>
                      {formatCurrency(balance)}
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
        {isLoading ? (
          <div className="text-center text-gray-400 py-8">{texts.loading}</div>
        ) : (
          Object.entries(monthlyData).map(([monthStr, data]) => {
            const month = parseInt(monthStr)
            const totalAmount = data.total
            const balance = data.income - data.total
            const balanceColor = balance >= 0 ? 'text-[#3f70ad]' : 'text-[#d9534f]'
            
            return (
              <div key={month} className="bg-white rounded-lg shadow-sm border p-4 mobile-card">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => onNavigateToMonth(month, selectedYear)}
                    className="text-gray-dark font-medium text-lg cursor-pointer transition-colors duration-200 group flex items-center gap-2"
                  >
                    {months[month - 1]}
                    {selectedYear === currentYear && month === currentMonth && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Actual
                      </span>
                    )}
                    {/* Ícono de enlace */}
                    <svg 
                      className="w-3 h-3 text-green-dark opacity-60" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Sección de Ingresos */}
                  <div className="bg-neutral-bg rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-dark font-medium">Ingresos:</span>
                      <div className="text-sm text-[#3f70ad] font-medium">{formatCurrency(data.income)}</div>
                    </div>
                  </div>
                  
                  {/* Sección de Gastos */}
                  <div className="bg-neutral-bg rounded-lg p-3 border border-gray-200">
                    <div className="mb-2">
                      <span className="text-sm text-gray-dark font-medium">Gastos:</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total:</span>
                        <div className="text-sm text-[#a07b00]">{formatCurrency(data.total)}</div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Mensuales:</span>
                        <div className="text-sm text-[#a07b00]">{formatCurrency(data.recurrent)}</div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Únicos:</span>
                        <div className="text-sm text-[#a07b00]">{formatCurrency(data.nonRecurrent)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sección de Balance */}
                  <div className="bg-neutral-bg rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-dark font-medium">Balance (CuantoQueda):</span>
                      <div className={`text-sm font-medium ${balanceColor}`}>
                        {formatCurrency(balance)}
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
          <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={handleCancelDelete}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-error-bg rounded-full p-1.5">
                  <Trash2 className="h-4 w-4 text-error-red" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h2>
              </div>
              <p className="text-sm text-gray-500">¿Estás seguro de que quieres eliminar esta transacción?</p>
              
              {/* Información de la transacción */}
              <div className="w-full bg-gray-50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <span className="text-sm font-medium text-gray-900">{deleteModalData.transaction.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Valor:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(deleteModalData.transaction.value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Fecha:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {deleteModalData.transaction.deadline ? (() => {
                      const [year, month, day] = deleteModalData.transaction.deadline!.split('-').map(Number);
                      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                    })() : `${months[deleteModalData.transaction.month - 1]} ${deleteModalData.transaction.year}`}
                  </span>
                </div>
              </div>

              {/* Mensaje específico según el tipo */}
              {deleteModalData.isRecurrent ? (
                <div className="w-full bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <Info className="h-3 w-3 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-red-800 font-medium mb-0.5">Esta es una transacción recurrente.</p>
                      <p className="text-sm text-red-800">Elige qué quieres eliminar:</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <Info className="h-3 w-3 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-red-800">¿Estás seguro de que quieres eliminar esta transacción?</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="w-full space-y-2">
                {deleteModalData.isRecurrent ? (
                  <>
                    <button
                      onClick={handleDeleteSeries}
                      className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Toda la Serie
                    </button>
                    <button
                      onClick={handleDeleteIndividual}
                      className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Solo Esta Transacción
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDeleteIndividual}
                    className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Eliminar Transacción
                  </button>
                )}
                
                <button
                  onClick={handleCancelDelete}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
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
          <div className="bg-white rounded-2xl p-0 w-full max-w-sm mx-4 shadow-2xl border border-gray-200">
            <button
              onClick={() => {
                setShowModifyModal(false)
                setModifyModalData(null)
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                  <Edit className="h-4 w-4 text-green-primary" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Modificar Transacción</h2>
              </div>
              <p className="text-sm text-gray-500">Selecciona cómo quieres modificar esta transacción</p>
              
              {/* Información de la transacción */}
              <div className="w-full bg-gray-50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <span className="text-sm font-medium text-gray-900">{modifyModalData.transaction.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Valor:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(modifyModalData.transaction.value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Fecha:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {modifyModalData.transaction.deadline ? (() => {
                      const [year, month, day] = modifyModalData.transaction.deadline!.split('-').map(Number);
                      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                    })() : `${months[modifyModalData.transaction.month - 1]} ${modifyModalData.transaction.year}`}
                  </span>
                </div>
              </div>

              {modifyModalData.isRecurrent ? (
                <div className="w-full bg-green-light border border-green-200 rounded-lg p-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <Info className="h-3 w-3 text-green-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-green-primary font-medium mb-0.5">Esta es una transacción recurrente.</p>
                      <p className="text-sm text-green-primary">Elige qué quieres modificar:</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-green-light border border-green-200 rounded-lg p-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <Info className="h-3 w-3 text-green-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-green-primary">¿Estás seguro de que quieres modificar esta transacción?</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full space-y-2">
                {modifyModalData.isRecurrent ? (
                  <>
                    <button
                      onClick={() => handleConfirmModify(true)}
                      className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors"
                    >
                      Toda la Serie
                    </button>
                    <button
                      onClick={() => handleConfirmModify(false)}
                      className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors"
                    >
                      Solo Esta Transacción
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConfirmModify(false)}
                    className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors"
                  >
                    Modificar Transacción
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowModifyModal(false)
                    setModifyModalData(null)
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modify Confirmation Modal */}
      {showModifyConfirmation && modifyConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={() => {
                setShowModifyConfirmation(false)
                setModifyConfirmationData(null)
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                  <CheckCircle className="h-4 w-4 text-green-primary" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Confirmar modificación</h2>
              </div>
              <p className="text-sm text-gray-500">Revisa los datos antes de guardar</p>
              
              {/* Información de la transacción */}
              <div className="w-full bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <span className="text-sm font-medium text-gray-900">{modifyConfirmationData.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Valor:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(modifyConfirmationData.value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Período:</span>
                  <span className="text-sm font-medium text-gray-900">{modifyConfirmationData.period}</span>
                </div>
              </div>

              {/* Advertencia */}
              <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-yellow-800">Esta acción no se puede deshacer</p>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="w-full space-y-2">
                <button
                  onClick={handleConfirmModifySubmit}
                  className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors"
                >
                  Guardar cambios
                </button>
                
                <button
                  onClick={() => {
                    setShowModifyConfirmation(false)
                    setModifyConfirmationData(null)
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modify Form Modal */}
      {showModifyForm && modifyFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowModifyForm(false)
                setModifyFormData(null)
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 z-10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              handleModifyFormSubmit(modifyFormData)
            }} className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                  <Edit className="h-4 w-4 text-green-primary" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {modifyFormData.modifySeries ? 'Modificar Serie Recurrente' : 'Modificar Transacción'}
                </h2>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-dark">
                  Descripción
                </label>
                <input
                  type="text"
                  value={modifyFormData.description}
                  onChange={(e) => setModifyFormData({
                    ...modifyFormData,
                    description: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                  required
                />
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-dark">
                  Valor
                </label>
                <input
                  type="number"
                  value={modifyFormData.value}
                  onChange={(e) => setModifyFormData({
                    ...modifyFormData,
                    value: Number(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Campos específicos para serie recurrente */}
              {modifyFormData.type === 'recurrent' && modifyFormData.modifySeries && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">
                        Mes desde
                      </label>
                      <select
                        value={modifyFormData.month_from}
                        onChange={(e) => setModifyFormData({
                          ...modifyFormData,
                          month_from: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                      >
                        {months.map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">
                        Mes hasta
                      </label>
                      <select
                        value={modifyFormData.month_to}
                        onChange={(e) => setModifyFormData({
                          ...modifyFormData,
                          month_to: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                      >
                        {months.map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">
                        Año desde
                      </label>
                      <input
                        type="number"
                        value={modifyFormData.year_from}
                        onChange={(e) => setModifyFormData({
                          ...modifyFormData,
                          year_from: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">
                        Año hasta
                      </label>
                      <input
                        type="number"
                        value={modifyFormData.year_to}
                        onChange={(e) => setModifyFormData({
                          ...modifyFormData,
                          year_to: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Campos específicos para transacción no recurrente */}
              {modifyFormData.type === 'non_recurrent' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-dark">
                      Mes
                    </label>
                    <select
                      value={modifyFormData.month}
                      onChange={(e) => setModifyFormData({
                        ...modifyFormData,
                        month: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                    >
                      {months.map((month, index) => (
                        <option key={index + 1} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-dark">
                      Año
                    </label>
                    <input
                      type="number"
                      value={modifyFormData.year}
                      onChange={(e) => setModifyFormData({
                        ...modifyFormData,
                        year: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Fecha de vencimiento */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-dark">
                  Fecha de Vencimiento (Opcional)
                </label>
                <input
                  type="date"
                  value={modifyFormData.payment_deadline}
                  onChange={(e) => setModifyFormData({
                    ...modifyFormData,
                    payment_deadline: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModifyForm(false)
                    setModifyFormData(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-primary rounded-md hover:bg-[#77b16e] transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Series Confirmation Modal */}
      {showDeleteSeriesConfirmation && deleteSeriesConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={handleCancelDeleteSeries}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-red-50 rounded-full p-1.5">
                  <Trash2 className="h-4 w-4 text-error-red" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h2>
              </div>
              <p className="text-sm text-gray-500">Revisa los datos antes de eliminar</p>
              
              {/* Información de la transacción */}
              <div className="w-full bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <span className="text-sm font-medium text-gray-900">{deleteSeriesConfirmationData.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Valor:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(deleteSeriesConfirmationData.value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Período:</span>
                  <span className="text-sm font-medium text-gray-900">{deleteSeriesConfirmationData.period}</span>
                </div>
              </div>

              {/* Advertencia */}
              <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-yellow-800">Esta acción no se puede deshacer</p>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="w-full space-y-2">
                <button
                  onClick={handleConfirmDeleteSeries}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error-red mr-2"></div>
                      Eliminando...
                    </div>
                  ) : (
                    'Eliminar serie'
                  )}
                </button>
                
                <button
                  onClick={handleCancelDeleteSeries}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Delete Individual Confirmation Modal */}
      {showDeleteIndividualConfirmation && deleteIndividualConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={handleCancelDeleteIndividual}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-red-50 rounded-full p-1.5">
                  <Trash2 className="h-4 w-4 text-error-red" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h2>
              </div>
              <p className="text-sm text-gray-500">Revisa los datos antes de eliminar</p>
              
              {/* Información de la transacción */}
              <div className="w-full bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <span className="text-sm font-medium text-gray-900">{deleteIndividualConfirmationData.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Valor:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(deleteIndividualConfirmationData.value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Fecha:</span>
                  <span className="text-sm font-medium text-gray-900">{deleteIndividualConfirmationData.date}</span>
                </div>
              </div>

              {/* Advertencia */}
              <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-yellow-800">Esta acción no se puede deshacer</p>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="w-full space-y-2">
                <button
                  onClick={handleConfirmDeleteIndividual}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error-red mr-2"></div>
                      Eliminando...
                    </div>
                  ) : (
                    'Eliminar transacción'
                  )}
                </button>
                
                <button
                  onClick={handleCancelDeleteIndividual}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
} 