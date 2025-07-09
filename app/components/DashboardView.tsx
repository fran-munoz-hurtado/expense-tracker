'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, Paperclip, ChevronUp, ChevronDown, TrendingUp } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, fetchAttachmentCounts, measureQueryPerformance, clearUserCache } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDataSync, useDataSyncEffect } from '@/lib/hooks/useDataSync'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'
import MonthlyProgressBar from './MonthlyProgressBar'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

interface DashboardViewProps {
  navigationParams?: { month?: number; year?: number } | null
  user: User
  onDataChange?: () => void
}

export default function DashboardView({ navigationParams, user, onDataChange }: DashboardViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshData } = useDataSync()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(navigationParams?.month || new Date().getMonth() + 1)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'recurrent' | 'non_recurrent'>('all')
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  
  // Sorting state
  const [sortField, setSortField] = useState<'description' | 'deadline' | 'status' | 'value' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

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
    isgoal?: boolean
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

  // Attachment modal state
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionForAttachment, setSelectedTransactionForAttachment] = useState<Transaction | null>(null)
  const [showAttachmentsList, setShowAttachmentsList] = useState(false)
  const [selectedTransactionForList, setSelectedTransactionForList] = useState<Transaction | null>(null)

  // Sync with URL parameters
  useEffect(() => {
    const urlMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const urlYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    
    if (urlMonth && urlYear) {
      setSelectedMonth(urlMonth)
      setSelectedYear(urlYear)
    }
  }, [searchParams])

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

  // Helper function to format currency for display while typing
  const formatCurrencyForInput = (value: string): string => {
    if (!value || value.trim() === '') return ''
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '')
    if (!cleanValue) return ''
    
    const numValue = parseFloat(cleanValue)
    if (isNaN(numValue)) return ''
    
    // Format with thousands separators
    return numValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  // Helper to format with dots as thousands separators
  const formatWithDots = (value: string): string => {
    if (!value) return ''
    // Remove non-digits except decimal
    let [int, dec] = value.replace(/[^\d.]/g, '').split('.')
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return dec !== undefined ? `${int}.${dec}` : int
  }

  // Helper function to get currency input value - just return the raw number as string
  const getCurrencyInputValue = (value: number): string => {
    if (value === 0) return ''
    return value.toString()
  }

  const fetchData = async () => {
    try {
      setError(null)
      setLoading(true)
      
      console.log(`🔄 DashboardView: Fetching data for month ${selectedMonth}, year ${selectedYear}`)
      
      // Use optimized data fetching with performance monitoring
      const result = await measureQueryPerformance(
        'fetchDashboardData',
        async () => {
          const [transactions, expenses] = await Promise.all([
            fetchUserTransactions(user, selectedMonth, selectedYear),
            fetchUserExpenses(user)
          ])
          
          return { transactions, expenses }
        }
      )

      console.log(`📊 DashboardView: Fetched ${result.transactions.length} transactions for month ${selectedMonth}, year ${selectedYear}`)
      console.log('📋 DashboardView: Transaction details:', result.transactions.map((t: Transaction) => ({
        id: t.id,
        description: t.description,
        month: t.month,
        year: t.year,
        value: t.value,
        status: t.status,
        type: t.type,
        source_type: t.source_type
      })))

      // Log detailed transaction breakdown
      const expenseTransactions = result.transactions.filter(t => t.type === 'expense')
      const recurrentTransactions = expenseTransactions.filter(t => t.source_type === 'recurrent')
      const nonRecurrentTransactions = expenseTransactions.filter(t => t.source_type === 'non_recurrent')
      
      console.log('📊 DashboardView: Transaction breakdown:', {
        total: result.transactions.length,
        expense: expenseTransactions.length,
        income: result.transactions.filter(t => t.type === 'income').length,
        recurrent: recurrentTransactions.length,
        nonRecurrent: nonRecurrentTransactions.length,
        totalValue: expenseTransactions.reduce((sum, t) => sum + t.value, 0),
        recurrentValue: recurrentTransactions.reduce((sum, t) => sum + t.value, 0),
        nonRecurrentValue: nonRecurrentTransactions.reduce((sum, t) => sum + t.value, 0)
      })

      setTransactions(result.transactions)
      setRecurrentExpenses(result.expenses.recurrent)
      setNonRecurrentExpenses(result.expenses.nonRecurrent)

      // Fetch attachment counts if we have transactions
      if (result.transactions && result.transactions.length > 0) {
        const transactionIds = result.transactions.map((t: Transaction) => t.id)
        const attachmentCountsData = await fetchAttachmentCounts(user, transactionIds)
        setAttachmentCounts(attachmentCountsData)
      }

    } catch (error) {
      console.error('❌ Error in fetchData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Use the new data synchronization system - only depend on dataVersion and lastOperation
  useDataSyncEffect(() => {
    console.log('🔄 DashboardView: Data sync triggered, refetching data')
    fetchData()
  }, []) // Empty dependency array to avoid conflicts

  // Separate effect for user, selectedMonth, and selectedYear changes
  useEffect(() => {
    console.log('🔄 DashboardView: User, selectedMonth, or selectedYear changed, refetching data')
    fetchData()
  }, [user, selectedMonth, selectedYear])

  // Filter transactions for selected month/year
  const filteredTransactions = transactions.filter(transaction => 
    transaction.year === selectedYear && transaction.month === selectedMonth
  )

  // Apply type filter
  const typeFilteredTransactions = filteredTransactions.filter(transaction => {
    if (filterType === 'all') return true
    return transaction.source_type === filterType
  })

  // Sort transactions by deadline (closest first) only
  const sortedTransactions = [...typeFilteredTransactions].sort((a, b) => {
    // Sort by deadline (closest first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    
    // If one has deadline and other doesn't, prioritize the one with deadline
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    
    // If neither has deadline, sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Apply custom sorting if a sort field is selected
  const applyCustomSorting = (transactions: Transaction[]) => {
    if (!sortField) return transactions

    return [...transactions].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'description':
          comparison = a.description.localeCompare(b.description)
          break
        case 'deadline':
          // Handle cases where deadline might be null
          if (!a.deadline && !b.deadline) comparison = 0
          else if (!a.deadline) comparison = 1
          else if (!b.deadline) comparison = -1
          else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'value':
          comparison = a.value - b.value
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const finalSortedTransactions = applyCustomSorting(sortedTransactions)

  // Helper function to compare dates without time
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

  // Calcular totales del mes según la lógica del usuario
  const monthlyStats = {
    totalIncome: filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0), // Total ingresos del mes
    totalExpenses: filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0), // Total gastos del mes (renombrado)
    balance: filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0) - 
             filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0), // Balance (ingresos - gastos)
    total: filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0), // Total del mes (solo gastos) - mantenido para compatibilidad
    paid: filteredTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.value, 0), // Ya pagué (solo gastos)
    pending: filteredTransactions.filter(t => {
      // Falta pagar: status 'pending', tipo 'expense' y NO vencidas
      if (t.type !== 'expense' || t.status !== 'pending') return false
      if (!t.deadline) return true // Sin fecha límite, no está vencida
      return !isDateOverdue(t.deadline) // No vencida
    }).reduce((sum, t) => sum + t.value, 0),
    overdue: filteredTransactions.filter(t => {
      // Se pasó la fecha: status 'pending', tipo 'expense' y vencidas
      if (t.type !== 'expense' || t.status !== 'pending') return false
      if (!t.deadline) return false // Sin fecha límite, no puede estar vencida
      return isDateOverdue(t.deadline) // Vencida
    }).reduce((sum, t) => sum + t.value, 0)
  }

  const paidTransactions = filteredTransactions.filter(t => t.type === 'expense' && t.status === 'paid')
  const pendingTransactions = filteredTransactions.filter(t => {
    if (t.type !== 'expense' || t.status !== 'pending') return false
    if (!t.deadline) return true
    return !isDateOverdue(t.deadline)
  })
  const overdueTransactions = filteredTransactions.filter(t => {
    if (t.type !== 'expense' || t.status !== 'pending') return false // Only include expense pending transactions
    if (!t.deadline) return false // No deadline, can't be overdue
    return isDateOverdue(t.deadline) // Overdue
  })
  
  // Verify totals
  const calculatedTotal = paidTransactions.reduce((sum, t) => sum + t.value, 0) + 
                         pendingTransactions.reduce((sum, t) => sum + t.value, 0) + 
                         overdueTransactions.reduce((sum, t) => sum + t.value, 0)
  
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

  const handleCheckboxChange = async (transactionId: number, isChecked: boolean) => {
    try {
      // Add ripple effect
      const checkbox = document.getElementById(`checkbox-${transactionId}`)?.nextElementSibling as HTMLElement;
      if (checkbox) {
        const ripple = document.createElement('div');
        ripple.className = 'absolute inset-0 bg-white/40 rounded-lg animate-ripple pointer-events-none';
        ripple.style.animation = 'ripple 0.6s ease-out';
        checkbox.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      }

      console.log(`🔄 handleCheckboxChange called for transaction ${transactionId}, isChecked: ${isChecked}`)
      
      setError(null)
      
      // Determine the new status based on checkbox and due date
      const transaction = transactions.find(t => t.id === transactionId)
      if (!transaction) {
        console.error(`❌ Transaction ${transactionId} not found in transactions array`)
        return
      }

      console.log(`📋 Found transaction:`, {
        id: transaction.id,
        description: transaction.description,
        currentStatus: transaction.status,
        deadline: transaction.deadline,
        isOverdue: transaction.deadline ? isDateOverdue(transaction.deadline) : false
      })

      let newStatus: 'paid' | 'pending'
      if (isChecked) {
        newStatus = 'paid'
      } else {
        // If unchecked, check if it's overdue
        if (transaction.deadline && isDateOverdue(transaction.deadline)) {
          newStatus = 'pending' // Will show as overdue in UI
        } else {
          newStatus = 'pending'
        }
      }
      
      console.log(`🔄 Updating status from '${transaction.status}' to '${newStatus}'`)

      // Optimistically update the local state first for immediate UI feedback
      setTransactions(prevTransactions => 
        prevTransactions.map(t => 
          t.id === transactionId 
            ? { ...t, status: newStatus }
            : t
        )
      )

      const { data, error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Supabase error (status update):', error)
        setError(`Error al actualizar estado: ${error.message}`)
        
        // Revert the optimistic update on error
        setTransactions(prevTransactions => 
          prevTransactions.map(t => 
            t.id === transactionId 
              ? { ...t, status: transaction.status }
              : t
          )
        )
        throw error
      }

      console.log('✅ Status update successful:', data)
      
      // Trigger global data refresh to synchronize all views
      console.log('🔄 Triggering global data refresh after status update')
      refreshData(user.id, 'update_status')
      
      console.log('✅ Status update completed - optimistic update maintained and global sync triggered')
      
    } catch (error) {
      console.error('❌ Error updating status:', error)
      setError(`Error al actualizar estado: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleDeleteTransaction = async (id: number) => {
    // Find the transaction to determine if it's recurrent
    const transaction = transactions.find(t => t.id === id)
    if (!transaction) return

    // Show custom delete modal
    setDeleteModalData({
      transactionId: id,
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

  const handleModifyTransaction = async (id: number) => {
    // Find the transaction to determine if it's recurrent
    const transaction = transactions.find(t => t.id === id)
    if (!transaction) return

    // For non-recurrent transactions, go directly to the form
    if (transaction.source_type === 'non_recurrent') {
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
      setShowModifyForm(true)
    } else {
      // For recurrent transactions, show the confirmation modal
      setModifyModalData({
        transactionId: id,
        transaction,
        isRecurrent: transaction.source_type === 'recurrent',
        modifySeries: false
      })
      setShowModifyModal(true)
    }
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
          modifySeries: true,
          isgoal: recurrentExpense.isgoal || false
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
      setError(`Error al configurar el formulario de modificación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleCancelModify = () => {
    setShowModifyModal(false)
    setModifyModalData(null)
  }

  const handleModifyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!modifyFormData) return

    const period = modifyFormData.type === 'recurrent' 
      ? `${months[modifyFormData.month_from - 1]} ${modifyFormData.year_from} to ${months[modifyFormData.month_to - 1]} ${modifyFormData.year_to}`
      : `${months[modifyFormData.month - 1]} ${modifyFormData.year}`

    const action = modifyFormData.type === 'recurrent' && modifyFormData.modifySeries 
      ? 'modify entire series' 
      : 'modify transaction'

    // Show confirmation dialog
    setModifyConfirmationData({
      type: modifyFormData.type,
      description: modifyFormData.description,
      value: modifyFormData.value,
      period,
      action
    })
    setShowModifyConfirmation(true)
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
          payment_day_deadline: modifyFormData.payment_day_deadline ? Number(modifyFormData.payment_day_deadline) : null,
          isgoal: modifyFormData.isgoal || false
        }

        console.log('Modifying recurrent expense:', {
          modifySeries: modifyFormData.modifySeries,
          originalId: modifyFormData.originalId,
          recurrentData
        })

        if (modifyFormData.modifySeries && modifyFormData.originalId) {
          // Update the entire series
          console.log('Updating entire recurrent series...')
          const { data, error } = await supabase
            .from('recurrent_expenses')
            .update(recurrentData)
            .eq('id', modifyFormData.originalId)
            .eq('user_id', user.id)

          if (error) throw error

          console.log('Recurrent expense updated successfully:', data)

          // Check if transactions were updated
          const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('source_id', modifyFormData.originalId)
            .eq('source_type', 'recurrent')
            .eq('user_id', user.id)

          if (transError) {
            console.error('Error checking transactions:', transError)
          } else {
            console.log('Transactions after update:', transactions)
          }
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

  const resetModifyForm = () => {
    setModifyFormData(null)
    setShowModifyForm(false)
    setShowModifyConfirmation(false)
    setModifyConfirmationData(null)
  }

  // Attachment handlers
  const handleAttachmentUpload = (transaction: Transaction) => {
    setSelectedTransactionForAttachment(transaction)
    setShowAttachmentModal(true)
  }

  const handleAttachmentList = (transaction: Transaction) => {
    setSelectedTransactionForList(transaction)
    setShowAttachmentsList(true)
  }

  const handleAttachmentUploadComplete = (attachment: TransactionAttachment) => {
    // Update attachment counts
    setAttachmentCounts(prev => ({
      ...prev,
      [attachment.transaction_id]: (prev[attachment.transaction_id] || 0) + 1
    }))
    console.log('Attachment uploaded:', attachment)
  }

  const handleAttachmentDeleted = (attachmentId: number) => {
    // Refresh attachment counts by refetching data
    fetchData()
    console.log('Attachment deleted:', attachmentId)
  }

  const handleSort = (field: 'description' | 'deadline' | 'status' | 'value') => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // If clicking a new field, set it as the sort field and default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusIcon = (transaction: Transaction) => {
    if (transaction.status === 'paid') {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    
    if (transaction.deadline) {
      // Parse the date string to avoid timezone issues and compare only dates
      const [year, month, day] = transaction.deadline.split('-').map(Number);
      const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
      
      // Create today's date without time
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (deadlineDate < todayDate) {
        return <AlertCircle className="h-4 w-4 text-red-600" />
      }
    }
    
    return null
  }

  const getStatusText = (transaction: Transaction) => {
    if (transaction.status === 'paid') return texts.paid
    if (transaction.deadline) {
      // Parse the date string to avoid timezone issues and compare only dates
      const [year, month, day] = transaction.deadline.split('-').map(Number);
      const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
      
      // Create today's date without time
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (deadlineDate < todayDate) {
        return texts.overdue
      }
    }
    return texts.pending
  }

  const getStatusColor = (transaction: Transaction) => {
    if (transaction.status === 'paid') return 'bg-green-100 text-green-800'
    if (transaction.deadline) {
      // Parse the date string to avoid timezone issues and compare only dates
      const [year, month, day] = transaction.deadline.split('-').map(Number);
      const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
      
      // Create today's date without time
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (deadlineDate < todayDate) {
        return 'bg-red-100 text-red-800'
      }
    }
    return 'bg-yellow-100 text-yellow-800'
  }

  // 1. Construyo un mapa de recurrentes con isgoal=true
  const recurrentGoalMap = useMemo(() => {
    const map: Record<number, boolean> = {}
    recurrentExpenses.forEach(re => {
      if (re.isgoal) map[re.id] = true
    })
    return map
  }, [recurrentExpenses])

  return (
    <div className="flex-1 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{texts.errorOccurred}</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Compact Filters Section */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-white to-gray-50 p-3 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-blue-100 rounded-lg">
                <svg className="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
              </div>
              <h3 className="text-xs font-semibold text-gray-800">Filtros Avanzados</h3>
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {finalSortedTransactions.length} resultados
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Modern Year Filter */}
            <div className="relative group">
              <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer hover:border-gray-300 group-hover:shadow-md text-sm"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Modern Month Filter */}
            <div className="relative group">
              <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer hover:border-gray-300 group-hover:shadow-md text-sm"
                >
                  {months.map((month, index) => (
                    <option key={index + 1} value={index + 1}>{month}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Modern Type Filter - Compact Radio Buttons */}
            <div className="relative group">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <div className="flex space-x-1 bg-gray-50 p-1 rounded-md">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    filterType === 'all'
                      ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')}`
                      : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterType('recurrent')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    filterType === 'recurrent'
                      ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')}`
                      : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                  }`}
                >
                  Recurrentes
                </button>
                <button
                  onClick={() => setFilterType('non_recurrent')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    filterType === 'non_recurrent'
                      ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')}`
                      : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                  }`}
                >
                  Únicos
                </button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="relative group">
              <label className="block text-xs font-medium text-gray-600 mb-1">Acciones</label>
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setSelectedYear(new Date().getFullYear());
                    setSelectedMonth(new Date().getMonth() + 1);
                    setFilterType('all');
                  }}
                  className="w-full px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-md shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
                >
                  Mes Actual
                </button>
              </div>
            </div>
          </div>
          
          {/* Active Filters Summary */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>Filtros activos:</span>
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                {months[selectedMonth - 1]} {selectedYear}
              </span>
              {filterType !== 'all' && (
                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                  {filterType === 'recurrent' ? 'Recurrentes' : 'Únicos'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Section - Always Visible */}
      <div className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Total Ingresos del Mes */}
          <div className={`bg-gradient-to-br ${getGradient('income')} p-3 rounded-lg border border-${getColor('income', 'border')} shadow-sm`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 bg-${getColor('income', 'secondary')} rounded-lg`}>
                <TrendingUp className={`h-4 w-4 text-${getColor('income', 'icon')}`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-${getColor('income', 'text')}`}>{texts.monthlyIncomeTotal}</p>
                <p className={`text-base font-bold text-${getColor('income', 'dark')}`}>{formatCurrency(monthlyStats.totalIncome)}</p>
              </div>
            </div>
          </div>

          {/* Total Gastos del Mes */}
          <div className={`bg-gradient-to-br ${getGradient('expense')} p-3 rounded-lg border border-${getColor('expense', 'border')} shadow-sm`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 bg-${getColor('expense', 'secondary')} rounded-lg`}>
                <DollarSign className={`h-4 w-4 text-${getColor('expense', 'icon')}`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-${getColor('expense', 'text')}`}>{texts.monthlyExpensesTotal}</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-base font-bold text-${getColor('expense', 'dark')}`}>{formatCurrency(monthlyStats.totalExpenses)}</p>
                  {monthlyStats.totalIncome > 0 && (
                    <span className={`text-xs font-medium text-${getColor('expense', 'primary')} bg-${getColor('expense', 'light')} px-1.5 py-0.5 rounded-full`}>
                      {Math.round((monthlyStats.totalExpenses / monthlyStats.totalIncome) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CuantoQueda */}
          <div className={`bg-gradient-to-br ${getGradient('balance')} p-3 rounded-lg border border-${getColor('balance', 'border')} shadow-sm`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 bg-${getColor('balance', 'secondary')} rounded-lg`}>
                <CheckCircle className={`h-4 w-4 text-${getColor('balance', 'icon')}`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-${getColor('balance', 'text')}`}>{texts.cuantoQueda}</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-base font-bold text-${getColor('balance', 'dark')}`}>{formatCurrency(monthlyStats.balance)}</p>
                  {monthlyStats.totalIncome > 0 && (
                    <span className={`text-xs font-medium text-${getColor('balance', 'primary')} bg-${getColor('balance', 'light')} px-1.5 py-0.5 rounded-full`}>
                      {Math.round((monthlyStats.balance / monthlyStats.totalIncome) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Progress Bar with Integrated Totals */}
      <div className="mb-8">
        <MonthlyProgressBar
          paid={monthlyStats.paid}
          total={monthlyStats.total}
          pending={monthlyStats.pending}
          overdue={monthlyStats.overdue}
        />
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {texts.forMonth} {months[selectedMonth - 1]} {selectedYear}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">{texts.loading}</div>
        ) : finalSortedTransactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">{texts.empty.noTransactions}</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{texts.description}</span>
                        {sortField === 'description' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{texts.status}</span>
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('value')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{texts.amount}</span>
                        {sortField === 'value' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.paid}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {finalSortedTransactions.map((transaction) => {
                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {/* Ícono de tipo de transacción: solo target si es meta, si no, flechas o file */}
                              {transaction.source_type === 'recurrent' && transaction.type === 'expense' && recurrentGoalMap[transaction.source_id] ? (
                                // Solo target para gasto recurrente meta
                                <span title="Meta personal" className="inline-flex items-center ml-1">
                                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <circle cx="10" cy="10" r="8" stroke="#2563eb" strokeWidth="2" fill="#dbeafe" />
                                    <circle cx="10" cy="10" r="4" stroke="#2563eb" strokeWidth="2" fill="#bfdbfe" />
                                    <circle cx="10" cy="10" r="1.5" fill="#2563eb" />
                                  </svg>
                                </span>
                              ) : transaction.source_type === 'recurrent' ? (
                                transaction.type === 'income' ?
                                  <Repeat className="h-4 w-4 text-green-600" /> :
                                  <Repeat className="h-4 w-4 text-blue-600" />
                              ) : (
                                transaction.type === 'income' ?
                                  <FileText className="h-4 w-4 text-green-600" /> :
                                  <FileText className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {transaction.description}
                                {(() => {
                                  if (!transaction.deadline || transaction.status === 'paid') return null;
                                  const [year, month, day] = transaction.deadline.split('-').map(Number);
                                  const today = new Date();
                                  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                  const deadlineDate = new Date(year, month - 1, day);
                                  const diffTime = deadlineDate.getTime() - todayDate.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  if (diffDays > 0) {
                                    return (
                                      <span className="ml-2 text-xs text-yellow-600" style={{lineHeight: '1.2'}}>
                                        {`Vence en ${diffDays === 1 ? '1 día' : diffDays + ' días'}`}
                                      </span>
                                    );
                                  } else if (diffDays === 0) {
                                    return (
                                      <span className="ml-2 text-xs text-yellow-600" style={{lineHeight: '1.2'}}>
                                        Vence hoy
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="ml-2 text-xs text-red-600" style={{lineHeight: '1.2'}}>
                                        {`Venció hace ${Math.abs(diffDays) === 1 ? '1 día' : Math.abs(diffDays) + ' días'}`}
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                {transaction.deadline && (
                                  <span className="text-xs text-gray-500">
                                    {texts.due}: {(() => {
                                      // Parse the date string directly to avoid timezone issues
                                      const [year, month, day] = transaction.deadline.split('-').map(Number);
                                      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                                    })()}
                                  </span>
                                )}
                                {transaction.source_type === 'recurrent' && (
                                  (() => {
                                    const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
                                    if (recurrentExpense) {
                                      return (
                                        <>
                                          {transaction.deadline && <span className="text-xs text-gray-400">•</span>}
                                          <span className="text-xs text-gray-500">
                                            {texts.payingFrom} {monthAbbreviations[recurrentExpense.month_from - 1]} {recurrentExpense.year_from} {texts.to} {monthAbbreviations[recurrentExpense.month_to - 1]} {recurrentExpense.year_to}
                                          </span>
                                        </>
                                      )
                                    }
                                    return null
                                  })()
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(transaction))}>
                            {getStatusText(transaction)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={transaction.status === 'paid'}
                              onChange={(e) => {
                                console.log(`🔘 Desktop: Checkbox clicked for transaction ${transaction.id}, checked: ${e.target.checked}`)
                                handleCheckboxChange(transaction.id, e.target.checked)
                              }}
                              className="sr-only"
                              id={`checkbox-${transaction.id}`}
                            />
                            <label
                              htmlFor={`checkbox-${transaction.id}`}
                              className={`
                                sophisticated-checkbox relative inline-flex items-center justify-center w-5 h-5
                                ${transaction.status === 'paid' 
                                  ? 'gradient-emerald glow-emerald' 
                                  : 'bg-white border-2 border-gray-300 hover:border-gray-400 hover:shadow-md'
                                }
                                rounded-lg overflow-hidden
                                ${transaction.status === 'paid' ? 'scale-110' : 'scale-100'}
                              `}
                            >
                              {/* Ripple effect background */}
                              <div className={`
                                absolute inset-0 rounded-lg
                                ${transaction.status === 'paid' 
                                  ? 'bg-gradient-to-br from-emerald-300/30 via-teal-400/30 to-cyan-500/30 animate-pulse-soft' 
                                  : ''
                                }
                              `} />
                              
                              {/* Checkmark with animated stroke */}
                              {transaction.status === 'paid' && (
                                <svg
                                  className="w-3 h-3 text-green-800 relative z-10"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                  style={{
                                    strokeDasharray: '50',
                                    strokeDashoffset: '50',
                                    animation: 'checkmark 0.15s ease-out forwards'
                                  }}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                              
                              {/* Hover effect with gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-all duration-300 rounded-lg" />
                              
                              {/* Glow effect when checked */}
                              {transaction.status === 'paid' && (
                                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 rounded-xl blur-md opacity-40 animate-glow" />
                              )}
                              
                              {/* Click ripple effect */}
                              <div className="absolute inset-0 rounded-lg pointer-events-none">
                                <div className="absolute inset-0 bg-white/30 rounded-lg scale-0 opacity-0 transition-all duration-300 ease-out" />
                              </div>
                            </label>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAttachmentList(transaction)}
                              className="text-gray-600 hover:text-gray-800 relative flex items-center justify-center"
                              title="View attachments"
                            >
                              <Paperclip className="h-4 w-4" />
                              {attachmentCounts[transaction.id] > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                                  {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => handleAttachmentUpload(transaction)}
                              className="text-green-600 hover:text-green-800"
                              title="Upload attachment"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleModifyTransaction(transaction.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modify transaction"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {finalSortedTransactions.map((transaction) => {
                return (
                  <div key={transaction.id} className="bg-white rounded-lg shadow-sm border p-4 mobile-card">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {/* Ícono de tipo de transacción: solo target si es meta, si no, flechas o file */}
                        {transaction.source_type === 'recurrent' && transaction.type === 'expense' && recurrentGoalMap[transaction.source_id] ? (
                          // Solo target para gasto recurrente meta
                          <span title="Meta personal" className="inline-flex items-center ml-1">
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <circle cx="10" cy="10" r="8" stroke="#2563eb" strokeWidth="2" fill="#dbeafe" />
                              <circle cx="10" cy="10" r="4" stroke="#2563eb" strokeWidth="2" fill="#bfdbfe" />
                              <circle cx="10" cy="10" r="1.5" fill="#2563eb" />
                            </svg>
                          </span>
                        ) : transaction.source_type === 'recurrent' ? (
                          transaction.type === 'income' ?
                            <Repeat className="h-5 w-5 text-green-600 flex-shrink-0" /> :
                            <Repeat className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          transaction.type === 'income' ?
                            <FileText className="h-5 w-5 text-green-600 flex-shrink-0" /> :
                            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                            {transaction.description}
                            {transaction.source_type === 'recurrent' && transaction.type === 'expense' && recurrentGoalMap[transaction.source_id] && (
                              <span title="Meta personal" className="inline-flex items-center ml-1">
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <circle cx="10" cy="10" r="8" stroke="#2563eb" strokeWidth="2" fill="#dbeafe" />
                                  <circle cx="10" cy="10" r="4" stroke="#2563eb" strokeWidth="2" fill="#bfdbfe" />
                                  <circle cx="10" cy="10" r="1.5" fill="#2563eb" />
                                </svg>
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {transaction.deadline && (
                              <span className="text-xs text-gray-500">
                                {texts.due}: {(() => {
                                  // Parse the date string directly to avoid timezone issues
                                  const [year, month, day] = transaction.deadline.split('-').map(Number);
                                  return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                                })()}
                              </span>
                            )}
                            {transaction.source_type === 'recurrent' && (
                              (() => {
                                const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
                                if (recurrentExpense) {
                                  return (
                                    <>
                                      {transaction.deadline && <span className="text-xs text-gray-400">•</span>}
                                      <span className="text-xs text-gray-500">
                                        {texts.payingFrom} {monthAbbreviations[recurrentExpense.month_from - 1]} {recurrentExpense.year_from} {texts.to} {monthAbbreviations[recurrentExpense.month_to - 1]} {recurrentExpense.year_to}
                                      </span>
                                    </>
                                  )
                                }
                                return null
                              })()
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-lg text-gray-900">{formatCurrency(transaction.value)}</div>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(transaction))}>
                          {getStatusText(transaction)}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-xs text-gray-500">Tipo:</span>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {transaction.source_type === 'recurrent' ? texts.recurrent : texts.nonRecurrent}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-1">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={transaction.status === 'paid'}
                            onChange={(e) => {
                              console.log(`🔘 Mobile: Checkbox clicked for transaction ${transaction.id}, checked: ${e.target.checked}`)
                              handleCheckboxChange(transaction.id, e.target.checked)
                            }}
                            className="sr-only"
                            id={`checkbox-${transaction.id}`}
                          />
                          <label
                            htmlFor={`checkbox-${transaction.id}`}
                            className={`
                              sophisticated-checkbox relative inline-flex items-center justify-center w-5 h-5
                              ${transaction.status === 'paid' 
                                ? 'gradient-emerald glow-emerald' 
                                : 'bg-white border-2 border-gray-300 hover:border-gray-400 hover:shadow-md'
                              }
                              rounded-lg overflow-hidden
                              ${transaction.status === 'paid' ? 'scale-110' : 'scale-100'}
                            `}
                          >
                            {/* Ripple effect background */}
                            <div className={`
                              absolute inset-0 rounded-lg
                              ${transaction.status === 'paid' 
                                ? 'bg-gradient-to-br from-emerald-300/30 via-teal-400/30 to-cyan-500/30 animate-pulse-soft' 
                                : ''
                              }
                            `} />
                            
                            {/* Checkmark with animated stroke */}
                            {transaction.status === 'paid' && (
                              <svg
                                className="w-3 h-3 text-green-800 relative z-10"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{
                                  strokeDasharray: '50',
                                  strokeDashoffset: '50',
                                  animation: 'checkmark 0.15s ease-out forwards'
                                }}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                            
                            {/* Hover effect with gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-all duration-300 rounded-lg" />
                            
                            {/* Glow effect when checked */}
                            {transaction.status === 'paid' && (
                              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 rounded-xl blur-md opacity-40 animate-glow" />
                            )}
                            
                            {/* Click ripple effect */}
                            <div className="absolute inset-0 rounded-lg pointer-events-none">
                              <div className="absolute inset-0 bg-white/30 rounded-lg scale-0 opacity-0 transition-all duration-300 ease-out" />
                            </div>
                          </label>
                        </div>
                        <span className="text-sm text-gray-600 ml-1">Mark as paid</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAttachmentList(transaction)}
                          className="text-gray-600 hover:text-gray-800 relative flex items-center justify-center"
                          title="View attachments"
                        >
                          <Paperclip className="h-4 w-4" />
                          {attachmentCounts[transaction.id] > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                              {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleAttachmentUpload(transaction)}
                          className="text-green-600 hover:text-green-800"
                          title="Upload attachment"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleModifyTransaction(transaction.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modify transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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

      {/* Modify Confirmation Modal */}
      {showModifyModal && modifyModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={handleCancelModify}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-5 flex flex-col gap-4 items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                <Edit className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Modificar Transacción</h2>
              <p className="text-gray-700 text-sm font-medium mb-4 text-center">Selecciona cómo quieres modificar esta transacción</p>
              
              {/* Información de la transacción */}
              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Descripción:</span>
                    <span className="text-sm text-gray-900 font-semibold">{modifyModalData.transaction.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Valor:</span>
                    <span className="text-sm text-gray-900 font-semibold">{formatCurrency(modifyModalData.transaction.value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Fecha:</span>
                    <span className="text-sm text-gray-900 font-semibold">
                      {modifyModalData.transaction.deadline ? (() => {
                        const [year, month, day] = modifyModalData.transaction.deadline!.split('-').map(Number);
                        return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                      })() : `${months[modifyModalData.transaction.month - 1]} ${modifyModalData.transaction.year}`}
                    </span>
                  </div>
                </div>
              </div>

              {modifyModalData.isRecurrent ? (
                <div className="w-full bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">i</span>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">Esta es una transacción recurrente</p>
                      <p className="text-xs text-blue-700">Elige qué quieres modificar:</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-xs font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">¿Estás seguro de que quieres modificar esta transacción?</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full space-y-3">
                {modifyModalData.isRecurrent ? (
                  <>
                    <button
                      onClick={() => handleConfirmModify(true)}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Modificar Toda la Serie
                    </button>
                    <button
                      onClick={() => handleConfirmModify(false)}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Modificar Solo Esta Transacción
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConfirmModify(false)}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    Modificar Transacción
                  </button>
                )}
                
                <button
                  onClick={handleCancelModify}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={resetModifyForm}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {modifyFormData.modifySeries ? (
              // Full form for series modification
              modifyFormData.type === 'recurrent' ? (
                // Recurrent Expense Form
                <form onSubmit={handleModifyFormSubmit} className="flex flex-col gap-6 p-6 sm:p-8 bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-auto animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <button
                      type="button"
                      onClick={resetModifyForm}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none focus:underline"
                    >
                      ← Cancelar
                    </button>
                  </div>

                  {/* Descripción */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Descripción</label>
                    <input
                      type="text"
                      value={modifyFormData.description}
                      onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                      placeholder="Descripción"
                      required
                    />
                  </div>

                  {/* Mes y Año */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4">
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Mes desde</label>
                        <select
                          value={modifyFormData.month_from}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month_from: Number(e.target.value) } : null)}
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
                          value={modifyFormData.year_from}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year_from: Number(e.target.value) } : null)}
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
                          value={modifyFormData.month_to}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month_to: Number(e.target.value) } : null)}
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
                          value={modifyFormData.year_to}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year_to: Number(e.target.value) } : null)}
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

                  {/* Monto y Día de Vencimiento */}
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Monto ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(modifyFormData.value)}
                        onChange={(e) => setModifyFormData(prev => prev ? { 
                          ...prev, 
                          value: parseCurrency(e.target.value)
                        } : null)}
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
                        value={modifyFormData.payment_day_deadline}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_day_deadline: e.target.value } : null)}
                        placeholder="15"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Checkbox de meta (isgoal) solo para GASTO/RECURRENTE */}
                  {modifyFormData.type === 'recurrent' && modifyFormData.modifySeries && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-2 shadow-sm">
                      <input
                        id="isgoal-checkbox"
                        type="checkbox"
                        checked={modifyFormData.isgoal || false}
                        onChange={e => setModifyFormData(prev => prev ? { ...prev, isgoal: e.target.checked } : null)}
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
                      onClick={resetModifyForm}
                      className="px-6 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              ) : (
                // Non-Recurrent Expense Form
                <form onSubmit={handleModifyFormSubmit} className="flex flex-col gap-6 p-6 sm:p-8 bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-auto animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <button
                      type="button"
                      onClick={resetModifyForm}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none focus:underline"
                    >
                      ← Cancelar
                    </button>
                  </div>

                  {/* Descripción */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Descripción</label>
                    <input
                      type="text"
                      value={modifyFormData.description}
                      onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                      placeholder="Descripción"
                      required
                    />
                  </div>

                  {/* Mes y Año */}
                  <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Mes</label>
                      <select
                        value={modifyFormData.month}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month: Number(e.target.value) } : null)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                        required
                      >
                        {months.map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Año</label>
                      <select
                        value={modifyFormData.year}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year: Number(e.target.value) } : null)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                        required
                      >
                        {availableYears.map((year, index) => (
                          <option key={index} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Monto y Fecha de Vencimiento */}
                  <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Monto ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(modifyFormData.value)}
                        onChange={(e) => setModifyFormData(prev => prev ? { 
                          ...prev, 
                          value: parseCurrency(e.target.value)
                        } : null)}
                        placeholder="$0.00"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                        required
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        value={modifyFormData.payment_deadline}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                      />
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      onClick={resetModifyForm}
                      className="px-6 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              )
            ) : (
              // Simple form for individual transaction modification
              <form onSubmit={handleModifyFormSubmit} className="flex flex-col gap-6 p-6 sm:p-8 bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
                    onClick={resetModifyForm}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none focus:underline"
                  >
                    ← Cancelar
                  </button>
                </div>

                {/* Descripción */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <input
                    type="text"
                    value={modifyFormData.description}
                    onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                    placeholder="Descripción"
                    required
                  />
                </div>

                {/* Monto y Fecha de Vencimiento */}
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Monto ($)</label>
                    <input
                      type="text"
                      value={getCurrencyInputValue(modifyFormData.value)}
                      onChange={(e) => setModifyFormData(prev => prev ? { 
                        ...prev, 
                        value: parseCurrency(e.target.value)
                      } : null)}
                      placeholder="$0.00"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400"
                      required
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={modifyFormData.payment_deadline}
                      onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={resetModifyForm}
                    className="px-6 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {/* Modify Confirmation Modal */}
      {showModifyConfirmation && modifyConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
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

            <div className="p-5 flex flex-col gap-4 items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Confirmar Modificación</h2>
              <p className="text-gray-700 text-sm font-medium mb-4 text-center">Revisa los cambios antes de confirmar</p>
              
              {/* Información de la modificación */}
              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Acción:</span>
                    <span className="text-sm text-gray-900 font-semibold capitalize">{modifyConfirmationData.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Tipo:</span>
                    <span className="text-sm text-gray-900 font-semibold">
                      {modifyConfirmationData.type === 'recurrent' ? 'Recurrente' : 'No Recurrente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Descripción:</span>
                    <span className="text-sm text-gray-900 font-semibold">{modifyConfirmationData.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Valor:</span>
                    <span className="text-sm text-gray-900 font-semibold">{formatCurrency(modifyConfirmationData.value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Período:</span>
                    <span className="text-sm text-gray-900 font-semibold">{modifyConfirmationData.period}</span>
                  </div>
                </div>
              </div>

              <div className="w-full bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      ¿Estás seguro de que quieres {modifyConfirmationData.action}?
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">Esta acción no se puede deshacer</p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={handleConfirmModifySubmit}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-md hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    'Confirmar y Guardar'
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowModifyConfirmation(false)
                    setModifyConfirmationData(null)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* File Upload Modal */}
      {showAttachmentModal && selectedTransactionForAttachment && (
        <FileUploadModal
          isOpen={showAttachmentModal}
          onClose={() => {
            setShowAttachmentModal(false)
            setSelectedTransactionForAttachment(null)
          }}
          transactionId={selectedTransactionForAttachment.id}
          userId={user.id}
          onUploadComplete={handleAttachmentUploadComplete}
        />
      )}

      {/* Attachments List Modal */}
      {showAttachmentsList && selectedTransactionForList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Attachments for: {selectedTransactionForList.description}
              </h2>
              <button
                onClick={() => {
                  setShowAttachmentsList(false)
                  setSelectedTransactionForList(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <TransactionAttachments
              transactionId={selectedTransactionForList.id}
              userId={user.id}
              onAttachmentDeleted={handleAttachmentDeleted}
            />
          </div>
        </div>
      )}
    </div>
  )
} 