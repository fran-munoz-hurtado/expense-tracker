'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Target, TrendingUp, DollarSign, Calendar, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, X, Paperclip, Repeat } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserExpenses, measureQueryPerformance, fetchAttachmentCounts } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useSearchParams } from 'next/navigation'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import { getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { getTransactionIconType, getTransactionIconColor, getTransactionIconBackground } from '@/lib/utils/transactionIcons'
import { renderCustomIcon } from '@/lib/utils/iconRenderer'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'
import TransactionIcon from './TransactionIcon'
import React from 'react' // Added missing import for React
import { useTransactionStore } from '@/lib/store/transactionStore'

interface MisMetasViewProps {
  user: User
  navigationParams?: { year?: number } | null
}

// Type definitions for the hierarchical structure
interface YearData {
  year: number
  transactions: Transaction[]
  totalValue: number
  paidValue: number
  progress: number
  status: 'paid' | 'pending' | 'overdue' | 'current'
  isCompleted: boolean
}

interface GoalData {
  key: string
  source: RecurrentExpense | NonRecurrentExpense
  years: YearData[]
  totalValue: number
  paidValue: number
  progress: number
  isCompleted: boolean
}

export default function MisMetasView({ user, navigationParams }: MisMetasViewProps) {
  const searchParams = useSearchParams()
  const { refreshData } = useDataSync()
  const navigation = useAppNavigation()
  
  // Zustand store
  const { transactions, isLoading, fetchTransactions } = useTransactionStore()
  
  // Function to validate goal transactions for debugging
  function validateGoalTransactions(transactions: Transaction[]) {
    const invalid = transactions.filter(t => t.type !== 'expense')
    if (invalid.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('[zustand] MisMetasView: Found', invalid.length, 'non-expense transactions that should be excluded', invalid.slice(0, 3))
    }
  }
  
  // Direct attachment functionality implementation (without external hook)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)
  const [showTransactionAttachments, setShowTransactionAttachments] = useState(false)
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null)

  // State for new single-column layout with detail view
  const [selectedObjective, setSelectedObjective] = useState<Transaction | null>(null)

  // Load attachment counts for a list of transactions
  const loadAttachmentCounts = async (transactions: Transaction[]) => {
    if (transactions && transactions.length > 0) {
      const transactionIds = transactions.map((t: Transaction) => t.id)
      const attachmentCountsData = await fetchAttachmentCounts(user, transactionIds)
      setAttachmentCounts(attachmentCountsData)
    }
  }

  // Attachment handlers
  const handleAttachmentUpload = (transaction: Transaction) => {
    setSelectedTransactionForAttachments(transaction)
    setShowAttachmentModal(true)
    setShowTransactionAttachments(false)
  }

  const handleAttachmentList = (transaction: Transaction) => {
    setSelectedTransactionForAttachments(transaction)
    setShowTransactionAttachments(true)
  }

  // Handle attachment deleted event
  const handleAttachmentDeleted = (attachmentId: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Attachment deleted:', attachmentId)
    }
  }

  // Function to handle attachment upload completion
  const handleAttachmentUploadComplete = (attachment: TransactionAttachment) => {
    setAttachmentCounts(prev => ({
      ...prev,
      [attachment.transaction_id]: (prev[attachment.transaction_id] || 0) + 1
    }))
    
    if (selectedTransactionForAttachments) {
      setSelectedTransactionForAttachments(selectedTransactionForAttachments)
      setShowTransactionAttachments(true)
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Attachment uploaded:', attachment)
    }
  }

  // Attachment clip component
  const AttachmentClip = ({ transaction, className = "" }: { transaction: Transaction, className?: string }) => {
    return (
      <button
        onClick={() => handleAttachmentList(transaction)}
        className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 relative flex items-center justify-center p-1 rounded-md transition-all duration-200 hover:scale-105"
        title="View attachments"
      >
        <Paperclip className="w-3 h-3" />
        {attachmentCounts[transaction.id] > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-warning-bg text-gray-700 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-normal">
            {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
          </span>
        )}
      </button>
    )
  }

  // State for recurrent expenses (needed for recurrentGoalMap)
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Create recurrentGoalMap like in other views (needs recurrentExpenses)
  const recurrentGoalMap = useMemo(() => {
    const map: Record<number, boolean> = {}
    recurrentExpenses.forEach(expense => {
      map[expense.id] = expense.isgoal || false
    })
    return map
  }, [recurrentExpenses])
  
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  
  // Filter state for goals
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Available years for selection
  const availableYears = Array.from({ length: 16 }, (_, i) => 2025 + i)

  // Current date for highlighting
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Month names for display
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Helper function to determine if a date is overdue
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

  // Helper function to format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Navigation handler to go to Mis cuentas with specific month/year filters
  const handleNavigateToMonth = async (month: number, year: number) => {
    try {
      console.log(`🔄 MisMetasView: Navigating to Mis cuentas - ${month}/${year}`)
      await navigation.navigateToDashboard(month, year)
      console.log('✅ Navigation completed')
    } catch (error) {
      console.error('❌ Navigation error:', error)
    }
  }

  // Get status color for transactions
  const getStatusColor = (transaction: Transaction): string => {
    if (transaction.status === 'paid') {
      return 'bg-green-light text-green-primary'
    } else if (transaction.deadline && isDateOverdue(transaction.deadline)) {
      return 'bg-error-bg text-error-red'
    } else {
      return 'bg-warning-bg text-warning-yellow'
    }
  }

  // Get status text for transactions
  const getStatusText = (transaction: Transaction): string => {
    if (transaction.status === 'paid') {
      return texts.paid
    } else if (transaction.deadline && isDateOverdue(transaction.deadline)) {
      return texts.overdue
    } else {
      return texts.pending
    }
  }

  // Fetch goal data using pure Zustand pattern
  const fetchGoalData = useCallback(async () => {
    if (!user) return
    
    try {
      setError(null)
      
      console.log('[zustand] MisMetasView: fetchTransactions triggered')
      
      // Use pure Zustand pattern with scope: 'all' for historical goal data
      await fetchTransactions({ 
        userId: user.id, 
        scope: 'all' // Fetch all transactions without month/year filters
      })
      
      console.log('[zustand] MisMetasView: transactions loaded:', transactions.length)
      
      // Also fetch expenses to build recurrentGoalMap (this is legitimate)
      const expenses = await fetchUserExpenses(user)
      setRecurrentExpenses(expenses.recurrent)
      setNonRecurrentExpenses(expenses.nonRecurrent)

      // Load attachment counts for all transactions
      await loadAttachmentCounts(transactions)

      // Validate goal data
      validateGoalTransactions(transactions)

    } catch (error) {
      console.error('❌ Error in fetchGoalData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [user, fetchTransactions, transactions])

  // Initial data fetch
  useEffect(() => {
    fetchGoalData()
  }, [fetchGoalData])

  // Sync with URL parameters
  useEffect(() => {
    const yearFromUrl = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    if (yearFromUrl && yearFromUrl !== selectedYear) {
      setSelectedYear(yearFromUrl)
    }
  }, [searchParams])

  // Data sync effect using pure Zustand pattern
  useDataSyncEffect(() => {
    console.log('[zustand] MisMetasView: useDataSyncEffect triggered')
    fetchGoalData()
  }, [fetchGoalData])

  // Group objective transactions by unique goal (not individual transactions)
  interface ObjectiveGroup {
    key: string
    source: RecurrentExpense | NonRecurrentExpense
    sourceType: 'recurrent' | 'non_recurrent'
    transactions: Transaction[]
    totalValue: number
    status: 'active' | 'completed' | 'overdue'
    label: string
    yearRange: string
    overdue: number
  }

  const objectiveGroups: ObjectiveGroup[] = useMemo(() => {
    // Filter transactions that belong to goals - use transactions from Zustand
    const goalTransactions = transactions.filter(t => 
      t.type === 'expense' && (
        (t.source_type === 'recurrent' && recurrentExpenses.filter(re => re.isgoal).some(re => re.id === t.source_id)) ||
        (t.source_type === 'non_recurrent' && nonRecurrentExpenses.filter(nre => nre.isgoal).some(nre => nre.id === t.source_id))
      )
    )
    
    if (!goalTransactions.length) return []

    // Group by unique objective (source_type + source_id)
    const groupsMap = new Map<string, ObjectiveGroup>()

    goalTransactions.forEach(transaction => {
      const key = `${transaction.source_type}-${transaction.source_id}`
      
      if (!groupsMap.has(key)) {
        // Find the source expense
        const source = transaction.source_type === 'recurrent'
          ? recurrentExpenses.find(re => re.id === transaction.source_id)
          : nonRecurrentExpenses.find(nre => nre.id === transaction.source_id)

        if (!source) return

        // Calculate year range
        const relatedTransactions = goalTransactions.filter(t => 
          t.source_type === transaction.source_type && t.source_id === transaction.source_id
        )
        const years = Array.from(new Set(relatedTransactions.map(t => t.year))).sort()
        const yearRange = years.length > 1 ? `${years[0]}-${years[years.length - 1]}` : `${years[0]}`

        // Calculate status
        const completedTransactions = relatedTransactions.filter(t => t.status === 'paid')
        const overdueTransactions = relatedTransactions.filter(t => 
          t.status !== 'paid' && t.deadline && isDateOverdue(t.deadline)
        )

        let status: 'active' | 'completed' | 'overdue'
        if (overdueTransactions.length > 0) {
          status = 'overdue'
        } else if (completedTransactions.length === relatedTransactions.length) {
          status = 'completed'
        } else {
          status = 'active'
        }

        groupsMap.set(key, {
          key,
          source,
          sourceType: transaction.source_type,
          transactions: relatedTransactions,
          totalValue: relatedTransactions.reduce((sum, t) => sum + t.value, 0),
          status,
          label: source.description,
          yearRange,
          overdue: overdueTransactions.length
        })
      }
    })

    return Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [transactions, recurrentExpenses, nonRecurrentExpenses])

  // Filter groups based on selected filter
  const filteredObjectiveGroups = useMemo(() => {
    if (goalFilter === 'all') return objectiveGroups
    if (goalFilter === 'active') return objectiveGroups.filter(g => g.status === 'active')
    if (goalFilter === 'completed') return objectiveGroups.filter(g => g.status === 'completed')
    return objectiveGroups
  }, [objectiveGroups, goalFilter])

  // Calculate stats based on unique objectives
  const goalStats = useMemo(() => {
    const totalGoals = objectiveGroups.length
    const totalValue = objectiveGroups.reduce((sum, g) => sum + g.totalValue, 0)
    const completed = objectiveGroups.filter(g => g.status === 'completed').length

    return { totalGoals, totalValue, completed }
  }, [objectiveGroups])

  // Attachment Modals component  
  const AttachmentModals = () => {
    return (
      <>
        {/* File Upload Modal */}
        {showAttachmentModal && selectedTransactionForAttachments && (
          <FileUploadModal
            isOpen={showAttachmentModal}
            onClose={() => {
              setShowAttachmentModal(false)
              setSelectedTransactionForAttachments(null)
            }}
            transactionId={selectedTransactionForAttachments.id}
            userId={user.id}
            onUploadComplete={handleAttachmentUploadComplete}
          />
        )}

        {/* Attachments List Modal */}
        {showTransactionAttachments && selectedTransactionForAttachments && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
            <section className="relative bg-white rounded-xl p-0 w-full max-w-md shadow-sm border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowTransactionAttachments(false)
                  setSelectedTransactionForAttachments(null)
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
                    <p className="text-sm text-gray-500">Para: {selectedTransactionForAttachments.description}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <TransactionAttachments
                    transactionId={selectedTransactionForAttachments.id}
                    userId={user.id}
                    onAttachmentDeleted={handleAttachmentDeleted}
                    onAddAttachment={() => handleAttachmentUpload(selectedTransactionForAttachments)}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </>
    )
  }

  // Development logging for Zustand transactions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isLoading) {
      const goalTxs = transactions.filter(t => t.type === 'expense')
      console.log('[zustand] MisMetasView: loaded', goalTxs.length, 'transactions (possible goals) from Zustand')
    }
  }, [isLoading, transactions])

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark">Mis Metas</h2>
          <p className="text-sm text-green-dark">Gestiona y monitorea el progreso de tus metas financieras</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 mb-1">{texts.errorOccurred}</h3>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Same structure as DashboardView */}
      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Filtros con ancho uniforme - Solo visible en desktop */}
          <div className="hidden sm:block bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Bloque 1: Filtros + Resultados */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                
                {/* Botones de Estado de Metas */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGoalFilter('all')}
                    className={`text-sm rounded-full px-3 py-1 transition-all duration-200 ${
                      goalFilter === 'all'
                        ? 'bg-green-primary text-white font-medium'
                        : 'bg-white text-green-dark border border-border-light hover:bg-[#f5f6f4]'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setGoalFilter('active')}
                    className={`text-sm rounded-full px-3 py-1 transition-all duration-200 ${
                      goalFilter === 'active'
                        ? 'bg-green-primary text-white font-medium'
                        : 'bg-white text-green-dark border border-border-light hover:bg-[#f5f6f4]'
                    }`}
                  >
                    Activas
                  </button>
                  <button
                    onClick={() => setGoalFilter('completed')}
                    className={`text-sm rounded-full px-3 py-1 transition-all duration-200 ${
                      goalFilter === 'completed'
                        ? 'bg-green-primary text-white font-medium'
                        : 'bg-white text-green-dark border border-border-light hover:bg-[#f5f6f4]'
                    }`}
                  >
                    Completas
                  </button>
                </div>
                
                {/* Separador visual - solo desktop */}
                <div className="hidden sm:block w-px h-6 bg-border-light"></div>
                
                {/* Etiqueta de resultados */}
                <span className="text-xs font-medium text-green-dark bg-[#f0f0ec] px-2 py-0.5 rounded-full">
                  {filteredObjectiveGroups.length} resultados
                </span>
              </div>
              
              {/* Bloque 2: Botón Acción */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setGoalFilter('all');
                  }}
                  className="bg-green-primary text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-[#77b16e] transition-all duration-200"
                >
                  Todas las Metas
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Resumen en contenedor blanco - estructura exacta de DashboardView */}
          <div className="rounded-xl bg-white shadow-soft p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Resumen de metas
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Estadísticas generales de tus objetivos financieros
              </p>
            </div>

            {/* Cards de resumen - responsive design */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {/* Cantidad de metas */}
              <div className="bg-gray-50 sm:bg-[#f8f9f9] border border-[#e0e0e0] rounded-md p-3 sm:px-4 sm:py-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-500 sm:text-[#777] font-sans mb-1">
                  <Target className="w-4 h-4 text-gray-400 hidden sm:block" />
                  <span>Cantidad de metas</span>
                </div>
                <p className="text-base font-semibold sm:text-lg sm:font-medium text-gray-900 sm:text-gray-800 font-sans truncate">
                  {goalStats.totalGoals}
                </p>
              </div>

              {/* Valor acumulado */}
              <div className="bg-gray-50 sm:bg-[#f8f9f9] border border-[#e0e0e0] rounded-md p-3 sm:px-4 sm:py-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-500 sm:text-[#777] font-sans mb-1">
                  <DollarSign className="w-4 h-4 text-gray-400 hidden sm:block" />
                  <span>Valor acumulado</span>
                </div>
                <p className="text-base font-semibold sm:text-lg sm:font-medium text-gray-900 sm:text-gray-800 font-sans truncate">
                  {formatCurrency(goalStats.totalValue)}
                </p>
              </div>

              {/* Completadas */}
              <div className="bg-gray-50 sm:bg-[#f8f9f9] border border-[#e0e0e0] rounded-md p-3 sm:px-4 sm:py-2 text-center sm:text-left col-span-2 sm:col-span-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-500 sm:text-[#777] font-sans mb-1">
                  <CheckCircle className="w-4 h-4 text-gray-400 hidden sm:block" />
                  <span>Completadas</span>
                </div>
                <p className="text-base font-semibold sm:text-lg sm:font-medium text-gray-900 sm:text-gray-800 font-sans truncate">
                  {goalStats.completed}
                </p>
              </div>
            </div>
          </div>

          {/* Objectives List Container - Same structure as other sections */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Mis objetivos financieros
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Revisa y gestiona tus metas organizadas por estado
              </p>
            </div>

            {/* Objectives List - Same design as CategoriesView transactions */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">{texts.loading}</div>
              ) : filteredObjectiveGroups.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm font-medium">No hay metas para mostrar</p>
                  <p className="text-xs mt-2">
                    {goalFilter === 'all' 
                      ? 'Agrega metas marcando la opción "Es Meta" al crear gastos.' 
                      : goalFilter === 'active' 
                        ? 'No hay metas activas en este momento.'
                        : 'No hay metas completadas en este momento.'
                    }
                  </p>
                </div>
              ) : (
                <div>
                  {/* Group active objectives */}
                  {filteredObjectiveGroups.filter(g => g.status === 'active').length > 0 && (
                    <div>
                      {/* Header para Objetivos activos - estructura exacta de CategoriesView */}
                      <div className="bg-neutral-bg border-b border-neutral-200 py-2 px-4 rounded-t-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                            OBJETIVOS
                          </span>
                        </div>
                      </div>
                      
                      {/* Lista de objetivos activos - EXACT structure from CategoriesView */}
                      <div>
                        {filteredObjectiveGroups.filter(g => g.status === 'active').map((objective) => {
                          const firstTransaction = objective.transactions[0]
                          return (
                            <button
                              key={objective.key}
                              onClick={() => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('🖱️ MisMetasView: Objective clicked, selecting first transaction', firstTransaction)
                                }
                                setSelectedObjective(firstTransaction)
                              }}
                              className="w-full text-left border-b border-gray-100 transition-colors hover:bg-gray-50 sm:p-3 p-0"
                            >
                              {/* Desktop Layout */}
                              <div className="hidden sm:block p-3">
                                <div className="flex items-center justify-between">
                                  {/* Left section: Icon + Name + Date/Range */}
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      <TransactionIcon 
                                        transaction={firstTransaction}
                                        recurrentGoalMap={recurrentGoalMap}
                                        size="w-3 h-3"
                                        containerSize="w-5 h-5"
                                        showBackground={true}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2">
                                        <div className="text-sm font-medium text-gray-900 truncate font-sans">{objective.label}</div>
                                        <div className="text-xs text-gray-500 font-sans flex-shrink-0">{objective.yearRange}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Right section: Status + Amount */}
                                  <div className="flex items-center space-x-3 flex-shrink-0">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans ${
                                      objective.overdue > 0 ? 'bg-error-bg text-error-red' : 'bg-green-light text-green-primary'
                                    }`}>
                                      {objective.overdue > 0 ? 'Vencido' : 'Al día'}
                                    </span>
                                    <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(objective.totalValue)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Layout - Vertical Card */}
                              <div className="sm:hidden bg-white rounded-md p-3 space-y-1 shadow-sm w-full mb-2">
                                {/* Line 1: Icon + Name + Status Badge */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      <TransactionIcon 
                                        transaction={firstTransaction}
                                        recurrentGoalMap={recurrentGoalMap}
                                        size="w-3 h-3"
                                        containerSize="w-5 h-5"
                                        showBackground={true}
                                      />
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 truncate font-sans flex-1">{objective.label}</div>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans ${
                                    objective.overdue > 0 ? 'bg-error-bg text-error-red' : 'bg-green-light text-green-primary'
                                  }`}>
                                    {objective.overdue > 0 ? 'Vencido' : 'Al día'}
                                  </span>
                                </div>
                                
                                {/* Line 2: Year Range + Amount */}
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500 font-sans">{objective.yearRange}</div>
                                  <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(objective.totalValue)}</div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group completed objectives */}
                  {filteredObjectiveGroups.filter(g => g.status === 'completed').length > 0 && (
                    <div>
                      {/* Header para Objetivos completados - estructura exacta de CategoriesView */}
                      <div className="bg-neutral-bg border-b border-neutral-200 py-2 px-4 rounded-t-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                            OBJETIVOS
                          </span>
                        </div>
                      </div>
                      
                      {/* Lista de objetivos completados - EXACT structure from CategoriesView */}
                      <div>
                        {filteredObjectiveGroups.filter(g => g.status === 'completed').map((objective) => {
                          const firstTransaction = objective.transactions[0]
                          return (
                            <button
                              key={objective.key}
                              onClick={() => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('🖱️ MisMetasView: Objective clicked, selecting first transaction', firstTransaction)
                                }
                                setSelectedObjective(firstTransaction)
                              }}
                              className="w-full text-left border-b border-gray-100 transition-colors hover:bg-gray-50 sm:p-3 p-0"
                            >
                              {/* Desktop Layout */}
                              <div className="hidden sm:block p-3">
                                <div className="flex items-center justify-between">
                                  {/* Left section: Icon + Name + Date/Range */}
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      <TransactionIcon 
                                        transaction={firstTransaction}
                                        recurrentGoalMap={recurrentGoalMap}
                                        size="w-3 h-3"
                                        containerSize="w-5 h-5"
                                        showBackground={true}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2">
                                        <div className="text-sm font-medium text-gray-900 truncate font-sans">{objective.label}</div>
                                        <div className="text-xs text-gray-500 font-sans flex-shrink-0">{objective.yearRange}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Right section: Status + Amount */}
                                  <div className="flex items-center space-x-3 flex-shrink-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-green-light text-green-primary">
                                      Completado
                                    </span>
                                    <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(objective.totalValue)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Layout - Vertical Card */}
                              <div className="sm:hidden bg-white rounded-md p-3 space-y-1 shadow-sm w-full mb-2">
                                {/* Line 1: Icon + Name + Status Badge */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      <TransactionIcon 
                                        transaction={firstTransaction}
                                        recurrentGoalMap={recurrentGoalMap}
                                        size="w-3 h-3"
                                        containerSize="w-5 h-5"
                                        showBackground={true}
                                      />
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 truncate font-sans flex-1">{objective.label}</div>
                                  </div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-green-light text-green-primary">
                                    Completado
                                  </span>
                                </div>

                                {/* Line 2: Year Range + Amount */}
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500 font-sans">{objective.yearRange}</div>
                                  <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(objective.totalValue)}</div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group overdue objectives */}
                  {filteredObjectiveGroups.filter(g => g.status === 'overdue').length > 0 && (
                    <div>
                      {/* Header para Objetivos vencidos - estructura exacta de CategoriesView */}
                      <div className="bg-neutral-bg border-b border-neutral-200 py-2 px-4 rounded-t-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                            OBJETIVOS
                          </span>
                        </div>
                      </div>
                      
                      {/* Lista de objetivos vencidos - EXACT structure from CategoriesView */}
                      <div>
                        {filteredObjectiveGroups.filter(g => g.status === 'overdue').map((objective) => {
                          const firstTransaction = objective.transactions[0]
                          return (
                            <button
                              key={objective.key}
                              onClick={() => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('🖱️ MisMetasView: Objective clicked, selecting first transaction', firstTransaction)
                                }
                                setSelectedObjective(firstTransaction)
                              }}
                              className="w-full text-left border-b border-gray-100 transition-colors hover:bg-gray-50 sm:p-3 p-0"
                            >
                              {/* Desktop Layout */}
                              <div className="hidden sm:block p-3">
                                <div className="flex items-center justify-between">
                                  {/* Left section: Icon + Name + Date/Range */}
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      <TransactionIcon 
                                        transaction={firstTransaction}
                                        recurrentGoalMap={recurrentGoalMap}
                                        size="w-3 h-3"
                                        containerSize="w-5 h-5"
                                        showBackground={true}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2">
                                        <div className="text-sm font-medium text-gray-900 truncate font-sans">{objective.label}</div>
                                        <div className="text-xs text-gray-500 font-sans flex-shrink-0">{objective.yearRange}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Right section: Status + Amount */}
                                  <div className="flex items-center space-x-3 flex-shrink-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-error-bg text-error-red">
                                      Vencido
                                    </span>
                                    <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(objective.totalValue)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Layout - Vertical Card */}
                              <div className="sm:hidden bg-white rounded-md p-3 space-y-1 shadow-sm w-full mb-2">
                                {/* Line 1: Icon + Name + Status Badge */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      <TransactionIcon 
                                        transaction={firstTransaction}
                                        recurrentGoalMap={recurrentGoalMap}
                                        size="w-3 h-3"
                                        containerSize="w-5 h-5"
                                        showBackground={true}
                                      />
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 truncate font-sans flex-1">{objective.label}</div>
                                  </div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-error-bg text-error-red">
                                    Vencido
                                  </span>
                                </div>

                                {/* Line 2: Year Range + Amount */}
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500 font-sans">{objective.yearRange}</div>
                                  <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(objective.totalValue)}</div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detail Table for Selected Objective - Same structure as CategoriesView */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            {!selectedObjective ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                  Detalle de transacción
                </h3>
                <p className="text-xs text-gray-500 font-sans">
                  Selecciona un objetivo para ver su historial mensual
                </p>
              </div>
            ) : (
              <div>
                {/* Header - Same as CategoriesView */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                    {selectedObjective.source_type === 'recurrent' 
                      ? `Detalle mensual: ${selectedObjective.description}`
                      : `Detalle transacción única: ${selectedObjective.description}`
                    }
                  </h3>
                  <p className="text-xs text-gray-500 font-sans">
                    {selectedObjective.source_type === 'recurrent' 
                      ? `Historial completo de esta transacción recurrente`
                      : `Información asociada a esta transacción no recurrente`
                    }
                  </p>
                </div>

                {/* Table - Same as CategoriesView */}
                <div className="overflow-x-auto">
                  {/* Desktop Table */}
                  <table className="hidden sm:table min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Período
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Fecha límite
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Adjuntos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {(() => {
                        // Si es recurrente, filtrar todas las transacciones relacionadas
                        // Si es única, solo mostrar esa transacción
                        const goalTransactions = transactions.filter(t => 
                          t.type === 'expense' && (
                            (t.source_type === 'recurrent' && recurrentExpenses.filter(re => re.isgoal).some(re => re.id === t.source_id)) ||
                            (t.source_type === 'non_recurrent' && nonRecurrentExpenses.filter(nre => nre.isgoal).some(nre => nre.id === t.source_id))
                          )
                        )
                        
                        const relatedTransactions = selectedObjective.source_type === 'recurrent'
                          ? goalTransactions.filter(t => 
                              t.source_type === 'recurrent' && 
                              t.source_id === selectedObjective.source_id &&
                              t.type === selectedObjective.type
                            ).sort((a, b) => {
                              // Ordenar por año y mes
                              if (a.year !== b.year) return a.year - b.year
                              return a.month - b.month
                            })
                          : [selectedObjective] // Para únicas, solo la transacción seleccionada

                        // Agrupar por año
                        const groupedByYear = relatedTransactions.reduce((groups, transaction) => {
                          const year = transaction.year
                          if (!groups[year]) {
                            groups[year] = []
                          }
                          groups[year].push(transaction)
                          return groups
                        }, {} as Record<number, Transaction[]>)

                        const sortedYears = Object.keys(groupedByYear)
                          .map(year => parseInt(year))
                          .sort((a, b) => a - b)

                        return sortedYears.map((year) => (
                          <React.Fragment key={year}>
                            {/* Year divider row */}
                            <tr>
                              <td colSpan={5} className="px-4 pt-4 pb-2 border-t border-gray-200 bg-white">
                                <div className="text-sm text-gray-500 font-sans">
                                  {year}
                                </div>
                              </td>
                            </tr>
                            {/* Transactions for this year */}
                            {groupedByYear[year].map((transaction, index) => (
                              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center space-x-3">
                                    <TransactionIcon
                                      transaction={transaction}
                                      recurrentGoalMap={recurrentGoalMap}
                                      size="w-4 h-4"
                                      containerSize="w-6 h-6"
                                    />
                                    <div className="flex items-center space-x-2">
                                      <div className="text-sm font-medium text-gray-900 font-sans">
                                        {months[transaction.month - 1]}
                                      </div>
                                      {transaction.year === currentYear && transaction.month === currentMonth && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-[#e4effa] text-[#3f70ad]">
                                          Actual
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleNavigateToMonth(transaction.month, transaction.year)}
                                        className="text-gray-400 hover:text-blue-600 transition-all duration-300 p-1 rounded-md hover:bg-blue-50 hover:scale-[1.005] hover:shadow-sm"
                                        title={`Ir a Mis cuentas - ${months[transaction.month - 1]} ${transaction.year}`}
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
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900 font-sans">
                                    {transaction.deadline ? (() => {
                                      const [year, month, day] = transaction.deadline.split('-').map(Number)
                                      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
                                    })() : '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans",
                                    getStatusColor(transaction)
                                  )}>
                                    {getStatusText(transaction)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-medium text-gray-900 font-sans">
                                    {formatCurrency(transaction.value)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex justify-center">
                                    <AttachmentClip transaction={transaction} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      })()}
                    </tbody>
                  </table>

                  {/* Mobile Card Layout - Exact same structure as CategoriesView */}
                  <div className="sm:hidden space-y-4">
                    {(() => {
                      // Si es recurrente, filtrar todas las transacciones relacionadas
                      // Si es única, solo mostrar esa transacción
                      const goalTransactions = transactions.filter(t => 
                        t.type === 'expense' && (
                          (t.source_type === 'recurrent' && recurrentExpenses.filter(re => re.isgoal).some(re => re.id === t.source_id)) ||
                          (t.source_type === 'non_recurrent' && nonRecurrentExpenses.filter(nre => nre.isgoal).some(nre => nre.id === t.source_id))
                        )
                      )
                      
                      const relatedTransactions = selectedObjective.source_type === 'recurrent'
                        ? goalTransactions.filter(t => 
                            t.source_type === 'recurrent' && 
                            t.source_id === selectedObjective.source_id &&
                            t.type === selectedObjective.type
                          ).sort((a, b) => {
                            // Ordenar por año y mes
                            if (a.year !== b.year) return a.year - b.year
                            return a.month - b.month
                          })
                        : [selectedObjective] // Para únicas, solo la transacción seleccionada

                      // Agrupar por año
                      const groupedByYear = relatedTransactions.reduce((groups, transaction) => {
                        const year = transaction.year
                        if (!groups[year]) {
                          groups[year] = []
                        }
                        groups[year].push(transaction)
                        return groups
                      }, {} as Record<number, Transaction[]>)

                      const sortedYears = Object.keys(groupedByYear)
                        .map(year => parseInt(year))
                        .sort((a, b) => a - b)

                      return sortedYears.map((year) => (
                        <div key={year}>
                          {/* Year divider */}
                          <div className="text-sm text-gray-500 font-sans font-medium border-b border-gray-200 pb-2 mb-3">
                            {year}
                          </div>
                          
                          {/* Transaction cards for this year */}
                          <div className="space-y-3">
                            {groupedByYear[year].map((transaction) => (
                              <div key={transaction.id} className="bg-white rounded-md p-3 shadow-sm border border-gray-100">
                                {/* Line 1: Icon + Period + Status Badge */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <TransactionIcon
                                      transaction={transaction}
                                      recurrentGoalMap={recurrentGoalMap}
                                      size="w-4 h-4"
                                      containerSize="w-6 h-6"
                                    />
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <span className="text-sm font-medium text-gray-900 font-sans">
                                        {months[transaction.month - 1]}
                                      </span>
                                      {transaction.year === currentYear && transaction.month === currentMonth && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-[#e4effa] text-[#3f70ad]">
                                          Actual
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleNavigateToMonth(transaction.month, transaction.year)}
                                        className="text-gray-400 hover:text-blue-600 transition-all duration-300 p-1 rounded-md hover:bg-blue-50"
                                        title={`Ir a Mis cuentas - ${months[transaction.month - 1]} ${transaction.year}`}
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
                                    </div>
                                  </div>
                                  
                                  {/* Status Badge */}
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans flex-shrink-0",
                                    getStatusColor(transaction)
                                  )}>
                                    {getStatusText(transaction)}
                                  </span>
                                </div>

                                {/* Line 2: Amount + Deadline + Attachments */}
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium text-gray-900 font-sans">
                                    {formatCurrency(transaction.value)}
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    {/* Deadline with icon */}
                                    {transaction.deadline && (
                                      <div className="flex items-center space-x-1 text-xs text-gray-500" title={`Vence: ${(() => {
                                        const [year, month, day] = transaction.deadline.split('-').map(Number)
                                        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
                                      })()}`}>
                                        <Calendar className="w-3 h-3" />
                                        <span>{(() => {
                                          const [year, month, day] = transaction.deadline.split('-').map(Number)
                                          return `${day}/${month}`
                                        })()}</span>
                                      </div>
                                    )}
                                    
                                    {/* Attachments */}
                                    <AttachmentClip transaction={transaction} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Attachment Modals */}
      <AttachmentModals />
    </div>
  )
} 