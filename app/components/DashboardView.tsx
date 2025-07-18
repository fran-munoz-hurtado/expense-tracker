'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, Paperclip, ChevronUp, ChevronDown, Tag, Info } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, fetchAttachmentCounts, measureQueryPerformance, clearUserCache } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDataSync, useDataSyncEffect } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'
import TransactionIcon from './TransactionIcon'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'
import { getUserActiveCategories, addUserCategory } from '@/lib/services/categoryService'

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
  const navigation = useAppNavigation()
  
  // Navigation function to redirect to Mis Metas with goal expansion
  const handleNavigateToGoal = async (transaction: Transaction) => {
    try {
      console.log(`🎯 DashboardView: Navigating to Mis Metas for goal transaction:`, {
        id: transaction.id,
        description: transaction.description,
        source_type: transaction.source_type,
        source_id: transaction.source_id
      })
      
      // Create goal key in the same format as MisMetasView
      const goalKey = `${transaction.source_type}-${transaction.source_id}`
      
      // Construct the correct URL for Mis Metas with expansion parameter
      const targetUrl = new URL(window.location.origin + window.location.pathname)
      targetUrl.searchParams.set('view', 'mis-metas')
      targetUrl.searchParams.set('year', transaction.year.toString())
      targetUrl.searchParams.set('expandGoal', goalKey)
      
      console.log(`🎯 DashboardView: Navigating to URL:`, targetUrl.toString())
      
      // Navigate directly using window.location to ensure proper page transition
      window.location.href = targetUrl.toString()
      
    } catch (error) {
      console.error('❌ DashboardView: Navigation error:', error)
    }
  }
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(navigationParams?.month || new Date().getMonth() + 1)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'recurrent' | 'non_recurrent'>('all')
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  
  // Sorting state
  const [sortField, setSortField] = useState<'description' | 'deadline' | 'status' | 'value' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Expandable filters state
  const [filtersExpanded, setFiltersExpanded] = useState(false)

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
    category?: string
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

  // Tooltip state for header metrics
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  // Category editing modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedTransactionForCategory, setSelectedTransactionForCategory] = useState<Transaction | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [newCategoryInput, setNewCategoryInput] = useState<string>('')
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [showDuplicateCategoryModal, setShowDuplicateCategoryModal] = useState(false)
  const [duplicateCategoryName, setDuplicateCategoryName] = useState<string>('')

  // Add category state (matching CategoriesView)
  const [addingCategory, setAddingCategory] = useState(false)
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null)

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
        modifySeries: false,
        category: transaction.category
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
          isgoal: recurrentExpense.isgoal || false,
          category: transaction.category
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
            modifySeries: false,
            category: transaction.category
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
            modifySeries: false,
            category: transaction.category
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
      ? `${months[modifyFormData.month_from - 1]} ${modifyFormData.year_from} a ${months[modifyFormData.month_to - 1]} ${modifyFormData.year_to}`
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
    // Close the attachments list modal if it's open
    setShowAttachmentsList(false)
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
    
    // Reopen the attachments list modal to show the updated list
    if (selectedTransactionForAttachment) {
      setSelectedTransactionForList(selectedTransactionForAttachment)
      setShowAttachmentsList(true)
    }
    
    console.log('Attachment uploaded:', attachment)
  }

  const handleAttachmentDeleted = (attachmentId: number) => {
    // Refresh attachment counts by refetching data
    fetchData()
    console.log('Attachment deleted:', attachmentId)
  }

  // Handle category editing
  const handleCategoryClick = (transaction: Transaction) => {
    console.log('Category clicked for transaction:', transaction.id, transaction.description)
    setSelectedTransactionForCategory(transaction)
    setSelectedCategory(transaction.category || '')
    setShowCategoryModal(true)
    
    // Load available categories when modal opens
    loadAvailableCategories()
  }

  // Category management functions (replicated from app/page.tsx)
  const getAvailableCategories = (): string[] => {
    // Get predefined categories (excluding 'Otros')
    const predefinedCategories = Object.values(CATEGORIES.EXPENSE)
      .filter(cat => cat !== 'Otros')
      .sort()
    
    // Combine with custom categories and sort
    const allCategories = [...predefinedCategories, ...customCategories].sort()
    
    // Return all categories without prioritizing 'Otros'
    return allCategories
  }

  const loadAvailableCategories = async () => {
    try {
      // Get active categories from database for this user
      const categories = await getUserActiveCategories(user.id)
      
      // Set available categories directly from database
      // getUserActiveCategories already returns sorted categories including "Sin categoría"
      setAvailableCategories(categories)
      
    } catch (error) {
      console.error('Error loading categories:', error)
      // Fallback to basic categories if database fails
      setAvailableCategories(['Sin categoría', 'Mercado y comida', 'Casa y servicios', 'Transporte', 'Salud', 'Diversión', 'Otros'])
    }
  }

  const handleCategorySelection = (category: string) => {
    setSelectedCategory(category)
    setCustomCategoryInput('')
  }

  const handleCustomCategoryInputChange = (value: string) => {
    setCustomCategoryInput(value)
  }

  const handleUpdateCategory = async () => {
    if (!selectedTransactionForCategory) return

    // Handle "Sin categoría" selection specifically
    const finalCategory = selectedCategory === 'Sin categoría' ? 'sin categoría' : (selectedCategory || 'sin categoría')

    try {
      setLoading(true)
      setError(null)

      if (selectedTransactionForCategory.source_type === 'recurrent') {
        // Update recurrent transaction series
        console.log('Updating recurrent transaction series with category:', finalCategory)
        
        // Update the recurrent expense
        const { error: recurrentError } = await supabase
          .from('recurrent_expenses')
          .update({ category: finalCategory })
          .eq('id', selectedTransactionForCategory.source_id)
          .eq('user_id', user.id)

        if (recurrentError) throw recurrentError

        // Update all transactions in the series
        const { error: transactionsError } = await supabase
          .from('transactions')
          .update({ category: finalCategory })
          .eq('source_id', selectedTransactionForCategory.source_id)
          .eq('source_type', 'recurrent')
          .eq('user_id', user.id)

        if (transactionsError) throw transactionsError

      } else {
        // Update non-recurrent transaction
        console.log('Updating non-recurrent transaction with category:', finalCategory)
        
        // Update the non-recurrent expense
        const { error: nonRecurrentError } = await supabase
          .from('non_recurrent_expenses')
          .update({ category: finalCategory })
          .eq('id', selectedTransactionForCategory.source_id)
          .eq('user_id', user.id)

        if (nonRecurrentError) throw nonRecurrentError

        // Update the transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .update({ category: finalCategory })
          .eq('id', selectedTransactionForCategory.id)
          .eq('user_id', user.id)

        if (transactionError) throw transactionError
      }

      // Update local state optimistically to preserve the status while updating category
      setTransactions(prevTransactions => 
        prevTransactions.map(t => {
          if (selectedTransactionForCategory.source_type === 'recurrent') {
            // For recurrent transactions, update all transactions in the series
            return t.source_id === selectedTransactionForCategory.source_id && 
                   t.source_type === 'recurrent' 
              ? { ...t, category: finalCategory } 
              : t
          } else {
            // For non-recurrent transactions, update only the specific transaction
            return t.id === selectedTransactionForCategory.id 
              ? { ...t, category: finalCategory } 
              : t
          }
        })
      )

      // Close modal and reset state
      setShowCategoryModal(false)
      setSelectedTransactionForCategory(null)
      setSelectedCategory('')
      setCustomCategoryInput('')
      setShowAddCategoryInput(false)
      setNewCategoryInput('')
      setShowDuplicateCategoryModal(false)
      setDuplicateCategoryName('')

      // Trigger global data refresh to synchronize with other views
      console.log('🔄 Triggering global data refresh after successful category update')
      refreshData(user.id, 'update_category')
      
      console.log('✅ Category update completed - optimistic update applied and global sync triggered')
      
    } catch (error) {
      console.error('Error updating category:', error)
      setError(`Error al actualizar categoría: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // On error, trigger global refresh to reset to database state
      console.log('🔄 Triggering global data refresh after category update error')
      refreshData(user.id, 'update_category_error')
    } finally {
      setLoading(false)
    }
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
    if (transaction.status === 'paid') return `bg-blue-100 text-blue-800`
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

  // Handle adding new category (matching CategoriesView logic)
  const handleAddCategory = async () => {
    if (!newCategoryInput.trim()) {
      setAddCategoryError('El nombre de la categoría no puede estar vacío')
      return
    }

    setAddingCategory(true)
    setAddCategoryError(null)

    try {
      const result = await addUserCategory(user.id, newCategoryInput.trim())
      
      if (result.success) {
        // Reset form and reload categories
        setNewCategoryInput('')
        setShowAddCategoryInput(false)
        await loadAvailableCategories()
        
        // Select the newly added category
        setSelectedCategory(newCategoryInput.trim())
        
        // Notify other views that a new category has been added
        refreshData(user.id, 'add_category')
      } else {
        setAddCategoryError(result.error || 'Error al agregar la categoría')
      }
    } catch (error) {
      console.error('Error adding category:', error)
      setAddCategoryError('Error interno del servidor')
    } finally {
      setAddingCategory(false)
    }
  }

  // Handle cancel add category (matching CategoriesView logic)
  const handleCancelAddCategory = () => {
    setShowAddCategoryInput(false)
    setNewCategoryInput('')
    setAddCategoryError(null)
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4"></div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 mb-1">{texts.errorOccurred}</h3>
              <div className="text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Compact Filters Section */}
      <div className="mt-2 mb-4 bg-white border border-border-light rounded-mdplus shadow-soft">
        {/* Filter Toggle Button */}
        <div className="p-3 border-b border-border-light">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between text-left hover:bg-[#f5f5f1] hover:shadow-sm rounded-lg p-2 transition-colors duration-200 ease-in-out"
          >
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-beige rounded-lg">
                <svg className="h-3 w-3 text-green-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-green-dark font-sans">Filtros Avanzados</h3>
              <div className="text-xs text-green-dark bg-beige px-2 py-0.5 rounded-full">
                {finalSortedTransactions.length} resultados
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Active filters summary */}
              <div className="flex items-center space-x-1 text-xs">
                <span className="bg-info-bg text-info-blue px-1.5 py-0.5 rounded-full font-medium">
                  {months[selectedMonth - 1]} {selectedYear}
                </span>
                {filterType !== 'all' && (
                  <span className="bg-info-bg text-info-blue px-1.5 py-0.5 rounded-full font-medium">
                    {filterType === 'recurrent' ? 'Recurrentes' : 'Únicos'}
                  </span>
                )}
              </div>
              <div className={`transform transition-transform duration-200 ease-in-out ${filtersExpanded ? 'rotate-180' : ''}`}>
                <svg className="h-4 w-4 text-green-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Expandable Filters Content */}
        {filtersExpanded && (
          <div className="p-3 border-t border-border-light">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Modern Year Filter */}
              <div className="relative group">
                <label className="block text-xs font-medium text-gray-dark mb-1 font-sans">Año</label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-neutral-bg border border-border-light rounded-mdplus shadow-soft focus:ring-2 focus:ring-green-primary focus:border-green-primary transition-all duration-200 appearance-none cursor-pointer hover:border-green-primary group-hover:shadow-sm text-sm text-gray-dark font-sans"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-3 w-3 text-green-dark group-hover:text-gray-dark transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Modern Month Filter */}
              <div className="relative group">
                <label className="block text-xs font-medium text-gray-dark mb-1 font-sans">Mes</label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-neutral-bg border border-border-light rounded-mdplus shadow-soft focus:ring-2 focus:ring-green-primary focus:border-green-primary transition-all duration-200 appearance-none cursor-pointer hover:border-green-primary group-hover:shadow-sm text-sm text-gray-dark font-sans"
                  >
                    {months.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-3 w-3 text-green-dark group-hover:text-gray-dark transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Modern Type Filter - Toggle Buttons */}
              <div className="relative group">
                <label className="block text-xs font-medium text-gray-dark mb-1 font-sans">Tipo</label>
                <div className="flex space-x-1 bg-neutral-bg p-1 rounded-mdplus border border-border-light">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-mdplus transition-all duration-200 font-sans ${
                      filterType === 'all'
                        ? 'bg-green-primary text-white shadow-soft'
                        : 'bg-neutral-bg text-green-dark border border-border-light hover:bg-border-light'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterType('recurrent')}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-mdplus transition-all duration-200 font-sans ${
                      filterType === 'recurrent'
                        ? 'bg-green-primary text-white shadow-soft'
                        : 'bg-neutral-bg text-green-dark border border-border-light hover:bg-border-light'
                    }`}
                  >
                    Recurrentes
                  </button>
                  <button
                    onClick={() => setFilterType('non_recurrent')}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-mdplus transition-all duration-200 font-sans ${
                      filterType === 'non_recurrent'
                        ? 'bg-green-primary text-white shadow-soft'
                        : 'bg-neutral-bg text-green-dark border border-border-light hover:bg-border-light'
                    }`}
                  >
                    Únicos
                  </button>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="relative group">
                <label className="block text-xs font-medium text-gray-dark mb-1 font-sans">Acciones</label>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedYear(new Date().getFullYear());
                      setSelectedMonth(new Date().getMonth() + 1);
                      setFilterType('all');
                    }}
                    className="w-full px-2 py-1.5 bg-green-primary text-white text-xs font-medium rounded-mdplus shadow-soft hover:bg-[#77b16e] active:bg-[#5d9f67] transition-all duration-200 transform hover:scale-[1.005] hover:shadow-sm font-sans"
                  >
                    Mes Actual
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white border border-border-light rounded-xl shadow-soft p-3">
        <div className="px-6 py-4 border-b border-border-light">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            <h2 className="text-lg font-semibold text-gray-dark font-sans">
              {texts.forMonth} {months[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-green-dark font-sans">{texts.loading}</div>
        ) : finalSortedTransactions.length === 0 ? (
          <div className="p-6 text-center text-green-dark font-sans">{texts.empty.noTransactions}</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto" onMouseLeave={() => setHoveredRow(null)}>
              <table className="min-w-full divide-y divide-border-light">
                <thead className="bg-neutral-bg">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase tracking-wider cursor-pointer hover:bg-border-light select-none font-sans"
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
                      className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase tracking-wider cursor-pointer hover:bg-border-light select-none font-sans"
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
                      className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase tracking-wider cursor-pointer hover:bg-border-light select-none font-sans"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase tracking-wider font-sans">
                      {texts.paid}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase tracking-wider font-sans">
                      {texts.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border-light">
                  {finalSortedTransactions.map((transaction) => {
                    const isSavingsTransaction = transaction.category === 'Ahorro'
                    return (
                      <tr key={transaction.id} className={`bg-white hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 rounded-md ${isSavingsTransaction ? 'border-l-4 border-[#88c57f]' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {/* Usar TransactionIcon parametrizado */}
                              <TransactionIcon 
                                transaction={transaction}
                                recurrentGoalMap={recurrentGoalMap}
                                size="w-4 h-4"
                                showBackground={true}
                              />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-dark flex items-center gap-2 transaction-description font-sans">
                                <span>{transaction.description}</span>
                                {/* Navigation Link Icon for Goal Transactions */}
                                {transaction.source_type === 'recurrent' && transaction.type === 'expense' && recurrentGoalMap[transaction.source_id] && (
                                  <button
                                    onClick={() => handleNavigateToGoal(transaction)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors duration-200 p-1 rounded-md hover:bg-blue-50"
                                    title={`Ir a Mis Metas - ${transaction.description}`}
                                  >
                                    <svg 
                                      className="w-3 h-3" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                )}
                                {/* Days until due - moved to right side of description */}
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
                                      <span className="text-xs font-medium text-warning-yellow bg-warning-bg px-2 py-1 rounded-full">
                                        {`Vence en ${diffDays === 1 ? '1 día' : diffDays + ' días'}`}
                                      </span>
                                    );
                                  } else if (diffDays === 0) {
                                    return (
                                      <span className="text-xs font-medium text-warning-yellow bg-warning-bg px-2 py-1 rounded-full">
                                        Vence hoy
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="text-xs font-medium text-error-red bg-error-bg px-2 py-1 rounded-full">
                                        {`Venció hace ${Math.abs(diffDays) === 1 ? '1 día' : Math.abs(diffDays) + ' días'}`}
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                              
                              {/* Due date and additional info below description */}
                              <div className="flex items-center gap-4 mt-1">
                                {/* Due date */}
                                {transaction.deadline && (
                                  <span className="text-xs font-medium text-green-dark font-sans">
                                    Vence: {(() => {
                                      const [year, month, day] = transaction.deadline.split('-').map(Number);
                                      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                                    })()}
                                  </span>
                                )}
                                
                                {/* Date range for recurrent transactions */}
                                {transaction.source_type === 'recurrent' && (
                                  (() => {
                                    const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
                                    if (recurrentExpense) {
                                      return (
                                        <span className="text-xs font-medium text-green-dark font-sans">
                                          {monthAbbreviations[recurrentExpense.month_from - 1]} {recurrentExpense.year_from} - {monthAbbreviations[recurrentExpense.month_to - 1]} {recurrentExpense.year_to}
                                        </span>
                                      )
                                    }
                                    return null
                                  })()
                                )}
                                
                                {/* Category */}
                                {transaction.type === 'expense' && 
                                 !(transaction.category === 'Ahorro' && 
                                   (transaction.source_type === 'recurrent' ? !recurrentGoalMap[transaction.source_id] : true)) && (
                                  <button
                                    onClick={() => handleCategoryClick(transaction)}
                                    className="text-xs font-medium text-green-dark bg-beige px-2 py-1 rounded-full hover:bg-border-light hover:text-gray-dark transition-colors cursor-pointer font-sans"
                                  >
                                    {transaction.category && transaction.category !== 'sin categoría' 
                                      ? transaction.category 
                                      : 'sin categoría'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-sans", 
                            transaction.status === 'paid' ? 'bg-green-light text-green-primary' :
                            transaction.deadline && isDateOverdue(transaction.deadline) ? 'bg-error-bg text-error-red' : 
                            'bg-warning-bg text-warning-yellow'
                          )}>
                            {getStatusText(transaction)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-dark transaction-amount font-sans"> 
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
                                  ? 'bg-green-primary border-green-primary' 
                                  : 'bg-beige border-2 border-border-light hover:border-green-primary hover:shadow-soft'
                                }
                                rounded-full overflow-hidden cursor-pointer
                                transition-all duration-200
                                ${transaction.status === 'paid' ? 'scale-110' : 'scale-100'}
                              `}
                            >
                              {/* Checkmark with white color */}
                              {transaction.status === 'paid' && (
                                <svg
                                  className="w-3 h-3 text-white relative z-10"
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
                              
                              {/* Hover effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-all duration-300 rounded-full" />
                            </label>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAttachmentList(transaction)}
                              className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 relative flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105"
                              title="View attachments"
                            >
                              <Paperclip className="h-4 w-4" />
                              {attachmentCounts[transaction.id] > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-warning-bg text-gray-700 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-normal">
                                  {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => handleModifyTransaction(transaction.id)}
                              className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 p-2 rounded-md transition-all duration-200 hover:scale-105"
                              title="Modify transaction"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 p-2 rounded-md transition-all duration-200 hover:scale-105"
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
                const isSavingsTransaction = transaction.category === 'Ahorro'
                return (
                  <div key={transaction.id} className={`bg-white rounded-lg shadow-soft border border-border-light p-4 mobile-card hover:bg-[#f5f6f4] hover:shadow-soft transition-all duration-150 ${isSavingsTransaction ? 'border-l-4 border-[#88c57f]' : ''}`}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {/* Usar TransactionIcon parametrizado - Mobile */}
                        <TransactionIcon 
                          transaction={transaction}
                          recurrentGoalMap={recurrentGoalMap}
                          size="w-4 h-4"
                          showBackground={true}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-medium text-gray-dark truncate flex items-center gap-2 transaction-description font-sans">
                            <span>{transaction.description}</span>
                            {/* Navigation Link Icon for Goal Transactions - Mobile View */}
                            {transaction.source_type === 'recurrent' && transaction.type === 'expense' && recurrentGoalMap[transaction.source_id] && (
                              <button
                                onClick={() => handleNavigateToGoal(transaction)}
                                className="text-gray-400 hover:text-blue-600 transition-colors duration-200 p-1 rounded-md hover:bg-blue-50"
                                title={`Ir a Mis Metas - ${transaction.description}`}
                              >
                                <svg 
                                  className="w-3 h-3" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            )}
                            {/* Days until due - added to mobile view */}
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
                                  <span className="text-xs font-medium text-warning-yellow bg-warning-bg px-2 py-1 rounded-full">
                                    {`Vence en ${diffDays === 1 ? '1 día' : diffDays + ' días'}`}
                                  </span>
                                );
                              } else if (diffDays === 0) {
                                return (
                                  <span className="text-xs font-medium text-warning-yellow bg-warning-bg px-2 py-1 rounded-full">
                                    Vence hoy
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-xs font-medium text-error-red bg-error-bg px-2 py-1 rounded-full">
                                    {`Venció hace ${Math.abs(diffDays) === 1 ? '1 día' : Math.abs(diffDays) + ' días'}`}
                                  </span>
                                );
                              }
                            })()}
                          </h3>
                          
                          {/* Due date and additional info below description */}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {/* Due date */}
                            {transaction.deadline && (
                              <span className="text-xs font-medium text-green-dark font-sans">
                                Vence: {(() => {
                                  const [year, month, day] = transaction.deadline.split('-').map(Number);
                                  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                                })()}
                              </span>
                            )}
                            
                            {/* Date range for recurrent transactions */}
                            {transaction.source_type === 'recurrent' && (
                              (() => {
                                const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
                                if (recurrentExpense) {
                                  return (
                                    <span className="text-xs font-medium text-green-dark font-sans">
                                      {monthAbbreviations[recurrentExpense.month_from - 1]} {recurrentExpense.year_from} - {monthAbbreviations[recurrentExpense.month_to - 1]} {recurrentExpense.year_to}
                                    </span>
                                  )
                                }
                                return null
                              })()
                            )}
                            
                            {/* Category */}
                            {transaction.type === 'expense' && 
                             !(transaction.category === 'Ahorro' && 
                               (transaction.source_type === 'recurrent' ? !recurrentGoalMap[transaction.source_id] : true)) && (
                              <button
                                onClick={() => handleCategoryClick(transaction)}
                                className="text-xs font-medium text-green-dark bg-beige px-2 py-1 rounded-full hover:bg-border-light hover:text-gray-dark transition-colors cursor-pointer font-sans"
                              >
                                {transaction.category && transaction.category !== 'sin categoría' 
                                  ? transaction.category 
                                  : 'sin categoría'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-xs text-gray-dark transaction-amount font-sans">{formatCurrency(transaction.value)}</div>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans", 
                          transaction.status === 'paid' ? 'bg-green-light text-green-primary' :
                          transaction.deadline && isDateOverdue(transaction.deadline) ? 'bg-error-bg text-error-red' : 
                          'bg-warning-bg text-warning-yellow'
                        )}>
                          {getStatusText(transaction)}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-xs text-green-dark font-sans">Tipo:</span>
                        <div className="text-sm font-medium text-gray-dark capitalize font-sans">
                          {transaction.source_type === 'recurrent' ? texts.recurrent : texts.nonRecurrent}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border-light">
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
                                ? 'bg-green-primary border-green-primary' 
                                : 'bg-beige border-2 border-border-light hover:border-green-primary hover:shadow-soft'
                              }
                              rounded-full overflow-hidden cursor-pointer
                              transition-all duration-200
                              ${transaction.status === 'paid' ? 'scale-110' : 'scale-100'}
                            `}
                          >
                            {/* Checkmark with white color */}
                            {transaction.status === 'paid' && (
                              <svg
                                className="w-3 h-3 text-white relative z-10"
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
                            
                            {/* Hover effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-all duration-300 rounded-full" />
                          </label>
                        </div>
                        <span className="text-sm text-gray-dark ml-1 font-sans">Mark as paid</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAttachmentList(transaction)}
                          className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 relative flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105"
                          title="View attachments"
                        >
                          <Paperclip className="h-4 w-4" />
                          {attachmentCounts[transaction.id] > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-warning-bg text-gray-700 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-normal">
                              {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleModifyTransaction(transaction.id)}
                          className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 p-2 rounded-md transition-all duration-200 hover:scale-105"
                          title="Modify transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 p-2 rounded-md transition-all duration-200 hover:scale-105"
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
                <div className="w-full bg-error-bg border border-red-200 rounded-lg p-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <Info className="h-3 w-3 text-error-red" />
                    </div>
                    <div>
                      <p className="text-sm text-error-red font-medium mb-0.5">Esta es una transacción de gasto recurrente.</p>
                      <p className="text-sm text-error-red">Elige qué quieres eliminar:</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-error-bg border border-red-200 rounded-lg p-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <Info className="h-3 w-3 text-error-red" />
                    </div>
                    <div>
                      <p className="text-sm text-error-red">¿Estás seguro de que quieres eliminar esta transacción?</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="w-full space-y-2">
                {deleteModalData.isRecurrent ? (
                  <>
                    <button
                      onClick={() => handleConfirmDelete(true)}
                      className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Toda la Serie
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(false)}
                      className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Solo Esta Transacción
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConfirmDelete(false)}
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

      {/* Modify Confirmation Modal */}
      {showModifyModal && modifyModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={handleCancelModify}
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
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <span className="text-sm font-medium text-gray-900">{modifyModalData.transaction.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Valor:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(modifyModalData.transaction.value)}</span>
                </div>
                <div className="flex justify-between">
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
                      <p className="text-sm text-green-primary font-medium mb-0.5">Esta es una transacción recurrente</p>
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
                  onClick={handleCancelModify}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <button
              onClick={resetModifyForm}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 z-10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {modifyFormData.modifySeries ? (
              // Full form for series modification
              modifyFormData.type === 'recurrent' ? (
                // Recurrent Expense Form
                <form onSubmit={handleModifyFormSubmit} className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                      <Edit className="h-4 w-4 text-green-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Modificar Serie Recurrente</h2>
                  </div>

                  {/* Descripción */}
                  {!(modifyFormData.type === 'recurrent' && modifyFormData.category === 'Ahorro') && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Descripción</label>
                      <input
                        type="text"
                        value={modifyFormData.description}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                        placeholder="Descripción"
                        required
                      />
                    </div>
                  )}

                  {/* Período */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-dark">Mes desde</label>
                        <select
                          value={modifyFormData.month_from}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month_from: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-dark">Año desde</label>
                        <select
                          value={modifyFormData.year_from}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year_from: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-dark">Mes hasta</label>
                        <select
                          value={modifyFormData.month_to}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month_to: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-dark">Año hasta</label>
                        <select
                          value={modifyFormData.year_to}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year_to: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Monto ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(modifyFormData.value)}
                        onChange={(e) => setModifyFormData(prev => prev ? { 
                          ...prev, 
                          value: parseCurrency(e.target.value)
                        } : null)}
                        placeholder="$0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Día de Vencimiento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={modifyFormData.payment_day_deadline}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_day_deadline: e.target.value } : null)}
                        placeholder="15"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Checkbox de meta (isgoal) solo para GASTO/RECURRENTE */}
                  {modifyFormData.type === 'recurrent' && modifyFormData.modifySeries && (
                    <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
                      <input
                        id="isgoal-checkbox"
                        type="checkbox"
                        checked={modifyFormData.isgoal || false}
                        onChange={e => setModifyFormData(prev => prev ? { ...prev, isgoal: e.target.checked } : null)}
                        className="w-4 h-4 text-green-primary border-gray-300 rounded focus:ring-green-primary focus:ring-2 mt-0.5"
                      />
                      <label htmlFor="isgoal-checkbox" className="flex-1 text-sm text-gray-700 cursor-pointer">
                        ¿Este gasto recurrente es una <span className="font-medium">meta</span> que quieres cumplir?
                        <span className="block text-xs text-gray-500 mt-1">
                          Ejemplo: pagar un carro, un viaje, un crédito, etc. Marca esta opción si este gasto es un objetivo personal que estás pagando mes a mes.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={resetModifyForm}
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
              ) : (
                // Non-Recurrent Expense Form
                <form onSubmit={handleModifyFormSubmit} className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                      <Edit className="h-4 w-4 text-green-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Modificar Transacción</h2>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-dark">Descripción</label>
                    <input
                      type="text"
                      value={modifyFormData.description}
                      onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                      placeholder="Descripción"
                      required
                    />
                  </div>

                  {/* Mes y Año */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Mes</label>
                      <select
                        value={modifyFormData.month}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month: Number(e.target.value) } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                        required
                      >
                        {months.map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Año</label>
                      <select
                        value={modifyFormData.year}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year: Number(e.target.value) } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                        required
                      >
                        {availableYears.map((year, index) => (
                          <option key={index} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Monto y Fecha de Vencimiento */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Monto ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(modifyFormData.value)}
                        onChange={(e) => setModifyFormData(prev => prev ? { 
                          ...prev, 
                          value: parseCurrency(e.target.value)
                        } : null)}
                        placeholder="$0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        value={modifyFormData.payment_deadline}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                      />
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={resetModifyForm}
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
              )
            ) : (
              // Simple form for individual transaction modification
              <form onSubmit={handleModifyFormSubmit} className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                    <Edit className="h-4 w-4 text-green-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Modificar Transacción</h2>
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-dark">Descripción</label>
                  <input
                    type="text"
                    value={modifyFormData.description}
                    onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                    placeholder="Descripción"
                    required
                  />
                </div>

                {/* Monto y Fecha de Vencimiento */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-dark">Monto ($)</label>
                    <input
                      type="text"
                      value={getCurrencyInputValue(modifyFormData.value)}
                      onChange={(e) => setModifyFormData(prev => prev ? { 
                        ...prev, 
                        value: parseCurrency(e.target.value)
                      } : null)}
                      placeholder="$0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-dark">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={modifyFormData.payment_deadline}
                      onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetModifyForm}
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
            )}
          </section>
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
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    'Guardar cambios'
                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-md shadow-sm border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowAttachmentsList(false)
                setSelectedTransactionForList(null)
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full">
                  <Paperclip className="h-4 w-4 text-green-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Archivos Adjuntos</h2>
                  <p className="text-sm text-gray-500">Para: {selectedTransactionForList.description}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <TransactionAttachments
                  transactionId={selectedTransactionForList.id}
                  userId={user.id}
                  onAttachmentDeleted={handleAttachmentDeleted}
                  onAddAttachment={() => handleAttachmentUpload(selectedTransactionForList)}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Category Editing Modal */}
      {showCategoryModal && selectedTransactionForCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-light bg-neutral-bg rounded-t-xl">
              <h2 className="text-base font-semibold text-neutral-900">Seleccionar Categoría</h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setSelectedTransactionForCategory(null)
                  setSelectedCategory('')
                  setCustomCategoryInput('')
                  setShowAddCategoryInput(false)
                  setNewCategoryInput('')
                  setShowDuplicateCategoryModal(false)
                  setDuplicateCategoryName('')
                  // Reset add category state
                  setAddingCategory(false)
                  setAddCategoryError(null)
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-5 py-4">
              <div className="mb-4">
                <p className="text-sm text-neutral-500 mb-3">
                  Para: {selectedTransactionForCategory.description}
                </p>
              </div>

              {/* Categories list */}
              <div className="mb-4">
                <h3 className="text-sm text-neutral-500 mb-2">Categorías disponibles:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {/* First option: Sin categoría (red styling) */}
                  <div
                    className={`flex items-center justify-between gap-3 px-4 py-2 rounded-md cursor-pointer transition-all ${
                      selectedCategory === 'Sin categoría'
                        ? 'bg-green-50'
                        : 'bg-neutral-bg hover:bg-[#f5f6f4]'
                    }`}
                    onClick={() => handleCategorySelection('Sin categoría')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-[#fcebea] text-green-600">
                        <Tag className="h-4 w-4" fill="currentColor" />
                      </div>
                      <span className="text-sm text-neutral-700 font-medium">
                        Sin categoría
                      </span>
                    </div>
                  </div>

                  {/* Current category */}
                  {selectedTransactionForCategory.category && selectedTransactionForCategory.category !== 'sin categoría' && (
                    <div
                      className={`flex items-center justify-between gap-3 px-4 py-2 rounded-md cursor-pointer transition-all ${
                        selectedCategory === selectedTransactionForCategory.category
                          ? 'bg-green-50'
                          : 'bg-neutral-bg hover:bg-[#f5f6f4]'
                      }`}
                      onClick={() => handleCategorySelection(selectedTransactionForCategory.category!)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-[#e6f4ea] text-green-600">
                          <Tag className="h-4 w-4" fill="currentColor" />
                        </div>
                        <span className="text-sm text-neutral-700 font-medium">
                          {selectedTransactionForCategory.category}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Other available categories */}
                  {availableCategories
                    .filter(cat => cat !== 'Sin categoría' && cat !== selectedTransactionForCategory.category)
                    .map((category) => {
                      // Check if this is a default category
                      const isDefault = Object.values(CATEGORIES.EXPENSE).includes(category as any)
                      
                      return (
                        <div
                          key={category}
                          className={`flex items-center justify-between gap-3 px-4 py-2 rounded-md cursor-pointer transition-all ${
                            selectedCategory === category
                              ? 'bg-green-50'
                              : 'bg-neutral-bg hover:bg-[#f5f6f4]'
                          }`}
                          onClick={() => handleCategorySelection(category)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                              isDefault ? 'bg-[#e6f4ea] text-green-600' : 'bg-[#f0f0ec] text-[#7c8c7c]'
                            }`}>
                              <Tag className="h-4 w-4" fill="currentColor" />
                            </div>
                            <span className="text-sm text-neutral-700 font-medium">
                              {category}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Add new category section */}
              {!showAddCategoryInput ? (
                <div className="mb-4">
                  <button
                    onClick={() => setShowAddCategoryInput(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 border border-dashed border-border-light rounded-md text-sm text-green-dark hover:bg-[#f8fbf7] cursor-pointer transition-colors"
                  >
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Agregar nueva categoría</span>
                  </button>
                </div>
              ) : (
                <div className="mb-4 mt-4 border-t border-border-light pt-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">
                        Nueva categoría
                      </label>
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="Nombre de la categoría"
                        className="w-full px-3 py-1.5 rounded-md border border-border-light text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                        maxLength={50}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCategory()
                          } else if (e.key === 'Escape') {
                            handleCancelAddCategory()
                          }
                        }}
                        autoFocus
                      />
                      {addCategoryError && (
                        <p className="text-red-500 text-xs mt-1">{addCategoryError}</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      <button
                        onClick={handleAddCategory}
                        disabled={addingCategory || !newCategoryInput.trim()}
                        className="bg-green-100 text-green-800 hover:bg-green-200 rounded-md px-4 py-2 text-sm font-medium transition-all w-full sm:w-auto disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {addingCategory ? 'Agregando...' : 'Agregar'}
                      </button>
                      <button
                        onClick={handleCancelAddCategory}
                        disabled={addingCategory}
                        className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 rounded-md px-4 py-2 text-sm font-medium transition-all w-full sm:w-auto disabled:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCategoryModal(false)
                    setSelectedTransactionForCategory(null)
                    setSelectedCategory('')
                    setCustomCategoryInput('')
                    setShowAddCategoryInput(false)
                    setNewCategoryInput('')
                    setShowDuplicateCategoryModal(false)
                    setDuplicateCategoryName('')
                    // Reset add category state
                    setAddingCategory(false)
                    setAddCategoryError(null)
                  }}
                  className="flex-1 bg-neutral-100 text-neutral-600 py-2 px-3 rounded-md hover:bg-neutral-200 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdateCategory()}
                  disabled={loading || !selectedCategory}
                  className="flex-1 bg-green-primary text-white py-2 px-3 rounded-md hover:bg-[#77b16e] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {loading ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Category Modal */}
      {showDuplicateCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={() => {
                setShowDuplicateCategoryModal(false)
                setDuplicateCategoryName('')
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-5 flex flex-col gap-4 items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-2">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Categoría Duplicada</h2>
              <p className="text-gray-700 text-sm font-medium mb-4 text-center">
                La categoría "{duplicateCategoryName}" ya existe.
              </p>
              
              <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Esta categoría ya existe en el sistema (sin importar mayúsculas/minúsculas).
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Intenta con un nombre diferente o selecciona la categoría existente.
                </p>
              </div>

              {/* Action Button */}
              <div className="w-full">
                <button
                  onClick={() => {
                    setShowDuplicateCategoryModal(false)
                    setDuplicateCategoryName('')
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Entendido
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
} 