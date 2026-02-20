'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, Paperclip, ChevronUp, ChevronDown, Tag, Info, PiggyBank, CreditCard, AlertTriangle, Clock, RotateCcw, MoreVertical, StickyNote, Wallet, Users } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment, type Abono } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, fetchAttachmentCounts, measureQueryPerformance, clearUserCache } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useRouter } from 'next/navigation'
import { useDataSync, useDataSyncEffect } from '@/lib/hooks/useDataSync'
import { useTransactionStore } from '@/lib/store/transactionStore'
import { useGroupStore } from '@/lib/store/groupStore'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'
import TransactionIcon from './TransactionIcon'
import GroupBadge from './GroupBadge'
import CreateSpaceButton from './CreateSpaceButton'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'
import { getUserActiveCategories, addUserCategory } from '@/lib/services/categoryService'
import { fetchAbonosByTransactionIds, createAbono, updateAbono, deleteAbono } from '@/lib/services/abonoService'
import { buildMisCuentasUrl, type FilterType } from '@/lib/routes'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

interface DashboardViewProps {
  navigationParams?: { month?: number; year?: number } | null
  user: User
  onDataChange?: () => void
  /** Initial filter from URL ?tipo= (recurrente|unico|todos) */
  initialFilterType?: FilterType
  /** When true, month/year/filter changes update the URL (for /mis-cuentas routes) */
  syncToUrl?: boolean
  /** Opens the add movement form (used in filter section) */
  onAddExpense?: () => void
}

export default function DashboardView({ navigationParams, user, onDataChange, initialFilterType = 'all', syncToUrl = false, onAddExpense }: DashboardViewProps) {
  const router = useRouter()
  const { refreshData, dataVersion } = useDataSync()
  const { currentGroupId, groups, isLoading: isGroupsLoading } = useGroupStore()
  const { transactions, isLoading, fetchTransactions, setTransactions, markTransactionStatus, updateTransaction } = useTransactionStore()
  
  // State management - synced from URL/parent when syncToUrl
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(navigationParams?.month ?? currentDate.getMonth() + 1)
  
  // Function to validate transaction integrity for debugging
  function validateTransactionIntegrity(transactions: Transaction[], selectedYear: number, selectedMonth: number) {
    const invalid = transactions.filter(tx => tx.year !== selectedYear || tx.month !== selectedMonth)
    if (invalid.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('[zustand] DashboardView: Warning – Found', invalid.length, 'transactions with mismatched month/year', invalid)
    }
  }
  
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year ?? currentDate.getFullYear())
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>(initialFilterType)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [abonosByTransaction, setAbonosByTransaction] = useState<Record<number, Abono[]>>({})
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [openInfoTooltipId, setOpenInfoTooltipId] = useState<number | null>(null)
  const [infoTooltipAnchor, setInfoTooltipAnchor] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const infoTooltipCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoveredNotesId, setHoveredNotesId] = useState<number | null>(null)
  const [notesTooltipAnchor, setNotesTooltipAnchor] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const notesTooltipCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Obtener el trigger VISIBLE (en mobile la tabla desktop está hidden y querySelector devuelve la primera)
  const getVisibleInfoTooltipTrigger = (txId: number) => {
    const els = document.querySelectorAll(`[data-info-tooltip-trigger][data-transaction-id="${txId}"]`)
    const arr = Array.from(els)
    for (let i = 0; i < arr.length; i++) {
      const rect = arr[i].getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) return arr[i]
    }
    return arr[0] ?? null
  }

  // Medir posición del trigger para el tooltip (evitar que se corte por overflow de la tabla)
  useLayoutEffect(() => {
    if (!openInfoTooltipId) {
      setInfoTooltipAnchor(null)
      return
    }
    const el = getVisibleInfoTooltipTrigger(openInfoTooltipId)
    if (!el) return
    const rect = el.getBoundingClientRect()
    setInfoTooltipAnchor({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
  }, [openInfoTooltipId])

  useEffect(() => {
    if (!openInfoTooltipId) return
    const updateAnchor = () => {
      const el = getVisibleInfoTooltipTrigger(openInfoTooltipId)
      if (el) setInfoTooltipAnchor(el.getBoundingClientRect())
    }
    window.addEventListener('scroll', updateAnchor, true)
    window.addEventListener('resize', updateAnchor)
    return () => {
      window.removeEventListener('scroll', updateAnchor, true)
      window.removeEventListener('resize', updateAnchor)
    }
  }, [openInfoTooltipId])

  useLayoutEffect(() => {
    if (!hoveredNotesId) {
      setNotesTooltipAnchor(null)
      return
    }
    const el = document.querySelector(`[data-notes-tooltip-trigger][data-transaction-id="${hoveredNotesId}"]`)
    if (!el) return
    const rect = el.getBoundingClientRect()
    setNotesTooltipAnchor({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
  }, [hoveredNotesId])

  useEffect(() => {
    if (!hoveredNotesId) return
    const updateAnchor = () => {
      const el = document.querySelector(`[data-notes-tooltip-trigger][data-transaction-id="${hoveredNotesId}"]`)
      if (el) setNotesTooltipAnchor(el.getBoundingClientRect())
    }
    window.addEventListener('scroll', updateAnchor, true)
    window.addEventListener('resize', updateAnchor)
    return () => {
      window.removeEventListener('scroll', updateAnchor, true)
      window.removeEventListener('resize', updateAnchor)
    }
  }, [hoveredNotesId])

  // Cerrar tooltip Info al hacer click fuera (excluir trigger y el contenido del tooltip en portal)
  useEffect(() => {
    if (!openInfoTooltipId) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-info-tooltip-trigger]') && !target.closest('[data-info-tooltip-content]')) {
        setOpenInfoTooltipId(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openInfoTooltipId])

  // Abono modal state
  const [showAbonoModal, setShowAbonoModal] = useState(false)
  const [abonoModalTransaction, setAbonoModalTransaction] = useState<Transaction | null>(null)
  const [abonoModalAmount, setAbonoModalAmount] = useState('')
  const [abonoModalDate, setAbonoModalDate] = useState('')
  const [showOverpaymentConfirm, setShowOverpaymentConfirm] = useState(false)
  const [overpaymentTotal, setOverpaymentTotal] = useState(0)
  const [isSavingAbono, setIsSavingAbono] = useState(false)
  const [editingAbono, setEditingAbono] = useState<Abono | null>(null)
  const [editAbonoAmount, setEditAbonoAmount] = useState('')
  const [deleteAbonoConfirm, setDeleteAbonoConfirm] = useState<{ ab: Abono; transaction: Transaction } | null>(null)
  
  // Sorting state
  const [sortField, setSortField] = useState<'description' | 'deadline' | 'status' | 'value' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Expandable filters state - REMOVED (filters now always visible)
  // const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Delete confirmation state
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
    isOrphaned?: boolean
  } | null>(null)

  // Delete series in progress (para el botón Eliminar serie)
  const [isDeletingSeries, setIsDeletingSeries] = useState(false)

  // Delete individual transaction confirmation state
  const [showDeleteIndividualConfirmation, setShowDeleteIndividualConfirmation] = useState(false)
  const [deleteIndividualConfirmationData, setDeleteIndividualConfirmationData] = useState<{
    description: string
    value: number
    date: string
    transactionId: number
    transaction: Transaction
  } | null>(null)

  // Payment confirmation states
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false)
  const [showUnmarkAsPaidModal, setShowUnmarkAsPaidModal] = useState(false)
  const [paymentConfirmationData, setPaymentConfirmationData] = useState<{
    transactionId: number
    transaction: Transaction
    action: 'mark_paid' | 'unmark_paid'
  } | null>(null)

  // Ref para evitar closure stale en modal de modificación
  const modifyModalTransactionRef = useRef<Transaction | null>(null)
  // Modify confirmation state
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
    notes?: string
    originalId?: number
    transactionId?: number
    modifySeries?: boolean
    isgoal?: boolean
    category?: string
    editContextMonth?: number
    editContextYear?: number
    groupId?: string | null
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

  // Extend series: valores para meses nuevos (Fase 2)
  const [showExtendValuesModal, setShowExtendValuesModal] = useState(false)
  const [extendValuesData, setExtendValuesData] = useState<{
    newMonthsLabel: string
    suggestedValue: number
    suggestedPaymentDay: string
  } | null>(null)

  // Aplicar valor/due date a existentes: toda la serie vs de acá en adelante
  const [showApplyToExistingModal, setShowApplyToExistingModal] = useState(false)
  const [applyToExistingData, setApplyToExistingData] = useState<{
    valueChanged: boolean
    dueDateChanged: boolean
    oldValue: number
    newValue: number
    oldDueDay: string | null
    newDueDay: string
    fromMonth: number
    fromYear: number
  } | null>(null)
  const [applyToExistingChoice, setApplyToExistingChoice] = useState<'all' | 'from_month' | null>(null)

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
  
  // Mobile options menu state
  const [openOptionsMenu, setOpenOptionsMenu] = useState<number | null>(null)
  const [openActionsDropdown, setOpenActionsDropdown] = useState<number | null>(null)
  const [actionsDropdownAnchor, setActionsDropdownAnchor] = useState<{ top: number; right: number } | null>(null)

  // Notes modal state (quick edit from dropdown)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [notesModalTransaction, setNotesModalTransaction] = useState<Transaction | null>(null)
  const [notesModalValue, setNotesModalValue] = useState('')
  
  // Close mobile options menu and desktop actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenOptionsMenu(null)
      setOpenActionsDropdown(null)
      setActionsDropdownAnchor(null)
    }
    
    if (openOptionsMenu !== null || openActionsDropdown !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openOptionsMenu, openActionsDropdown])

  // Sync state from navigationParams (from URL path when on /mis-cuentas)
  useEffect(() => {
    if (navigationParams?.month && navigationParams?.year) {
      setSelectedMonth(navigationParams.month)
      setSelectedYear(navigationParams.year)
    }
  }, [navigationParams?.month, navigationParams?.year])

  // Sync filterType from initialFilterType (from URL ?tipo= when on /mis-cuentas)
  useEffect(() => {
    setFilterType(initialFilterType)
  }, [initialFilterType])

  // Navigate to new URL when month/year/filter changes (SEO-friendly URLs with group)
  const handleMonthYearChange = useCallback((newYear: number, newMonth: number) => {
    if (syncToUrl) {
      router.push(buildMisCuentasUrl(newYear, newMonth, {
        tipo: filterType === 'all' ? undefined : filterType,
        grupo: currentGroupId ?? undefined,
      }))
    } else {
      setSelectedYear(newYear)
      setSelectedMonth(newMonth)
    }
  }, [syncToUrl, filterType, currentGroupId, router])

  const handleFilterTypeChange = useCallback((newFilter: FilterType) => {
    if (syncToUrl) {
      router.push(buildMisCuentasUrl(selectedYear, selectedMonth, {
        tipo: newFilter === 'all' ? undefined : newFilter,
        grupo: currentGroupId ?? undefined,
      }))
    } else {
      setFilterType(newFilter)
    }
  }, [syncToUrl, selectedYear, selectedMonth, currentGroupId, router])

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

  // Helper: meses nuevos cuando se extiende una serie (añadidos al inicio o al final)
  const getNewMonthsWhenExtending = (
    oldFromY: number, oldFromM: number, oldToY: number, oldToM: number,
    newFromY: number, newFromM: number, newToY: number, newToM: number
  ): { year: number; month: number }[] => {
    const result: { year: number; month: number }[] = []
    // Meses añadidos al final
    let y = oldToM === 12 ? oldToY + 1 : oldToY
    let m = oldToM === 12 ? 1 : oldToM + 1
    while (y < newToY || (y === newToY && m <= newToM)) {
      result.push({ year: y, month: m })
      if (m === 12) { m = 1; y++ } else { m++ }
    }
    // Meses añadidos al inicio
    y = newFromY
    m = newFromM
    while (y < oldFromY || (y === oldFromY && m < oldFromM)) {
      result.push({ year: y, month: m })
      if (m === 12) { m = 1; y++ } else { m++ }
    }
    return result
  }

  // Helper function to get currency input value - just return the raw number as string
  const getCurrencyInputValue = (value: number): string => {
    if (value === 0) return ''
    return value.toString()
  }

  const fetchData = useCallback(async (isRetry = false) => {
    if (!user) return
    
    try {
      setError(null)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] DashboardView: fetching additional data (expenses, attachments)', selectedMonth, selectedYear, isRetry ? '(retry)' : '')
      }
      
      // Fetch expenses and other auxiliary data
      const result = await measureQueryPerformance(
        'fetchDashboardExpenses',
        async () => {
          const expenses = await fetchUserExpenses(user, currentGroupId)
          return { expenses }
        }
      )

      setRecurrentExpenses(result.expenses.recurrent)
      setNonRecurrentExpenses(result.expenses.nonRecurrent)

      // Fetch attachment counts and abonos if we have transactions
      if (transactions && transactions.length > 0) {
        const transactionIds = transactions.map((t: Transaction) => t.id)
        const [attachmentCountsData, abonosData] = await Promise.all([
          fetchAttachmentCounts(user, transactionIds),
          fetchAbonosByTransactionIds(user.id, transactionIds),
        ])
        setAttachmentCounts(attachmentCountsData)
        setAbonosByTransaction(abonosData)
      }

    } catch (error) {
      console.error('❌ Error in fetchData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [user, currentGroupId, selectedMonth, selectedYear, transactions])

  const prevGroupIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevGroupIdRef.current !== null && prevGroupIdRef.current !== currentGroupId) {
      setTransactions([])
    }
    prevGroupIdRef.current = currentGroupId
  }, [currentGroupId, setTransactions])

  // Direct transaction fetching from Zustand store
  useEffect(() => {
    if (user && currentGroupId) {
      fetchTransactions({ userId: user.id, groupId: currentGroupId, year: selectedYear, month: selectedMonth })
      validateTransactionIntegrity(transactions, selectedYear, selectedMonth)
    }
  }, [user, currentGroupId, selectedMonth, selectedYear, fetchTransactions])

  // Initial data fetch
  useEffect(() => {
    fetchData(false)
  }, [fetchData])

  // Development logging for Zustand transactions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isLoading && transactions.length > 0) {
      console.log('[zustand] DashboardView: loaded', transactions.length, 'transactions from Zustand store')
    }
  }, [isLoading, transactions])

  useDataSyncEffect(() => {
    if (user && currentGroupId) {
      fetchTransactions({ userId: user.id, groupId: currentGroupId, year: selectedYear, month: selectedMonth })
    }
  }, [user, currentGroupId, selectedMonth, selectedYear, fetchTransactions])

  // Filter transactions for selected month/year
  const filteredTransactions = useMemo(() =>
    transactions.filter(t => t.year === selectedYear && t.month === selectedMonth),
    [transactions, selectedYear, selectedMonth]
  )

  const typeFilteredTransactions = useMemo(() => {
    if (filterType === 'all') return filteredTransactions
    return filteredTransactions.filter(t => t.source_type === filterType)
  }, [filteredTransactions, filterType])

  const sortedTransactions = useMemo(() =>
    [...typeFilteredTransactions].sort((a, b) => {
    // Sort by deadline (closest first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    
    // If one has deadline and other doesn't, prioritize the one with deadline
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    
    // If neither has deadline, sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }),
    [typeFilteredTransactions]
  )

  const finalSortedTransactions = useMemo(() => {
    if (!sortField) return sortedTransactions
    return [...sortedTransactions].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'description': comparison = a.description.localeCompare(b.description); break
        case 'deadline':
          if (!a.deadline && !b.deadline) comparison = 0
          else if (!a.deadline) comparison = 1
          else if (!b.deadline) comparison = -1
          else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'status': comparison = a.status.localeCompare(b.status); break
        case 'value': comparison = a.value - b.value; break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [sortedTransactions, sortField, sortDirection])

  // Helper function to compare dates without time
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

  // Helper: amount still owed for a pending expense (considering abonos)
  const getAmountOwed = useCallback((t: Transaction) => {
    const totalAbonado = (abonosByTransaction[t.id] || []).reduce((sum, a) => sum + Number(a.amount), 0)
    return Math.max(0, t.value - totalAbonado)
  }, [abonosByTransaction])

  // Helper: total abonado for a transaction
  const getTotalAbonadoForTxn = useCallback((t: Transaction) => {
    return (abonosByTransaction[t.id] || []).reduce((sum, a) => sum + Number(a.amount), 0)
  }, [abonosByTransaction])

  // Summary totals for compact bar - memoized (abonos-aware)
  const summaryTotals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0)
    // Total gastos: sum of expense values, or totalAbonado if overpaid (abonos > value)
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const abonado = getTotalAbonadoForTxn(t)
        const effectiveValue = t.status === 'paid' ? t.value : Math.max(t.value, abonado)
        return sum + effectiveValue
      }, 0)
    const paid = filteredTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
    // Falta pagar (pending, non-overdue): amount owed minus abonos
    const pending = filteredTransactions
      .filter(t => {
        if (t.type !== 'expense' || t.status !== 'pending') return false
        if (!t.deadline) return true
        return !isDateOverdue(t.deadline)
      })
      .reduce((sum, t) => sum + getAmountOwed(t), 0)
    // Falta pagar (overdue): amount owed minus abonos
    const overdue = filteredTransactions
      .filter(t => {
        if (t.type !== 'expense' || t.status !== 'pending') return false
        if (!t.deadline) return false
        return isDateOverdue(t.deadline)
      })
      .reduce((sum, t) => sum + getAmountOwed(t), 0)
    return { income, expense, paid, pending, overdue, cuantoQueda: income - expense }
  }, [filteredTransactions, getAmountOwed, getTotalAbonadoForTxn])

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
      console.log(`🔄 handleCheckboxChange called for transaction ${transactionId}, isChecked: ${isChecked}`)
      
      // Find the transaction
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

      // Set up confirmation data
      setPaymentConfirmationData({
        transactionId,
        transaction,
        action: isChecked ? 'mark_paid' : 'unmark_paid'
      })

      // Show appropriate modal
      if (isChecked) {
        setShowMarkAsPaidModal(true)
      } else {
        setShowUnmarkAsPaidModal(true)
      }

    } catch (error) {
      console.error('❌ Error setting up payment confirmation:', error)
      setError(`Error al configurar confirmación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  // New function to handle the actual payment status update
  const handleConfirmPaymentStatusChange = async (confirmed: boolean) => {
    if (!confirmed || !paymentConfirmationData) {
      // User cancelled
      setShowMarkAsPaidModal(false)
      setShowUnmarkAsPaidModal(false)
      setPaymentConfirmationData(null)
      return
    }

    try {
      // Add ripple effect
      const checkbox = document.getElementById(`checkbox-${paymentConfirmationData.transactionId}`)?.nextElementSibling as HTMLElement;
      if (checkbox) {
        const ripple = document.createElement('div');
        ripple.className = 'absolute inset-0 bg-white/40 rounded-lg animate-ripple pointer-events-none';
        ripple.style.animation = 'ripple 0.6s ease-out';
        checkbox.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      }

      console.log(`🔄 Confirming payment status change for transaction ${paymentConfirmationData.transactionId}`)
      
      setError(null)
      
      const { transaction, action } = paymentConfirmationData

      // Determine the new status
      let newStatus: 'paid' | 'pending'
      if (action === 'mark_paid') {
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

      // Use Zustand store action for optimistic updates and persistence
      await markTransactionStatus({
        transactionId: paymentConfirmationData.transactionId,
        newStatus: newStatus,
        userId: user.id
      })
      
      console.log('✅ Status update completed via Zustand store')
      refreshData(user.id, 'update_status')
      
      console.log('✅ Status update completed - optimistic update maintained and global sync triggered')
      
    } catch (error) {
      console.error('❌ Error updating status:', error)
      setError(`Error al actualizar estado: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      // Close modals and reset state
      setShowMarkAsPaidModal(false)
      setShowUnmarkAsPaidModal(false)
      setPaymentConfirmationData(null)
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

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteModalData(null)
  }

  const handleConfirmDelete = async (deleteSeries: boolean = false) => {
    if (!deleteModalData) return

    const { transactionId, transaction } = deleteModalData

    try {
      setError(null)

      if (transaction.source_type === 'recurrent' && deleteSeries) {
        // Delete entire series: transacciones primero (abonos y attachments cascadan), luego recurrent_expenses
        const sourceId = Number(transaction.source_id)
        const gid = transaction.group_id ?? currentGroupId ?? undefined
        let q1 = supabase.from('transactions').delete().eq('source_id', sourceId).eq('source_type', 'recurrent')
        if (gid) q1 = q1.eq('group_id', gid); else q1 = q1.eq('user_id', user.id)
        const { error: txError } = await q1
        if (txError) throw txError
        let q2 = supabase.from('recurrent_expenses').delete().eq('id', sourceId)
        if (gid) q2 = q2.eq('group_id', gid); else q2 = q2.eq('user_id', user.id)
        const { error } = await q2
        if (error) throw error
      } else {
        // Delete only this transaction (abonos y attachments cascadan)
        const gid = transaction.group_id ?? currentGroupId ?? undefined
        let q = supabase.from('transactions').delete().eq('id', transactionId)
        if (gid) q = q.eq('group_id', gid); else q = q.eq('user_id', user.id)
        const { error } = await q
        if (error) throw error
      }

      console.log('🔄 Triggering global data refresh after deletion')
      refreshData(user.id, 'delete_transaction')
      
    } catch (error) {
      console.error('Error deleting:', error)
      setError(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setShowDeleteModal(false)
      setDeleteModalData(null)
    }
  }

  const handleDeleteSeries = async () => {
    if (!deleteModalData) return

    const { transaction } = deleteModalData
    const sourceId = Number(transaction.source_id)
    console.log('[DELETE_SERIES] handleDeleteSeries', { sourceId, description: transaction.description })

    let recurrentExpense = recurrentExpenses.find(re => Number(re.id) === sourceId)
    if (!recurrentExpense && user?.id) {
      const gid = transaction.group_id ?? currentGroupId ?? undefined
      let sel = supabase.from('recurrent_expenses').select('*').eq('id', sourceId)
      if (gid) sel = sel.eq('group_id', gid); else sel = sel.eq('user_id', user.id)
      const { data } = await sel.maybeSingle()
      recurrentExpense = data ?? undefined
    }

    const period = recurrentExpense
      ? `${months[recurrentExpense.month_from - 1]} ${recurrentExpense.year_from} a ${months[recurrentExpense.month_to - 1]} ${recurrentExpense.year_to}`
      : 'serie (registro eliminado)'

    setDeleteSeriesConfirmationData({
      description: transaction.description,
      value: transaction.value,
      period,
      transactionId: deleteModalData.transactionId,
      transaction,
      isOrphaned: !recurrentExpense
    })
    
    setShowDeleteModal(false)
    setShowDeleteSeriesConfirmation(true)
  }

  const handleConfirmDeleteSeries = async () => {
    if (!deleteSeriesConfirmationData) {
      console.warn('[DELETE_SERIES] No deleteSeriesConfirmationData')
      return
    }
    if (!user?.id) {
      console.error('[DELETE_SERIES] No user.id')
      setError('No hay sesión de usuario')
      return
    }

    const { transaction, isOrphaned } = deleteSeriesConfirmationData
    const sourceId = Number(transaction.source_id)
    console.log('[DELETE_SERIES] Inicio', { sourceId, isOrphaned, userId: user.id })

    try {
      setError(null)
      setIsDeletingSeries(true)

      // 1. Borrar primero las transacciones de la serie (group_id si es de grupo)
      const groupId = transaction.group_id ?? undefined
      console.log('[DELETE_SERIES] Paso 1: seleccionando transacciones...', { groupId })
      let selectQuery = supabase.from('transactions').select('id').eq('source_id', sourceId).eq('source_type', 'recurrent')
      if (groupId) selectQuery = selectQuery.eq('group_id', groupId)
      else selectQuery = selectQuery.eq('user_id', user.id)
      const { data: txns, error: selectError } = await selectQuery

      console.log('[DELETE_SERIES] Select resultado', { count: txns?.length ?? 0, selectError: selectError?.message })

      if (selectError) throw selectError

      if (txns && txns.length > 0) {
        console.log('[DELETE_SERIES] Paso 2a: borrando', txns.length, 'transacciones...')
        let txDeleteQuery = supabase.from('transactions').delete().eq('source_id', sourceId).eq('source_type', 'recurrent')
        if (groupId) txDeleteQuery = txDeleteQuery.eq('group_id', groupId)
        else txDeleteQuery = txDeleteQuery.eq('user_id', user.id)
        const { error: txError } = await txDeleteQuery
        if (txError) {
          console.error('[DELETE_SERIES] Error borrando transacciones:', txError)
          throw txError
        }
        console.log('[DELETE_SERIES] Transacciones borradas OK')
      } else {
        console.log('[DELETE_SERIES] No hay transacciones que borrar')
      }

      // 2. Borrar la fila en recurrent_expenses (solo si existe)
      if (!isOrphaned) {
        console.log('[DELETE_SERIES] Paso 2b: borrando recurrent_expenses...')
        let recurrentDeleteQuery = supabase.from('recurrent_expenses').delete().eq('id', sourceId)
        if (groupId) recurrentDeleteQuery = recurrentDeleteQuery.eq('group_id', groupId)
        else recurrentDeleteQuery = recurrentDeleteQuery.eq('user_id', user.id)
        const { error } = await recurrentDeleteQuery
        if (error) {
          console.error('[DELETE_SERIES] Error borrando recurrent_expenses:', error)
          throw error
        }
        console.log('[DELETE_SERIES] recurrent_expenses borrado OK')
      }

      console.log('[DELETE_SERIES] Completado OK, refrescando...')
      refreshData(user.id, 'delete_transaction')

    } catch (error) {
      console.error('[DELETE_SERIES] Error:', error)
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('[DELETE_SERIES] Supabase error code:', (error as { code?: string }).code)
      }
      const errMsg = error instanceof Error ? error.message : String(error)
      setError(`Error al eliminar serie: ${errMsg}`)
    } finally {
      console.log('[DELETE_SERIES] Finally: cerrando modal')
      setIsDeletingSeries(false)
      setShowDeleteSeriesConfirmation(false)
      setDeleteSeriesConfirmationData(null)
    }
  }

  const handleCancelDeleteSeries = () => {
    setShowDeleteSeriesConfirmation(false)
    setDeleteSeriesConfirmationData(null)
  }

  const handleModifyTransaction = async (id: number) => {
    // Find the transaction to determine if it's recurrent
    const transaction = transactions.find(t => t.id === id)
    if (!transaction) return

    // For non-recurrent transactions, go directly to the form
    if (transaction.source_type === 'non_recurrent') {
      let nonRecurrentExpense = nonRecurrentExpenses.find(nre => Number(nre.id) === Number(transaction.source_id))
      // Fallback: fetch from Supabase when not in local array (ej. transacción de grupo)
      if (!nonRecurrentExpense && user?.id) {
        const gid = transaction.group_id ?? currentGroupId ?? undefined
        let sel = supabase.from('non_recurrent_expenses').select('*').eq('id', Number(transaction.source_id))
        if (gid) sel = sel.eq('group_id', gid); else sel = sel.eq('user_id', user.id)
        const { data } = await sel.maybeSingle()
        nonRecurrentExpense = data ?? undefined
      }
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
        notes: transaction.notes || '',
        originalId: nonRecurrentExpense.id,
        groupId: transaction.group_id ?? currentGroupId ?? null,
        transactionId: transaction.id,
        modifySeries: false,
        category: transaction.category
      })
      setShowModifyForm(true)
    } else {
      // For recurrent transactions, show the confirmation modal (Toda la Serie / Solo Esta)
      modifyModalTransactionRef.current = transaction
      setShowModifyForm(false)
      setModifyFormData(null)
      setShowModifyConfirmation(false)
      setModifyConfirmationData(null)
      setShowExtendValuesModal(false)
      setExtendValuesData(null)
      setShowApplyToExistingModal(false)
      setApplyToExistingData(null)
      setApplyToExistingChoice(null)
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
    const transaction = modifyModalTransactionRef.current ?? modifyModalData?.transaction
    if (!transaction) return

    try {
      if (transaction.source_type === 'recurrent' && modifySeries) {
        const sourceId = Number(transaction.source_id)
        let recurrentExpense = recurrentExpenses.find(re => Number(re.id) === sourceId)
        // Fallback: fetch from Supabase when not in local array
        if (!recurrentExpense && user?.id) {
          const gid = transaction.group_id ?? currentGroupId ?? undefined
          let sel = supabase.from('recurrent_expenses').select('*').eq('id', sourceId)
          if (gid) sel = sel.eq('group_id', gid); else sel = sel.eq('user_id', user.id)
          const { data } = await sel.maybeSingle()
          recurrentExpense = data ?? undefined
        }
        if (!recurrentExpense) {
          // Serie eliminada o no accesible: no abrir formulario de "solo esta" — el usuario eligió "Toda la Serie"
          setShowModifyModal(false)
          setModifyModalData(null)
          modifyModalTransactionRef.current = null
          setError('La serie original ya no existe. Usa "Solo esta transacción" para modificar solo esta.')
          return
        }

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
          category: transaction.category,
          editContextMonth: transaction.month,
          editContextYear: transaction.year,
          groupId: transaction.group_id ?? currentGroupId ?? null,
        })
      } else {
        // Set up form data for editing individual transaction
        if (transaction.source_type === 'recurrent') {
          const sourceId = Number(transaction.source_id)
          let recurrentExpense = recurrentExpenses.find(re => Number(re.id) === sourceId)
          if (!recurrentExpense && user?.id) {
            const gid = transaction.group_id ?? currentGroupId ?? undefined
            let sel = supabase.from('recurrent_expenses').select('*').eq('id', sourceId)
            if (gid) sel = sel.eq('group_id', gid); else sel = sel.eq('user_id', user.id)
            const { data } = await sel.maybeSingle()
            recurrentExpense = data ?? undefined
          }
          if (!recurrentExpense) {
            // Serie no encontrada: usar datos de la transacción
            const deadlineDay = transaction.deadline ? parseInt(transaction.deadline.split('-')[2], 10) : undefined
            setModifyFormData({
              type: 'recurrent',
              description: transaction.description,
              month_from: transaction.month,
              month_to: transaction.month,
              year_from: transaction.year,
              year_to: transaction.year,
              value: transaction.value,
              payment_day_deadline: deadlineDay ? String(deadlineDay) : '',
              month: transaction.month,
              year: transaction.year,
              payment_deadline: transaction.deadline || '',
              notes: transaction.notes || '',
              originalId: transaction.id,
              transactionId: transaction.id,
              modifySeries: false,
              isgoal: false,
              category: transaction.category,
              groupId: transaction.group_id ?? currentGroupId ?? null,
            })
            setShowModifyModal(false)
            setModifyModalData(null)
            modifyModalTransactionRef.current = null
            setShowModifyForm(true)
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
            notes: transaction.notes || '',
            originalId: transaction.id,
            transactionId: transaction.id,
            modifySeries: false,
            category: transaction.category,
            groupId: transaction.group_id ?? currentGroupId ?? null,
          })
        } else {
          let nonRecurrentExpense = nonRecurrentExpenses.find(nre => Number(nre.id) === Number(transaction.source_id))
          // Fallback: fetch from Supabase when not in local array (ej. transacción de grupo)
          if (!nonRecurrentExpense && user?.id) {
            const gid = transaction.group_id ?? currentGroupId ?? undefined
            let sel = supabase.from('non_recurrent_expenses').select('*').eq('id', Number(transaction.source_id))
            if (gid) sel = sel.eq('group_id', gid); else sel = sel.eq('user_id', user.id)
            const { data } = await sel.maybeSingle()
            nonRecurrentExpense = data ?? undefined
          }
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
            notes: transaction.notes || '',
            originalId: nonRecurrentExpense.id,
            transactionId: transaction.id,
            modifySeries: false,
            category: transaction.category,
            groupId: transaction.group_id ?? currentGroupId ?? null,
          })
        }
      }

      setShowModifyModal(false)
      setModifyModalData(null)
      modifyModalTransactionRef.current = null
      setShowModifyForm(true)

    } catch (error) {
      console.error('Error setting up modify form:', error)
      setError(`Error al configurar el formulario de modificación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }


  const handleCancelModify = () => {
    modifyModalTransactionRef.current = null
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

    // Fase 2: si extendemos la serie, preguntar valor y due date para los meses nuevos
    if (modifyFormData.type === 'recurrent' && modifyFormData.modifySeries && modifyFormData.originalId) {
      const recurrent = recurrentExpenses.find(re => re.id === modifyFormData.originalId)
      if (recurrent) {
        const newMonths = getNewMonthsWhenExtending(
          recurrent.year_from, recurrent.month_from, recurrent.year_to, recurrent.month_to,
          modifyFormData.year_from, modifyFormData.month_from, modifyFormData.year_to, modifyFormData.month_to
        )
        if (newMonths.length > 0) {
          const newMonthsLabel = newMonths
            .map(({ year, month }) => `${months[month - 1]} ${year}`)
            .join(', ')
          setExtendValuesData({
            newMonthsLabel,
            suggestedValue: modifyFormData.value,
            suggestedPaymentDay: modifyFormData.payment_day_deadline || ''
          })
          setShowExtendValuesModal(true)
          return
        }
      }
    }

    // Aplicar valor/due date a existentes: si cambió, preguntar toda la serie vs de acá en adelante
    proceedToApplyOrConfirm(modifyFormData, period, action)
  }

  const proceedToApplyOrConfirm = (
    formData: NonNullable<typeof modifyFormData>,
    period: string,
    action: string
  ) => {
    const needsApplyModal = formData.type === 'recurrent' && formData.modifySeries && formData.originalId
    if (!needsApplyModal) {
      setModifyConfirmationData({ type: formData.type, description: formData.description, value: formData.value, period, action })
      setShowModifyConfirmation(true)
      return
    }
    const recurrent = recurrentExpenses.find(re => re.id === formData.originalId)
    if (!recurrent) {
      setModifyConfirmationData({ type: formData.type, description: formData.description, value: formData.value, period, action })
      setShowModifyConfirmation(true)
      return
    }
    const newDueDay = formData.payment_day_deadline?.trim() || null
    const oldDueDay = recurrent.payment_day_deadline != null ? String(recurrent.payment_day_deadline) : null
    const valueChanged = formData.value !== Number(recurrent.value)
    const dueDateChanged = newDueDay !== oldDueDay
    if (!valueChanged && !dueDateChanged) {
      setModifyConfirmationData({ type: formData.type, description: formData.description, value: formData.value, period, action })
      setShowModifyConfirmation(true)
      return
    }
    const fromMonth = formData.editContextMonth ?? new Date().getMonth() + 1
    const fromYear = formData.editContextYear ?? new Date().getFullYear()
    setApplyToExistingData({
      valueChanged,
      dueDateChanged,
      oldValue: Number(recurrent.value),
      newValue: formData.value,
      oldDueDay,
      newDueDay: newDueDay || '',
      fromMonth,
      fromYear
    })
    setApplyToExistingChoice(null)
    setShowApplyToExistingModal(true)
  }

  const handleConfirmExtendValues = () => {
    if (!extendValuesData || !modifyFormData) return
    const updatedForm = { ...modifyFormData, value: extendValuesData.suggestedValue, payment_day_deadline: extendValuesData.suggestedPaymentDay }
    setModifyFormData(updatedForm)
    setShowExtendValuesModal(false)
    setExtendValuesData(null)
    const period = modifyFormData.type === 'recurrent' 
      ? `${months[modifyFormData.month_from - 1]} ${modifyFormData.year_from} a ${months[modifyFormData.month_to - 1]} ${modifyFormData.year_to}`
      : `${months[modifyFormData.month - 1]} ${modifyFormData.year}`
    proceedToApplyOrConfirm(updatedForm, period, 'modify entire series')
  }

  const handleConfirmApplyToExisting = (choice: 'all' | 'from_month') => {
    if (!applyToExistingData || !modifyFormData) {
      setError('Datos de modificación no disponibles. Por favor, intenta de nuevo.')
      return
    }
    setApplyToExistingChoice(choice)
    setShowApplyToExistingModal(false)
    const period = modifyFormData.type === 'recurrent' 
      ? `${months[modifyFormData.month_from - 1]} ${modifyFormData.year_from} a ${months[modifyFormData.month_to - 1]} ${modifyFormData.year_to}`
      : `${months[modifyFormData.month - 1]} ${modifyFormData.year}`
    setModifyConfirmationData({
      type: modifyFormData.type,
      description: modifyFormData.description,
      value: modifyFormData.value,
      period,
      action: 'modify entire series'
    })
    setApplyToExistingData(null)
    setShowModifyConfirmation(true)
  }

  const handleConfirmModifySubmit = async () => {
    if (!modifyConfirmationData || !modifyFormData) return

    setError(null)

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
          // Update the entire series (trigger handles range/description)
          const gid = modifyFormData.groupId ?? currentGroupId ?? undefined
          let recurrentUpd = supabase.from('recurrent_expenses').update(recurrentData).eq('id', modifyFormData.originalId)
          if (gid) recurrentUpd = recurrentUpd.eq('group_id', gid); else recurrentUpd = recurrentUpd.eq('user_id', user.id)
          const { error } = await recurrentUpd

          if (error) throw error

          // Aplicar valor y/o deadline a transacciones existentes si el usuario lo eligió
          if (applyToExistingChoice && (modifyFormData.value !== undefined || modifyFormData.payment_day_deadline)) {
            let txnsSel = supabase.from('transactions').select('id, year, month').eq('source_id', modifyFormData.originalId).eq('source_type', 'recurrent')
            if (gid) txnsSel = txnsSel.eq('group_id', gid); else txnsSel = txnsSel.eq('user_id', user.id)
            const { data: txns } = await txnsSel

            if (txns && txns.length > 0) {
              const fromY = modifyFormData.editContextYear ?? new Date().getFullYear()
              const fromM = modifyFormData.editContextMonth ?? new Date().getMonth() + 1
              const paymentDay = modifyFormData.payment_day_deadline ? Number(modifyFormData.payment_day_deadline) : null
              const newValue = Number(modifyFormData.value)
              const toUpdate = applyToExistingChoice === 'all'
                ? txns
                : txns.filter(t => t.year > fromY || (t.year === fromY && t.month >= fromM))
              const computeDeadline = (y: number, m: number): string | null => {
                if (!paymentDay) return null
                const lastDay = new Date(y, m, 0).getDate()
                const day = Math.min(paymentDay, lastDay)
                return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              }
              await Promise.all(toUpdate.map(t => {
                const updates: { value?: number; deadline?: string | null } = {}
                if (modifyFormData.value !== undefined) updates.value = newValue
                if (paymentDay != null) updates.deadline = computeDeadline(t.year, t.month)
                if (Object.keys(updates).length === 0) return Promise.resolve()
                let txUpd = supabase.from('transactions').update(updates).eq('id', t.id)
                if (gid) txUpd = txUpd.eq('group_id', gid); else txUpd = txUpd.eq('user_id', user.id)
                return txUpd
              }))
            }
          }
        } else {
          // Update individual transaction
          const gid = modifyFormData.groupId ?? currentGroupId ?? undefined
          let txUpd = supabase.from('transactions').update({
            description: modifyFormData.description,
            value: Number(modifyFormData.value),
            deadline: modifyFormData.payment_deadline || null,
            ...(modifyFormData.notes !== undefined && { notes: modifyFormData.notes || null })
          }).eq('id', modifyFormData.originalId)
          if (gid) txUpd = txUpd.eq('group_id', gid); else txUpd = txUpd.eq('user_id', user.id)
          const { error } = await txUpd

          if (error) throw error
        }
      } else if (modifyFormData.type === 'non_recurrent') {
        // Update non-recurrent expense
        const gid = modifyFormData.groupId ?? currentGroupId ?? undefined
        let nreUpd = supabase.from('non_recurrent_expenses').update({
          description: modifyFormData.description,
          month: modifyFormData.month,
          year: modifyFormData.year,
          value: Number(modifyFormData.value),
          payment_deadline: modifyFormData.payment_deadline || null
        }).eq('id', modifyFormData.originalId)
        if (gid) nreUpd = nreUpd.eq('group_id', gid); else nreUpd = nreUpd.eq('user_id', user.id)
        const { error } = await nreUpd

        if (error) throw error

        // Update transaction notes (notes live on transactions, not expenses)
        if (modifyFormData.transactionId) {
          let notesUpd = supabase.from('transactions').update({ notes: modifyFormData.notes || null }).eq('id', modifyFormData.transactionId)
          if (gid) notesUpd = notesUpd.eq('group_id', gid); else notesUpd = notesUpd.eq('user_id', user.id)
          const { error: notesError } = await notesUpd
          if (notesError) console.warn('Could not update transaction notes:', notesError)
        }
      }

      // Trigger global data refresh using the new system
      console.log('🔄 Triggering global data refresh after modification')
      refreshData(user.id, 'modify_transaction')

    } catch (error) {
      console.error('Error modifying:', error)
      setError(`Error al modificar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setShowModifyConfirmation(false)
      setModifyConfirmationData(null)
      setShowModifyForm(false)
      setModifyFormData(null)
      setShowApplyToExistingModal(false)
      setApplyToExistingData(null)
      setApplyToExistingChoice(null)
      setShowExtendValuesModal(false)
      setExtendValuesData(null)
    }
  }

  const resetModifyForm = () => {
    setModifyFormData(null)
    setShowModifyForm(false)
    setShowModifyConfirmation(false)
    setModifyConfirmationData(null)
    setShowExtendValuesModal(false)
    setExtendValuesData(null)
    setShowApplyToExistingModal(false)
    setApplyToExistingData(null)
    setApplyToExistingChoice(null)
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

  const handleNotesClick = (transaction: Transaction) => {
    setNotesModalTransaction(transaction)
    setNotesModalValue(transaction.notes ?? '')
    setShowNotesModal(true)
    setOpenActionsDropdown(null)
    setOpenOptionsMenu(null)
  }

  const handleSaveNotes = async () => {
    if (!notesModalTransaction || !user) return
    try {
      await updateTransaction({
        id: notesModalTransaction.id,
        userId: user.id,
        notes: notesModalValue.trim() || null
      })
      refreshData(user.id, 'update_notes')
    } catch (e) {
      console.error('Error saving notes:', e)
      setError('Error al guardar las notas')
    } finally {
      setShowNotesModal(false)
      setNotesModalTransaction(null)
      setNotesModalValue('')
    }
  }

  const getTotalAbonado = (transactionId: number) =>
    (abonosByTransaction[transactionId] || []).reduce((sum, a) => sum + Number(a.amount), 0)

  const handleAbonarClick = (transaction: Transaction) => {
    if (transaction.type !== 'expense') return
    setAbonoModalTransaction(transaction)
    setAbonoModalAmount('')
    setAbonoModalDate(new Date().toISOString().slice(0, 10))
    setShowOverpaymentConfirm(false)
    setShowAbonoModal(true)
    setOpenActionsDropdown(null)
    setOpenOptionsMenu(null)
  }

  const handleSaveAbono = async (confirmOverpayment = false) => {
    if (!abonoModalTransaction || !user) return
    const amount = parseCurrency(abonoModalAmount)
    if (!amount || amount <= 0) {
      setError(texts.invalidAmount)
      return
    }

    const totalAbonado = getTotalAbonado(abonoModalTransaction.id)
    const newTotal = totalAbonado + amount

    if (newTotal > abonoModalTransaction.value && !confirmOverpayment) {
      setOverpaymentTotal(newTotal)
      setShowOverpaymentConfirm(true)
      return
    }

    setIsSavingAbono(true)
    setError(null)
    try {
      await createAbono(user.id, abonoModalTransaction.id, amount, abonoModalDate)
      const abonos = abonosByTransaction[abonoModalTransaction.id] || []
      setAbonosByTransaction(prev => ({
        ...prev,
        [abonoModalTransaction.id]: [...abonos, { id: 0, transaction_id: abonoModalTransaction.id, user_id: user.id, amount, paid_at: abonoModalDate, created_at: '', updated_at: '' }]
      }))

      const shouldMarkPaid = confirmOverpayment || newTotal >= abonoModalTransaction.value
      if (shouldMarkPaid) {
        const newValue = confirmOverpayment ? overpaymentTotal : abonoModalTransaction.value
        await updateTransaction({
          id: abonoModalTransaction.id,
          userId: user.id,
          value: newValue,
          deadline: abonoModalTransaction.deadline ?? undefined,
          notes: abonoModalTransaction.notes ?? undefined,
        })
        await markTransactionStatus({ transactionId: abonoModalTransaction.id, newStatus: 'paid', userId: user.id })
      }

      refreshData(user.id, 'abono')
    } catch (e) {
      console.error('Error saving abono:', e)
      setError('Error al guardar el abono')
      return
    } finally {
      setIsSavingAbono(false)
      setShowAbonoModal(false)
      setAbonoModalTransaction(null)
      setAbonoModalAmount('')
      setShowOverpaymentConfirm(false)
      setEditingAbono(null)
      setDeleteAbonoConfirm(null)
    }
  }

  const handleOverpaymentConfirm = () => {
    handleSaveAbono(true)
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
    fetchData(false)
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
      setError(null)

      if (selectedTransactionForCategory.source_type === 'recurrent') {
        // Update recurrent transaction series
        console.log('Updating recurrent transaction series with category:', finalCategory)
        
        // Update the recurrent expense
        const gidCat = (selectedTransactionForCategory as Transaction).group_id ?? currentGroupId ?? undefined
        let recCatUpd = supabase.from('recurrent_expenses').update({ category: finalCategory }).eq('id', selectedTransactionForCategory.source_id)
        if (gidCat) recCatUpd = recCatUpd.eq('group_id', gidCat); else recCatUpd = recCatUpd.eq('user_id', user.id)
        const { error: recurrentError } = await recCatUpd
        if (recurrentError) throw recurrentError

        // Update all transactions in the series
        let txCatUpd = supabase.from('transactions').update({ category: finalCategory }).eq('source_id', selectedTransactionForCategory.source_id).eq('source_type', 'recurrent')
        if (gidCat) txCatUpd = txCatUpd.eq('group_id', gidCat); else txCatUpd = txCatUpd.eq('user_id', user.id)
        const { error: transactionsError } = await txCatUpd
        if (transactionsError) throw transactionsError

      } else {
        // Update non-recurrent transaction
        console.log('Updating non-recurrent transaction with category:', finalCategory)
        
        const gidCat = (selectedTransactionForCategory as Transaction).group_id ?? currentGroupId ?? undefined
        let nreCatUpd = supabase.from('non_recurrent_expenses').update({ category: finalCategory }).eq('id', selectedTransactionForCategory.source_id)
        if (gidCat) nreCatUpd = nreCatUpd.eq('group_id', gidCat); else nreCatUpd = nreCatUpd.eq('user_id', user.id)
        const { error: nonRecurrentError } = await nreCatUpd
        if (nonRecurrentError) throw nonRecurrentError

        let txCatUpd2 = supabase.from('transactions').update({ category: finalCategory }).eq('id', selectedTransactionForCategory.id)
        if (gidCat) txCatUpd2 = txCatUpd2.eq('group_id', gidCat); else txCatUpd2 = txCatUpd2.eq('user_id', user.id)
        const { error: transactionError } = await txCatUpd2
        if (transactionError) throw transactionError
      }

//       // Update local state optimistically to preserve the status while updating category
//       setTransactions(prevTransactions => 
//         prevTransactions.map(t => {
//           if (selectedTransactionForCategory.source_type === 'recurrent') {
//             // For recurrent transactions, update all transactions in the series
//             return t.source_id === selectedTransactionForCategory.source_id && 
//                    t.source_type === 'recurrent' 
//               ? { ...t, category: finalCategory } 
//               : t
//           } else {
//             // For non-recurrent transactions, update only the specific transaction
//             return t.id === selectedTransactionForCategory.id 
//               ? { ...t, category: finalCategory } 
//               : t
//           }
//         })
//       )

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

  // Helper function to get days until deadline and format it - same logic as ComoVamosView
  const getDaysUntilDeadlineText = (deadline: string) => {
    const [year, month, day] = deadline.split('-').map(Number);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const deadlineDate = new Date(year, month - 1, day);
    const diffTime = deadlineDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return {
        text: `Vence en ${diffDays === 1 ? '1 día' : diffDays + ' días'}`,
        className: 'text-xs font-medium text-amber-800 bg-warning-bg px-2 py-1 rounded-full'
      };
    } else if (diffDays === 0) {
      return {
        text: 'Vence hoy',
        className: 'text-xs font-medium text-amber-800 bg-warning-bg px-2 py-1 rounded-full'
      };
    } else {
      return {
        text: `Venció hace ${Math.abs(diffDays) === 1 ? '1 día' : Math.abs(diffDays) + ' días'}`,
        className: 'text-xs font-medium text-red-800 bg-error-bg px-2 py-1 rounded-full'
      };
    }
  }

  // Updated getStatusText function to show specific due date text instead of simple states
  const getStatusText = (transaction: Transaction) => {
    if (transaction.status === 'paid') return texts.paid
    if (transaction.deadline) {
      return getDaysUntilDeadlineText(transaction.deadline).text
    }
    return texts.pending
  }

  // Solo colores; el tamaño y padding se aplican siempre igual en el span para consistencia
  const getStatusColor = (transaction: Transaction) => {
    if (transaction.status === 'paid') return 'bg-green-light text-green-800'
    if (transaction.deadline) {
      const [year, month, day] = transaction.deadline.split('-').map(Number)
      const today = new Date()
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const deadlineDate = new Date(year, month - 1, day)
      const diffDays = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) return 'text-red-800 bg-error-bg'
      return 'text-amber-800 bg-warning-bg'
    }
    return 'bg-warning-bg text-amber-800'
  }

  // Mobile only: status as colored circles (green/yellow/red) with optional day number
  const getMobileStatusCircle = (transaction: Transaction): { bg: string; text: string; num: number | null } => {
    if (transaction.status === 'paid') return { bg: 'bg-green-primary', text: 'text-white', num: null }
    if (transaction.deadline) {
      const [y, m, d] = transaction.deadline.split('-').map(Number)
      const today = new Date()
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const deadlineDate = new Date(y, m - 1, d)
      const diffDays = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 0) return { bg: 'bg-warning-yellow', text: 'text-gray-900', num: diffDays }
      if (diffDays === 0) return { bg: 'bg-warning-yellow', text: 'text-gray-900', num: 0 }
      return { bg: 'bg-error-red', text: 'text-white', num: Math.abs(diffDays) }
    }
    return { bg: 'bg-warning-yellow', text: 'text-gray-900', num: null }
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
      setError(null)

      // Delete only this transaction (group_id si es de grupo)
      const gid = transaction.group_id ?? currentGroupId ?? undefined
      let delQ = supabase.from('transactions').delete().eq('id', transactionId)
      if (gid) delQ = delQ.eq('group_id', gid); else delQ = delQ.eq('user_id', user.id)
      const { error } = await delQ

      if (error) throw error

      // Trigger global data refresh using the new system
      console.log('🔄 Triggering global data refresh after individual deletion')
      refreshData(user.id, 'delete_transaction')
      
    } catch (error) {
      console.error('Error deleting individual transaction:', error)
      setError(`Error al eliminar transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setShowDeleteIndividualConfirmation(false)
      setDeleteIndividualConfirmationData(null)
    }
  }

  const handleCancelDeleteIndividual = () => {
    setShowDeleteIndividualConfirmation(false)
    setDeleteIndividualConfirmationData(null)
  }


  // Debugging logs for transaction filtering
  if (process.env.NODE_ENV === 'development') {
    console.log('[zustand] Filtro activo:', selectedMonth, selectedYear)
    console.log('[zustand] Todas las transacciones:', transactions)
    console.log('[zustand] Transacciones visibles:', transactions.filter(t => t.month === selectedMonth && t.year === selectedYear))
  }

  if (!user || !selectedMonth || !selectedYear) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 font-sans">{texts.loading}</p>
        </div>
      </div>
    )
  }

  if (!isGroupsLoading && !currentGroupId) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center bg-transparent px-4">
          <div className="text-center max-w-md mx-auto">
            {groups.length === 0 ? (
              <>
                <div className="w-20 h-20 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-10 w-10 text-green-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 font-sans mb-2">
                  Crea tu espacio para comenzar
                </h3>
                <p className="text-sm text-gray-600 font-sans mb-6">
                  Organiza tus finanzas en un espacio propio. Puedes compartirlo luego con familia o equipo para llevar las cuentas juntos.
                </p>
                <CreateSpaceButton
                  user={user}
                  onSuccess={() => {
                    const newGroupId = useGroupStore.getState().currentGroupId
                    if (newGroupId && syncToUrl) {
                      router.push(buildMisCuentasUrl(selectedYear, selectedMonth, {
                        tipo: filterType === 'all' ? undefined : filterType,
                        grupo: newGroupId,
                      }))
                    }
                  }}
                />
              </>
            ) : (
              <p className="text-sm text-gray-600 font-sans">Selecciona un grupo para ver las transacciones.</p>
            )}
          </div>
        </div>
      </>
    )
  }

  const displayValue = (v: number) => isLoading ? '—' : formatCurrency(v)
  const faltaPagar = summaryTotals.pending

  const tieneVencimientos = summaryTotals.overdue > 0
  const cuantoQueda = summaryTotals.cuantoQueda

  return (
    <div className="flex-1 flex flex-col h-screen bg-transparent">
      {/* Barra superior */}
      <div className="px-4 lg:px-8 py-3 bg-white border-b border-gray-200 space-y-3">
        {/* MOBILE: Mis cuentas + GroupBadge | grid Año/Mes/Mes Actual | Añadir movimiento | totales */}
        <div className="lg:hidden flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-dark font-sans">Mis cuentas</h2>
            <GroupBadge user={user} variant="light" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={selectedYear}
              onChange={(e) => handleMonthYearChange(Number(e.target.value), selectedMonth)}
              className="w-full min-w-0 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-dark font-sans focus:ring-2 focus:ring-green-primary focus:border-green-primary"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthYearChange(selectedYear, Number(e.target.value))}
              className="w-full min-w-0 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-dark font-sans focus:ring-2 focus:ring-green-primary focus:border-green-primary"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <button
              onClick={() => handleMonthYearChange(new Date().getFullYear(), new Date().getMonth() + 1)}
              className="w-full min-w-0 px-2 py-2.5 text-sm font-medium text-green-primary bg-green-light border border-green-primary/40 hover:bg-green-primary hover:text-white rounded-md transition-colors font-sans whitespace-nowrap"
            >
              Mes Actual
            </button>
          </div>
          {onAddExpense && (
            <button
              onClick={onAddExpense}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-b from-sky-600 to-sky-700 text-white rounded-lg text-sm font-medium border border-sky-700/50 shadow-[0_4px_14px_rgba(2,132,199,0.35),0_2px_6px_rgba(0,0,0,0.08)] hover:from-sky-700 hover:to-sky-800 hover:shadow-[0_6px_20px_rgba(2,132,199,0.4),0_3px_8px_rgba(0,0,0,0.12)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] active:scale-[0.99] transition-all duration-200 font-sans min-h-[44px]"
              aria-label={texts.addTransaction}
            >
              <Plus className="h-4 w-4" />
              {texts.addTransaction}
            </button>
          )}
        </div>

        {/* DESKTOP: 2xl+ título+filtros izq, totales der | lg-2xl título+filtros arriba, totales debajo */}
        <div className="hidden lg:flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3">
          <div className="flex flex-nowrap items-center gap-2 lg:gap-4 min-w-0 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-dark font-sans shrink-0">Mis cuentas</h2>
            <GroupBadge user={user} variant="light" />
            <div className="flex flex-nowrap items-center gap-2 shrink-0">
              <select
                value={selectedYear}
                onChange={(e) => handleMonthYearChange(Number(e.target.value), selectedMonth)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-dark font-sans focus:ring-2 focus:ring-green-primary focus:border-green-primary min-w-[72px] shrink-0"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthYearChange(selectedYear, Number(e.target.value))}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-dark font-sans focus:ring-2 focus:ring-green-primary focus:border-green-primary min-w-[100px] shrink-0"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <button
                onClick={() => handleMonthYearChange(new Date().getFullYear(), new Date().getMonth() + 1)}
                className="px-2 py-1.5 lg:px-4 text-sm font-medium text-green-primary bg-green-light border border-green-primary/40 hover:bg-green-primary hover:text-white rounded-md transition-colors font-sans whitespace-nowrap shrink-0"
              >
                Mes Actual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - totales + tabla (scroll para más campo de visión; solo barra hasta Añadir queda fija) */}
      <div className="flex-1 px-4 lg:px-0 pb-6 lg:pb-8 overflow-auto">
        <div className="max-w-4xl lg:max-w-none mx-auto lg:mx-0 space-y-4">
          {/* Error Display - scrolla con el contenido */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 mb-1">{texts.errorOccurred}</h3>
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}
          {/* Totales - scrollan con el contenido */}
          <div className="lg:hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full text-sm font-sans bg-gray-50 rounded-lg p-2 border border-gray-200 shadow-[0_4px_14px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]">
              <div className="flex flex-col p-2.5 rounded-md border border-dashed border-gray-300/80 bg-white/60">
                <span className="text-gray-500">Ingresos:</span>
                <span className="font-medium text-gray-800 tabular-nums">{displayValue(summaryTotals.income)}</span>
              </div>
              <div className="flex flex-col p-2.5 rounded-md border border-dashed border-gray-300/80 bg-white/60">
                <span className="text-gray-500">Total comprometido:</span>
                <span className="font-medium text-gray-800 tabular-nums">{displayValue(summaryTotals.expense)}</span>
              </div>
              {faltaPagar > 0 ? (
                <div className="flex flex-col p-2.5 rounded-md border border-dashed border-gray-300/80 bg-white/60">
                  <span className="text-gray-500">Pendiente de pago:</span>
                  <span className="font-medium text-gray-800 tabular-nums">{displayValue(faltaPagar)}</span>
                </div>
              ) : (
                <div className="flex flex-col p-2.5 rounded-md border border-dashed border-gray-300/80 bg-white/60">
                  <span className="text-gray-500">Pagado:</span>
                  <span className="font-medium text-gray-800 tabular-nums">{displayValue(summaryTotals.paid)}</span>
                </div>
              )}
              {cuantoQueda >= 0 && (
                <div className="flex flex-col p-2.5 rounded-md border border-dashed border-gray-300/80 bg-white/60">
                  <span className="text-gray-500">Disponible real:</span>
                  <span className="font-medium text-gray-800 tabular-nums">{displayValue(cuantoQueda)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:flex flex-wrap items-center justify-evenly 2xl:justify-start gap-x-4 gap-y-1 w-full text-sm font-sans bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 shadow-[0_4px_14px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]">
            <span className="text-gray-500">Ingresos: <span className="font-medium text-gray-800 tabular-nums">{displayValue(summaryTotals.income)}</span></span>
            <span className="text-gray-500">Total comprometido: <span className="font-medium text-gray-800 tabular-nums">{displayValue(summaryTotals.expense)}</span></span>
            {faltaPagar > 0 ? (
              <span className="text-gray-500">Pendiente de pago: <span className="font-medium text-gray-800 tabular-nums">{displayValue(faltaPagar)}</span></span>
            ) : (
              <span className="text-gray-500">Pagado: <span className="font-medium text-gray-800 tabular-nums">{displayValue(summaryTotals.paid)}</span></span>
            )}
            {cuantoQueda >= 0 && (
              <span className="text-gray-500">Disponible real: <span className="font-medium text-gray-800 tabular-nums">{displayValue(cuantoQueda)}</span></span>
            )}
            {tieneVencimientos && (
              <span className="text-gray-500">Mora: <span className="font-medium text-gray-800 tabular-nums">{displayValue(summaryTotals.overdue)}</span></span>
            )}
          </div>
          {/* Transacciones del mes - full width en desktop (sidebar a derecha); full viewport en mobile */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-screen relative left-1/2 -ml-[50vw] lg:w-full lg:left-0 lg:ml-0">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-medium text-gray-dark font-sans">
                    Movimientos del mes
                  </h3>
                  {tieneVencimientos && (
                    <span className="lg:hidden inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 text-white shadow-sm">
                      Mora: {displayValue(summaryTotals.overdue)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-sans">
                  Control detallado de tus movimientos financieros
                </p>
              </div>
              {/* Desktop: GroupBadge y Añadir movimiento junto al título */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                <GroupBadge user={user} variant="light" />
                {onAddExpense && (
                  <button
                    onClick={onAddExpense}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-sky-600 to-sky-700 text-white rounded-lg text-sm font-medium border border-sky-700/50 shadow-[0_4px_14px_rgba(2,132,199,0.35),0_2px_6px_rgba(0,0,0,0.08)] hover:from-sky-700 hover:to-sky-800 hover:shadow-[0_6px_20px_rgba(2,132,199,0.4),0_3px_8px_rgba(0,0,0,0.12)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] active:scale-[0.99] transition-all duration-200 font-sans"
                    aria-label={texts.addTransaction}
                  >
                    <Plus className="h-4 w-4" />
                    {texts.addTransaction}
                  </button>
                )}
              </div>
            </div>
            {isLoading ? (
              <div className="text-center py-8 text-green-dark font-sans">{texts.loading}</div>
            ) : finalSortedTransactions.length === 0 ? (
              <div className="text-center px-4 py-8">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plus className="h-8 w-8 text-green-primary" />
                </div>
                <h3 className="text-base font-medium text-gray-500 mb-2 font-sans opacity-80 break-words hyphens-none max-w-sm mx-auto">
                  No tienes transacciones registradas para este mes aún.
                </h3>
                <p className="text-sm text-gray-400 font-sans opacity-60 break-words hyphens-none max-w-md mx-auto">
                  Empieza agregando tus ingresos o gastos y toma el control de tu dinero.
                </p>
              </div>
            ) : (
              <>
              {/* Desktop Table View */}
              <div className="hidden lg:block" onMouseLeave={() => setHoveredRow(null)}>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed">
                    <colgroup>
                      <col className="w-[47%]" />
                      <col className="w-[90px]" />
                      <col className="w-[59px]" />
                    </colgroup>
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th 
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-border-light select-none font-sans border-r border-dashed border-gray-300 bg-gray-50"
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
                          className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-border-light select-none font-sans w-[90px] border-r border-dashed border-gray-300"
                          onClick={() => handleSort('value')}
                        >
                          <div className="flex items-center space-x-1 justify-center">
                            <span>{texts.amount}</span>
                            {sortField === 'value' && (
                              sortDirection === 'asc' ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-border-light select-none font-sans w-[59px]"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>{texts.status}</span>
                            {sortField === 'status' && (
                              sortDirection === 'asc' ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {finalSortedTransactions.map((transaction) => {
                        const isSavingsTransaction = transaction.category === 'Ahorro'
                        return (
                          <tr key={transaction.id} className="group/row bg-white hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <td className="px-2 py-2 max-w-0 border-r border-dashed border-gray-300 overflow-visible">
                              <div className="relative bg-white group-hover/row:bg-gray-50 h-full flex items-center gap-2 min-w-0 min-h-[52px]">
                                <div className="flex-shrink-0">
                                  <TransactionIcon
                                    transaction={transaction}
                                    recurrentGoalMap={recurrentGoalMap}
                                    size="w-4 h-4"
                                    showBackground={true}
                                  />
                                </div>
                                <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
                                  <span
                                    className="text-sm font-medium text-gray-900 truncate font-sans block"
                                    title={transaction.description}
                                  >
                                    {transaction.description}
                                  </span>
                                  {transaction.type === 'expense' &&
                                   !(transaction.category === 'Ahorro' && (transaction.source_type === 'recurrent' ? !recurrentGoalMap[transaction.source_id] : true)) &&
                                   !(transaction.source_type === 'recurrent' && recurrentGoalMap[transaction.source_id]) && (
                                    <button
                                      onClick={() => handleCategoryClick(transaction)}
                                      className="text-xs font-medium text-green-dark bg-beige px-2 py-1 rounded-full hover:bg-border-light hover:text-gray-dark transition-colors cursor-pointer font-sans flex-shrink-0"
                                    >
                                      {transaction.category && transaction.category !== 'sin categoría' ? transaction.category : 'sin categoría'}
                                    </button>
                                  )}
                                  {transaction.notes && transaction.notes.trim() && (
                                    <div
                                      data-notes-tooltip-trigger
                                      data-transaction-id={transaction.id}
                                      className="relative flex-shrink-0"
                                      onMouseEnter={() => {
                                        if (notesTooltipCloseTimeoutRef.current) {
                                          clearTimeout(notesTooltipCloseTimeoutRef.current)
                                          notesTooltipCloseTimeoutRef.current = null
                                        }
                                        setHoveredNotesId(transaction.id)
                                      }}
                                      onMouseLeave={() => {
                                        notesTooltipCloseTimeoutRef.current = setTimeout(() => setHoveredNotesId(null), 100)
                                      }}
                                    >
                                      <StickyNote className="h-3 w-3 text-amber-500 cursor-default" aria-label="Ver notas" />
                                    </div>
                                  )}
                                </div>
                                {(transaction.deadline || transaction.source_type === 'recurrent') && (
                                  <div
                                    data-info-tooltip-trigger
                                    data-transaction-id={transaction.id}
                                    className="relative group/info flex-shrink-0"
                                    onClick={(e) => { e.stopPropagation(); setOpenInfoTooltipId(prev => prev === transaction.id ? null : transaction.id) }}
                                    onMouseEnter={() => {
                                      if (infoTooltipCloseTimeoutRef.current) {
                                        clearTimeout(infoTooltipCloseTimeoutRef.current)
                                        infoTooltipCloseTimeoutRef.current = null
                                      }
                                      setOpenInfoTooltipId(transaction.id)
                                    }}
                                    onMouseLeave={() => {
                                      infoTooltipCloseTimeoutRef.current = setTimeout(() => setOpenInfoTooltipId(null), 100)
                                    }}
                                  >
                                    <Info className="h-3 w-3 text-gray-400 cursor-pointer" aria-label="Ver vencimiento y rango" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-1.5 py-2 whitespace-nowrap text-right w-[90px] border-r border-dashed border-gray-300">
                              <div className="flex items-center justify-end gap-x-1">
                                <div className="text-sm font-medium text-gray-900 font-sans text-right tabular-nums">
                                  {formatCurrency(transaction.value)}
                                  {(abonosByTransaction[transaction.id]?.length ?? 0) > 0 && transaction.type === 'expense' && transaction.status !== 'paid' && (
                                    <span className="block text-xs text-gray-500 font-normal">
                                      {formatCurrency(getTotalAbonado(transaction.id))}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-x-0.5 flex-shrink-0">
                                {/* Pay/Unpay - always visible */}
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={transaction.status === 'paid'}
                                    onChange={(e) => {
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
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-all duration-300 rounded-full" />
                                  </label>
                                </div>
                                {/* Dropdown for other actions - rendered via portal to overlay table */}
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                      if (openActionsDropdown === transaction.id) {
                                        setOpenActionsDropdown(null)
                                        setActionsDropdownAnchor(null)
                                      } else {
                                        setOpenActionsDropdown(transaction.id)
                                        setActionsDropdownAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                      }
                                    }}
                                    className="p-1 rounded-md text-green-dark hover:bg-gray-100 hover:opacity-80 transition-all"
                                    aria-label="Más opciones"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap w-[59px] text-center">
                              <span className={cn("inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium font-sans", getStatusColor(transaction))}>
                                {getStatusText(transaction)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions dropdown via portal - overlays table so it's always visible */}
              {typeof document !== 'undefined' &&
               openActionsDropdown !== null &&
               actionsDropdownAnchor &&
               (() => {
                 const transaction = finalSortedTransactions.find((t) => t.id === openActionsDropdown)
                 if (!transaction) return null
                 const closeDropdown = () => {
                   setOpenActionsDropdown(null)
                   setActionsDropdownAnchor(null)
                 }
                 return createPortal(
                   <div
                     className="fixed py-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[140px] z-[9999]"
                     style={{ top: actionsDropdownAnchor.top, right: actionsDropdownAnchor.right }}
                     onClick={(e) => e.stopPropagation()}
                   >
                     <button
                       onClick={() => {
                         handleAttachmentList(transaction)
                         closeDropdown()
                       }}
                       className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 font-sans"
                     >
                       <Paperclip className="w-4 h-4 flex-shrink-0" />
                       <span>{texts.attachments}</span>
                       {attachmentCounts[transaction.id] > 0 && (
                         <span className="ml-auto bg-warning-bg text-gray-700 text-xs rounded-full px-2 py-0.5">
                           {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
                         </span>
                       )}
                     </button>
                     <button
                       onClick={() => {
                         handleNotesClick(transaction)
                         closeDropdown()
                       }}
                       className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 font-sans"
                     >
                       <StickyNote className={cn('w-4 h-4 flex-shrink-0', transaction.notes?.trim() && 'text-amber-500')} />
                       <span className="flex items-center gap-1.5">
                         {texts.notes}
                         {transaction.notes?.trim() && (
                           <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                         )}
                       </span>
                     </button>
                     {transaction.type === 'expense' && transaction.status !== 'paid' && (
                       <button
                         onClick={() => {
                           handleAbonarClick(transaction)
                           closeDropdown()
                         }}
                         className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 font-sans"
                       >
                         <Wallet className="w-4 h-4 flex-shrink-0" />
                         <span>{texts.abonar}</span>
                       </button>
                     )}
                     <button
                       onClick={() => {
                         handleModifyTransaction(transaction.id)
                         closeDropdown()
                       }}
                       className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 font-sans"
                     >
                       <Edit className="w-4 h-4 flex-shrink-0" />
                       <span>Editar</span>
                     </button>
                     <button
                       onClick={() => {
                         handleDeleteTransaction(transaction.id)
                         closeDropdown()
                       }}
                       className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 font-sans"
                     >
                       <Trash2 className="w-4 h-4 flex-shrink-0" />
                       <span>{texts.delete}</span>
                     </button>
                   </div>,
                   document.body
                 )
               })()}

              {/* Mobile Table View - 3 columnas: descripción | valor+3puntos | estado (sin scroll, estado con wrap) */}
              <div className="lg:hidden overflow-x-auto" onMouseLeave={() => setOpenOptionsMenu(null)}>
                <table className="min-w-0 w-full max-w-full text-xs table-fixed">
                  <colgroup>
                    <col className="w-[128px]" />
                    <col className="w-[126px]" />
                    <col className="w-[70px]" />
                  </colgroup>
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="pl-1.5 pr-1.5 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider font-sans border-r border-dashed border-gray-300 bg-gray-50 w-[128px]">
                        {texts.description}
                      </th>
                      <th className="pl-1 pr-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider font-sans w-[126px] border-r border-dashed border-gray-300">{texts.amount}</th>
                      <th className="px-0.5 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider font-sans">{texts.status}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {finalSortedTransactions.map((transaction) => {
                      const isMenuOpen = openOptionsMenu === transaction.id
                      return (
                        <tr key={transaction.id} className="border-b border-gray-100">
                          <td className="px-1.5 py-1.5 w-[128px] border-r border-dashed border-gray-300 overflow-visible">
                            <div className="relative bg-white h-full flex items-center gap-1 min-w-0 min-h-[44px]">
                              <div className="flex-shrink-0">
                                <TransactionIcon
                                  transaction={transaction}
                                  recurrentGoalMap={recurrentGoalMap}
                                  size="w-2.5 h-2.5"
                                  showBackground={true}
                                  containerSize="w-5 h-5"
                                />
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <span
                                  className="text-xs font-medium text-gray-900 font-sans block break-words w-full"
                                  title={transaction.description}
                                >
                                  {transaction.description}
                                </span>
                              </div>
                              {(transaction.deadline || transaction.source_type === 'recurrent') && (
                                <div
                                  data-info-tooltip-trigger
                                  data-transaction-id={transaction.id}
                                  className="relative flex-shrink-0"
                                  onClick={(e) => { e.stopPropagation(); setOpenInfoTooltipId(prev => prev === transaction.id ? null : transaction.id) }}
                                >
                                  <Info className="h-3 w-3 text-gray-400 cursor-pointer" aria-label="Ver vencimiento y rango" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 align-middle border-r border-dashed border-gray-300" style={{ width: 126, paddingLeft: 0, paddingRight: 0 }}>
                            <div className="w-full flex justify-end">
                              <div className="inline-flex items-center gap-x-1 flex-shrink-0">
                              <div className="leading-tight text-right shrink-0 tabular-nums">
                                <span className="text-xs font-medium text-gray-900 font-sans">{formatCurrency(transaction.value)}</span>
                                {(abonosByTransaction[transaction.id]?.length ?? 0) > 0 && transaction.type === 'expense' && transaction.status !== 'paid' && (
                                  <span className="block text-[9px] text-gray-500">{formatCurrency(getTotalAbonado(transaction.id))}</span>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={transaction.status === 'paid'}
                                onChange={(e) => handleCheckboxChange(transaction.id, e.target.checked)}
                                className="sr-only"
                                id={`checkbox-mobile-${transaction.id}`}
                              />
                              <label
                                htmlFor={`checkbox-mobile-${transaction.id}`}
                                className={`
                                  inline-flex items-center justify-center w-4 h-4 rounded-full cursor-pointer transition-all flex-shrink-0
                                  ${transaction.status === 'paid' ? 'bg-green-primary border-green-primary' : 'bg-beige border border-border-light'}
                                `}
                              >
                                {transaction.status === 'paid' && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </label>
                              <div className="relative flex justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => { setOpenInfoTooltipId(null); setOpenOptionsMenu(isMenuOpen ? null : transaction.id) }}
                                  className="p-1 rounded text-gray-500 hover:bg-gray-100 flex justify-center items-center shrink-0"
                                  aria-label="Más opciones"
                                  style={{ width: 28, minWidth: 28 }}
                                >
                                  <MoreVertical className="w-3.5 h-3.5 flex-shrink-0" />
                                </button>
                                {isMenuOpen && (
                                  <div className="absolute right-0 top-full mt-0.5 py-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[140px] z-20">
                                    {transaction.type === 'expense' && !(transaction.category === 'Ahorro' && (transaction.source_type === 'recurrent' ? !recurrentGoalMap[transaction.source_id] : true)) && !(transaction.source_type === 'recurrent' && recurrentGoalMap[transaction.source_id]) && (
                                      <button onClick={() => { handleCategoryClick(transaction); setOpenOptionsMenu(null) }} className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 font-sans">
                                        <Tag className="w-3 h-3 flex-shrink-0" />
                                        <span>Categoría: {transaction.category && transaction.category !== 'sin categoría' ? transaction.category : 'sin categoría'}</span>
                                      </button>
                                    )}
                                    <button onClick={() => { handleAttachmentList(transaction); setOpenOptionsMenu(null) }} className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 font-sans">
                                      <Paperclip className="w-3 h-3 flex-shrink-0" /><span>{texts.attachments}</span>
                                      {attachmentCounts[transaction.id] > 0 && <span className="ml-auto bg-warning-bg text-gray-700 text-[10px] rounded-full px-1.5 py-0.5">{attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}</span>}
                                    </button>
                                    <button onClick={() => { handleNotesClick(transaction); setOpenOptionsMenu(null) }} className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 font-sans">
                                      <StickyNote className={cn("w-3 h-3 flex-shrink-0", transaction.notes?.trim() && "text-amber-500")} />
                                      <span className="flex items-center gap-1.5">
                                        {texts.notes}
                                        {transaction.notes?.trim() && (
                                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                        )}
                                      </span>
                                    </button>
                                    {transaction.type === 'expense' && transaction.status !== 'paid' && (
                                      <button onClick={() => { handleAbonarClick(transaction); setOpenOptionsMenu(null) }} className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 font-sans">
                                        <Wallet className="w-3 h-3 flex-shrink-0" /><span>{texts.abonar}</span>
                                      </button>
                                    )}
                                    <button onClick={() => { handleModifyTransaction(transaction.id); setOpenOptionsMenu(null) }} className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 font-sans">
                                      <Edit className="w-3 h-3 flex-shrink-0" /><span>Editar</span>
                                    </button>
                                    <button onClick={() => { handleDeleteTransaction(transaction.id); setOpenOptionsMenu(null) }} className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 font-sans">
                                      <Trash2 className="w-3 h-3 flex-shrink-0" /><span>{texts.delete}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            </div>
                          </td>
                          <td className="px-0.5 py-1.5 align-middle text-center min-w-0">
                            <span className={cn("inline-block max-w-full px-1.5 py-0.5 rounded-full text-xs font-medium font-sans break-words text-center leading-tight", getStatusColor(transaction))}>
                              {getStatusText(transaction)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
            )}
          </div>

          {/* Tooltip Info (vencimiento/rango) en Portal - encima del ícono, centrado */}
          {openInfoTooltipId && infoTooltipAnchor && typeof document !== 'undefined' && (() => {
            const tx = finalSortedTransactions.find(t => t.id === openInfoTooltipId)
            if (!tx) return null
            const gap = 6
            const style: React.CSSProperties = {
              position: 'fixed',
              left: infoTooltipAnchor.left + infoTooltipAnchor.width / 2,
              top: infoTooltipAnchor.top - gap,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999,
            }
            return createPortal(
              <div
                data-info-tooltip-content
                className="bg-gray-800 text-white text-xs rounded-md p-2 whitespace-nowrap shadow-lg"
                style={style}
                onMouseEnter={() => {
                  if (infoTooltipCloseTimeoutRef.current) {
                    clearTimeout(infoTooltipCloseTimeoutRef.current)
                    infoTooltipCloseTimeoutRef.current = null
                  }
                }}
                onMouseLeave={() => setOpenInfoTooltipId(null)}
              >
                {tx.deadline && (
                  <div>Vence: {(() => {
                    const [y, m, d] = tx.deadline!.split('-').map(Number)
                    return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`
                  })()}</div>
                )}
                {tx.source_type === 'recurrent' && (() => {
                  const re = recurrentExpenses.find(r => Number(r.id) === Number(tx.source_id))
                  return re ? <div>Rango: {monthAbbreviations[re.month_from - 1]} {re.year_from} - {monthAbbreviations[re.month_to - 1]} {re.year_to}</div> : null
                })()}
              </div>,
              document.body
            )
          })()}

          {/* Tooltip Notas (desktop) en Portal para que no se corte por overflow de la tabla */}
          {hoveredNotesId && notesTooltipAnchor && typeof document !== 'undefined' && (() => {
            const tx = finalSortedTransactions.find(t => t.id === hoveredNotesId)
            if (!tx?.notes?.trim()) return null
            const style: React.CSSProperties = {
              position: 'fixed',
              left: notesTooltipAnchor.left + notesTooltipAnchor.width + 8,
              top: notesTooltipAnchor.top,
              zIndex: 9999,
            }
            return createPortal(
              <div
                data-notes-tooltip-content
                className="bg-gray-800 text-white text-xs rounded-md p-2 max-w-xs break-words shadow-lg"
                style={style}
                onMouseEnter={() => {
                  if (notesTooltipCloseTimeoutRef.current) {
                    clearTimeout(notesTooltipCloseTimeoutRef.current)
                    notesTooltipCloseTimeoutRef.current = null
                  }
                }}
                onMouseLeave={() => setHoveredNotesId(null)}
              >
                {tx.notes}
              </div>,
              document.body
            )
          })()}

          {/* Notes Modal (quick edit from dropdown) */}
          {showNotesModal && notesModalTransaction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" onClick={() => { setShowNotesModal(false); setNotesModalTransaction(null); setNotesModalValue('') }} />
              <section className="modify-form-modal relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setShowNotesModal(false); setNotesModalTransaction(null); setNotesModalValue('') }}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 z-10"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-amber-50 rounded-full p-1.5">
                      <StickyNote className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{texts.notes}</h2>
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">{notesModalTransaction.description}</p>
                    </div>
                  </div>
                  <textarea
                    value={notesModalValue}
                    onChange={(e) => setNotesModalValue(e.target.value.slice(0, 500))}
                    placeholder={texts.notesPlaceholder}
                    rows={4}
                    maxLength={500}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1 font-sans">{notesModalValue.length}/500</p>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => { setShowNotesModal(false); setNotesModalTransaction(null); setNotesModalValue('') }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      {texts.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-primary rounded-md hover:bg-[#77b16e]"
                    >
                      {texts.save}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Abono Modal (partial payments) */}
          {showAbonoModal && abonoModalTransaction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                aria-hidden="true"
                onClick={() => {
                  if (showOverpaymentConfirm) setShowOverpaymentConfirm(false)
                  else if (editingAbono) { setEditingAbono(null); setEditAbonoAmount(''); setError(null) }
                  else if (deleteAbonoConfirm) setDeleteAbonoConfirm(null)
                  else {
                    setShowAbonoModal(false)
                    setAbonoModalTransaction(null)
                    setAbonoModalAmount('')
                  }
                }}
              />
              <section className="modify-form-modal relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    if (showOverpaymentConfirm) setShowOverpaymentConfirm(false)
                    else if (editingAbono) { setEditingAbono(null); setEditAbonoAmount(''); setError(null) }
                    else if (deleteAbonoConfirm) setDeleteAbonoConfirm(null)
                    else {
                      setShowAbonoModal(false)
                      setAbonoModalTransaction(null)
                      setAbonoModalAmount('')
                    }
                  }}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 z-10"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="p-6 flex flex-col overflow-hidden flex-1 min-h-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-50 rounded-full p-1.5">
                      <Wallet className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{texts.abonar}</h2>
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">{abonoModalTransaction.description}</p>
                    </div>
                  </div>

                  {showOverpaymentConfirm ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">{texts.abonoExceedsValue}</p>
                      <p className="text-sm text-gray-700 font-medium">
                        {texts.abonoExceedsConfirm.replace('{total}', formatCurrency(overpaymentTotal))}
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowOverpaymentConfirm(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          {texts.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={handleOverpaymentConfirm}
                          disabled={isSavingAbono}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-primary rounded-md hover:bg-[#77b16e] disabled:opacity-50"
                        >
                          {isSavingAbono ? '...' : texts.save}
                        </button>
                      </div>
                    </div>
                  ) : deleteAbonoConfirm ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-error-bg rounded-full p-1.5">
                          <Trash2 className="h-4 w-4 text-error-red" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">{texts.deleteAbono}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{texts.areYouSure}</p>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <span className="text-gray-700">{formatCurrency(Number(deleteAbonoConfirm.ab.amount))}</span>
                        <span className="text-gray-500"> · {deleteAbonoConfirm.ab.paid_at ? new Date(deleteAbonoConfirm.ab.paid_at).toLocaleDateString('es-CO') : '-'}</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteAbonoConfirm(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          {texts.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!user) return
                            await deleteAbono(user.id, deleteAbonoConfirm.ab.id)
                            setAbonosByTransaction(prev => {
                              const list = (prev[deleteAbonoConfirm.transaction.id] || []).filter(a => a.id !== deleteAbonoConfirm.ab.id)
                              return { ...prev, [deleteAbonoConfirm.transaction.id]: list }
                            })
                            refreshData(user.id, 'abono')
                            setDeleteAbonoConfirm(null)
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-error-red rounded-md hover:bg-red-700"
                        >
                          {texts.delete}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Lista de abonos existentes */}
                      <div className="mb-4 flex-shrink-0">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">{texts.totalAbonado}: {formatCurrency(getTotalAbonado(abonoModalTransaction.id))} / {formatCurrency(abonoModalTransaction.value)}</h3>
                        <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                          {(abonosByTransaction[abonoModalTransaction.id] || []).length === 0 ? (
                            <p className="px-3 py-3 text-sm text-gray-500">{texts.noAbonosYet}</p>
                          ) : (
                            (abonosByTransaction[abonoModalTransaction.id] || []).map((ab) => (
                              <div key={ab.id} className="px-3 py-2 text-sm border-b border-gray-100 last:border-b-0">
                                {editingAbono?.id === ab.id ? (
                                  <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-600">{texts.amountToAbonar}</label>
                                    {error && <p className="text-xs text-red-600">{error}</p>}
                                    <input
                                      type="text"
                                      value={editAbonoAmount}
                                      onChange={(e) => setEditAbonoAmount(e.target.value)}
                                      placeholder="0"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => { setEditingAbono(null); setEditAbonoAmount(''); setError(null) }}
                                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                      >
                                        {texts.cancel}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!user || !ab.paid_at) return
                                          const v = parseCurrency(editAbonoAmount)
                                          if (v > 0) {
                                            await updateAbono(user.id, ab.id, v, ab.paid_at)
                                            setAbonosByTransaction(prev => {
                                              const list = prev[abonoModalTransaction.id] || []
                                              return { ...prev, [abonoModalTransaction.id]: list.map(a => a.id === ab.id ? { ...a, amount: v } : a) }
                                            })
                                            refreshData(user.id, 'abono')
                                            setEditingAbono(null)
                                            setEditAbonoAmount('')
                                            setError(null)
                                          } else {
                                            setError(texts.invalidAmount)
                                          }
                                        }}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-primary rounded-md hover:bg-[#77b16e]"
                                      >
                                        {texts.save}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <span>{formatCurrency(Number(ab.amount))} · {ab.paid_at ? new Date(ab.paid_at).toLocaleDateString('es-CO') : '-'}</span>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingAbono(ab)
                                          setEditAbonoAmount(String(ab.amount))
                                          setError(null)
                                        }}
                                        className="text-green-dark hover:underline"
                                      >
                                        {texts.editAbono}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteAbonoConfirm({ ab, transaction: abonoModalTransaction })}
                                        className="text-red-600 hover:underline"
                                      >
                                        {texts.deleteAbono}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Nuevo abono */}
                      <div className="space-y-3 flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700">{texts.amountToAbonar}</label>
                        <input
                          type="text"
                          value={abonoModalAmount}
                          onChange={(e) => setAbonoModalAmount(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                        />
                        <label className="block text-sm font-medium text-gray-700">{texts.abonoDate}</label>
                        <input
                          type="date"
                          value={abonoModalDate}
                          onChange={(e) => setAbonoModalDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                        />
                      </div>
                      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
                      <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAbonoModal(false)
                            setAbonoModalTransaction(null)
                            setAbonoModalAmount('')
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          {texts.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveAbono(false)}
                          disabled={isSavingAbono}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-primary rounded-md hover:bg-[#77b16e] disabled:opacity-50"
                        >
                          {isSavingAbono ? '...' : texts.addAbono}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

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
            <div key={`modify-modal-${modifyModalData.transactionId}`} className="fixed inset-0 z-[100] flex items-center justify-center">
              {/* Overlay borroso - no captura clicks */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all pointer-events-none" aria-hidden="true"></div>
              <section className="relative z-10 bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
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
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleConfirmModify(true) }}
                          className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors cursor-pointer"
                        >
                          Toda la Serie
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleConfirmModify(false) }}
                          className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors cursor-pointer"
                        >
                          Solo Esta Transacción
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
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
              <section className="modify-form-modal relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
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
                              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
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
                              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
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
                              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
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
                              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
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
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
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
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
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
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
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
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
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
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
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
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-dark">Fecha de Vencimiento</label>
                          <input
                            type="date"
                            value={modifyFormData.payment_deadline}
                            onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                          />
                        </div>
                      </div>

                      {/* Notas */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-dark">{texts.notes}</label>
                        <textarea
                          value={modifyFormData.notes ?? ''}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, notes: e.target.value.slice(0, 500) } : null)}
                          placeholder={texts.notesPlaceholder}
                          rows={3}
                          maxLength={500}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400 resize-none"
                        />
                        <p className="text-xs text-gray-500 font-sans">{(modifyFormData.notes?.length ?? 0)}/500</p>
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
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
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
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-dark">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          value={modifyFormData.payment_deadline}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm"
                        />
                      </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">{texts.notes}</label>
                      <textarea
                        value={modifyFormData.notes ?? ''}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, notes: e.target.value.slice(0, 500) } : null)}
                        placeholder={texts.notesPlaceholder}
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400 resize-none"
                      />
                      <p className="text-xs text-gray-500 font-sans">{(modifyFormData.notes?.length ?? 0)}/500</p>
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

          {/* Extend Series: valores para meses nuevos (Fase 2) */}
          {showExtendValuesModal && extendValuesData && modifyFormData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
              <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
                <button
                  onClick={() => {
                    setShowExtendValuesModal(false)
                    setExtendValuesData(null)
                  }}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="px-6 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                      <Info className="h-4 w-4 text-green-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Extender serie</h2>
                  </div>
                  <p className="text-sm text-gray-500">
                    Se crearán transacciones para los siguientes meses. Indica el valor y día de pago que tendrán:
                  </p>
                  
                  <div className="w-full bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-gray-700">{extendValuesData.newMonthsLabel}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Valor ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(extendValuesData.suggestedValue)}
                        onChange={(e) => setExtendValuesData(prev => prev ? {
                          ...prev,
                          suggestedValue: parseCurrency(e.target.value)
                        } : null)}
                        placeholder="$0"
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-dark">Día de pago</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={extendValuesData.suggestedPaymentDay}
                        onChange={(e) => setExtendValuesData(prev => prev ? {
                          ...prev,
                          suggestedPaymentDay: e.target.value
                        } : null)}
                        placeholder="5"
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="w-full bg-green-light border border-green-200 rounded-lg p-2.5">
                    <p className="text-sm text-green-primary">
                      Las transacciones existentes conservan su valor y fecha. Solo se aplica a los meses nuevos.
                    </p>
                  </div>

                  <div className="w-full space-y-2">
                    <button
                      onClick={handleConfirmExtendValues}
                      className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors"
                    >
                      Confirmar y continuar
                    </button>
                    <button
                      onClick={() => {
                        setShowExtendValuesModal(false)
                        setExtendValuesData(null)
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

          {/* Aplicar valor/due date a existentes: toda la serie vs de acá en adelante */}
          {showApplyToExistingModal && applyToExistingData && modifyFormData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
              <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
                <button
                  onClick={() => {
                    setShowApplyToExistingModal(false)
                    setApplyToExistingData(null)
                  }}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="px-6 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full p-1.5">
                      <Info className="h-4 w-4 text-green-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">¿Aplicar cambios a transacciones existentes?</h2>
                  </div>
                  <p className="text-sm text-gray-500">Cambiaste los siguientes datos. Indica si quieres aplicarlos a las transacciones que ya existen:</p>
                  
                  <div className="w-full bg-gray-50 rounded-lg p-3 space-y-2">
                    {applyToExistingData.valueChanged && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Valor:</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(applyToExistingData.oldValue)} → {formatCurrency(applyToExistingData.newValue)}</span>
                      </div>
                    )}
                    {applyToExistingData.dueDateChanged && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Día de pago:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {applyToExistingData.oldDueDay ? `día ${applyToExistingData.oldDueDay}` : '—'} → {applyToExistingData.newDueDay ? `día ${applyToExistingData.newDueDay}` : '—'}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">¿Aplicar estos cambios a:</p>
                  <div className="w-full space-y-2">
                    <button
                      onClick={() => handleConfirmApplyToExisting('all')}
                      className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors text-left"
                    >
                      Toda la serie
                    </button>
                    <button
                      onClick={() => handleConfirmApplyToExisting('from_month')}
                      className="w-full px-4 py-2 bg-green-light border border-green-primary/40 text-green-primary rounded-xl text-sm font-medium hover:bg-green-primary hover:text-white transition-colors text-left"
                    >
                      De {months[applyToExistingData.fromMonth - 1]} {applyToExistingData.fromYear} en adelante
                    </button>
                    <button
                      onClick={() => {
                        if (!modifyFormData) return
                        setShowApplyToExistingModal(false)
                        setApplyToExistingData(null)
                        setApplyToExistingChoice(null)
                        const period = modifyFormData.type === 'recurrent' 
                          ? `${months[modifyFormData.month_from - 1]} ${modifyFormData.year_from} a ${months[modifyFormData.month_to - 1]} ${modifyFormData.year_to}`
                          : `${months[modifyFormData.month - 1]} ${modifyFormData.year}`
                        setModifyConfirmationData({ type: modifyFormData.type, description: modifyFormData.description, value: modifyFormData.value, period, action: 'modify entire series' })
                        setShowModifyConfirmation(true)
                      }}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      No aplicar (solo descripción y rango)
                    </button>
                  </div>
                </div>
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
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium hover:bg-[#77b16e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
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
                      groupId={selectedTransactionForList.group_id ?? currentGroupId ?? null}
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
                        className={`flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-50 transition cursor-pointer ${
                          selectedCategory === 'Sin categoría' ? 'bg-green-light' : ''
                        }`}
                        onClick={() => handleCategorySelection('Sin categoría')}
                      >
                        <div className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                          <span>Sin categoría</span>
                          <span className="text-xs text-gray-400">
                            · Predeterminada
                          </span>
                          {selectedTransactionForCategory.category === 'Sin categoría' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-[#e4effa] text-[#3f70ad]">
                              Actual
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Current category (if not "Sin categoría") */}
                      {selectedTransactionForCategory.category && selectedTransactionForCategory.category !== 'Sin categoría' && (
                        <div
                          className={`flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-50 transition cursor-pointer ${
                            selectedCategory === selectedTransactionForCategory.category ? 'bg-green-light' : ''
                          }`}
                          onClick={() => handleCategorySelection(selectedTransactionForCategory.category!)}
                        >
                          <div className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                            <span>{selectedTransactionForCategory.category}</span>
                            <span className="text-xs text-gray-400">
                              · {Object.values(CATEGORIES.EXPENSE).includes(selectedTransactionForCategory.category as any) ? 'Predeterminada' : 'Creada por ti'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-[#e4effa] text-[#3f70ad]">
                              Actual
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
                              className={`flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-50 transition cursor-pointer ${
                                selectedCategory === category ? 'bg-green-light' : ''
                              }`}
                              onClick={() => handleCategorySelection(category)}
                            >
                              <div className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                                <span>{category}</span>
                                <span className="text-xs text-gray-400">
                                  · {isDefault ? 'Predeterminada' : 'Creada por ti'}
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
                      disabled={isLoading || !selectedCategory}
                      className="flex-1 bg-green-primary text-white py-2 px-3 rounded-md hover:bg-[#77b16e] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isLoading ? 'Guardando...' : 'Actualizar'}
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
                        {deleteSeriesConfirmationData.isOrphaned ? (
                          <p className="text-sm text-yellow-800">La serie ya no existe. Se eliminarán las transacciones asociadas.</p>
                        ) : (
                          <p className="text-sm text-yellow-800">Se eliminarán todas las transacciones, abonos y la serie. Esta acción no se puede deshacer.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="w-full space-y-2">
                    <button
                      onClick={handleConfirmDeleteSeries}
                      disabled={isDeletingSeries}
                      className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingSeries ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error-red mr-2"></div>
                          Eliminando...
                        </div>
                      ) : (
                        deleteSeriesConfirmationData.isOrphaned ? 'Eliminar transacciones' : 'Eliminar serie'
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
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-error-bg text-error-red border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
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

          {/* Mark as Paid Confirmation Modal */}
          {showMarkAsPaidModal && paymentConfirmationData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Overlay borroso y semitransparente */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
              <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
                <button
                  onClick={() => handleConfirmPaymentStatusChange(false)}
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
                    <h2 className="text-lg font-semibold text-gray-900 font-sans">¿Confirmas?</h2>
                  </div>
                  <p className="text-sm text-gray-500 font-sans">Este movimiento se marcará como pagado.</p>

                  {/* Botones de acción */}
                  <div className="w-full space-y-2">
                    <button
                      onClick={() => handleConfirmPaymentStatusChange(true)}
                      className="w-full px-4 py-2 bg-green-primary text-white rounded-xl text-sm font-medium font-sans hover:bg-[#77b16e] transition-colors"
                    >
                      Sí, marcar como pagado
                    </button>
                    
                    <button
                      onClick={() => handleConfirmPaymentStatusChange(false)}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium font-sans hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Unmark as Paid Confirmation Modal */}
          {showUnmarkAsPaidModal && paymentConfirmationData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Overlay borroso y semitransparente */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
              <section className="relative bg-white rounded-2xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
                <button
                  onClick={() => handleConfirmPaymentStatusChange(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="px-6 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full p-1.5">
                      <RotateCcw className="h-4 w-4 text-gray-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 font-sans">¿Confirmas?</h2>
                  </div>
                  <p className="text-sm text-gray-500 font-sans">Este movimiento ya no estará marcado como pagado.</p>

                  {/* Botones de acción */}
                  <div className="w-full space-y-2">
                    <button
                      onClick={() => handleConfirmPaymentStatusChange(true)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-xl text-sm font-medium font-sans hover:bg-gray-700 transition-colors"
                    >
                      Sí, desmarcar
                    </button>
                    
                    <button
                      onClick={() => handleConfirmPaymentStatusChange(false)}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium font-sans hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 