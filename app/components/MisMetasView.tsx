'use client'

import { useState, useEffect, useMemo } from 'react'
import { Target, TrendingUp, DollarSign, Calendar, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, X, Paperclip, Repeat } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, measureQueryPerformance, fetchAttachmentCounts } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useSearchParams } from 'next/navigation'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import { getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { getTransactionIconType, getTransactionIconColor, getTransactionIconBackground } from '@/lib/utils/transactionIcons'
import { renderCustomIcon } from '@/lib/utils/iconRenderer'
// import { useAttachments } from '@/lib/hooks/useAttachments'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'

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
  status: 'paid' | 'pending' | 'overdue'
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
  
  // Direct attachment functionality implementation (without external hook)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)
  const [showTransactionAttachments, setShowTransactionAttachments] = useState(false)
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null)

  // State management for master-detail layout
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

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

  const handleAttachmentUploadComplete = (attachment: TransactionAttachment) => {
    setAttachmentCounts(prev => ({
      ...prev,
      [attachment.transaction_id]: (prev[attachment.transaction_id] || 0) + 1
    }))
    
    if (selectedTransactionForAttachments) {
      setSelectedTransactionForAttachments(selectedTransactionForAttachments)
      setShowTransactionAttachments(true)
    }
    
    console.log('Attachment uploaded:', attachment)
  }

  const handleAttachmentDeleted = (attachmentId: number) => {
    // Refresh attachment counts
    console.log('Attachment deleted:', attachmentId)
  }

  // Attachment clip component
  const AttachmentClip = ({ transaction, className = "" }: { transaction: Transaction, className?: string }) => {
    return (
      <button
        onClick={() => handleAttachmentList(transaction)}
        className={`text-gray-600 hover:text-gray-800 relative flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md p-1 rounded-md hover:bg-gray-50 ${className}`}
        title="Ver archivos adjuntos"
      >
        <Paperclip className="h-4 w-4 transition-all duration-200" />
        {attachmentCounts[transaction.id] > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium transition-all duration-200 hover:scale-110">
            {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
          </span>
        )}
      </button>
    )
  }

  // Attachment modals component  
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
            <section className="relative bg-white rounded-xl p-0 w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowTransactionAttachments(false)
                  setSelectedTransactionForAttachments(null)
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                    <Paperclip className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Archivos Adjuntos</h2>
                    <p className="text-sm text-gray-600">Para: {selectedTransactionForAttachments.description}</p>
                  </div>
                </div>
                
                <TransactionAttachments
                  transactionId={selectedTransactionForAttachments.id}
                  userId={user.id}
                  onAttachmentDeleted={handleAttachmentDeleted}
                  onAddAttachment={() => handleAttachmentUpload(selectedTransactionForAttachments)}
                />
              </div>
            </section>
          </div>
        )}
      </>
    )
  }
  
  const [goalTransactions, setGoalTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  
  // Create recurrentGoalMap for parametrized icon system
  const recurrentGoalMap = useMemo(() => {
    const map: Record<number, boolean> = {}
    recurrentExpenses.forEach(expense => {
      map[expense.id] = expense.isgoal || false
    })
    return map
  }, [recurrentExpenses])
  
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  
  // Two-level expansion state: goals and years within goals
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set()) // Format: "goalKey-year"

  // Filter state for goals
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Expandable filters state
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Available years for selection
  const availableYears = Array.from({ length: 16 }, (_, i) => 2025 + i)

  // Current date for highlighting
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Navigation function to redirect to Control del mes
  const handleNavigateToMonth = async (month: number, year: number) => {
    try {
      console.log(`🎯 MisMetasView: Navigating to Control del mes - Month: ${month}, Year: ${year}`)
      await navigation.navigateToDashboard(month, year)
    } catch (error) {
      console.error('❌ MisMetasView: Navigation error:', error)
    }
  }

  // Sync with URL parameters
  useEffect(() => {
    const yearFromUrl = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    if (yearFromUrl && yearFromUrl !== selectedYear) {
      setSelectedYear(yearFromUrl)
    }
  }, [searchParams])

  // Auto-expand goal from URL parameter
  useEffect(() => {
    const expandGoalParam = searchParams.get('expandGoal')
    if (expandGoalParam) {
      console.log(`🎯 MisMetasView: Auto-expanding goal from URL parameter:`, expandGoalParam)
      
      // Add the goal to expanded goals
      setExpandedGoals(prev => {
        const newSet = new Set(prev)
        newSet.add(expandGoalParam)
        return newSet
      })
      
      // Clean up the URL parameter after processing
      const url = new URL(window.location.href)
      url.searchParams.delete('expandGoal')
      window.history.replaceState({}, '', url.toString())
      
      console.log(`✅ MisMetasView: Goal ${expandGoalParam} auto-expanded and URL parameter cleaned`)
    }
  }, [searchParams])

  // Use the data synchronization system
  useDataSyncEffect(() => {
    console.log('🎯 MisMetasView: Data sync triggered, refetching data')
    fetchGoalData()
  }, [])

  // Separate effect for user and selectedYear changes
  useEffect(() => {
    console.log('🎯 MisMetasView: User or selectedYear changed, refetching data')
    fetchGoalData()
  }, [user, selectedYear])

  // Fetch goal data and computation logic
  const fetchGoalData = async () => {
    try {
      console.log('🎯 MisMetasView: fetchGoalData started')
      setLoading(true)
      setError(null)

      // Fetch all data
      const [transactions, expenses] = await Promise.all([
        fetchUserTransactions(user, undefined, undefined), // Fetch all transactions
        fetchUserExpenses(user)
      ])

      console.log('🎯 MisMetasView: Raw data fetched:', {
        transactions: transactions.length,
        recurrentExpenses: expenses.recurrent.length,
        nonRecurrentExpenses: expenses.nonRecurrent.length
      })

      // Load attachment counts
      await loadAttachmentCounts(transactions)

      // Filter recurrent expenses that are goals
      const goalRecurrentExpenses = expenses.recurrent.filter(re => re.isgoal)
      console.log('🎯 MisMetasView: Goal recurrent expenses:', goalRecurrentExpenses.length)

      // Filter non-recurrent expenses that are goals
      const goalNonRecurrentExpenses = expenses.nonRecurrent.filter(nre => nre.isgoal)
      console.log('🎯 MisMetasView: Goal non-recurrent expenses:', goalNonRecurrentExpenses.length)

      // Filter transactions that belong to goals
      const goalTransactions = transactions.filter(t => 
        t.type === 'expense' && (
          (t.source_type === 'recurrent' && goalRecurrentExpenses.some(re => re.id === t.source_id)) ||
          (t.source_type === 'non_recurrent' && goalNonRecurrentExpenses.some(nre => nre.id === t.source_id))
        )
      )

      console.log('🎯 MisMetasView: Goal transactions:', goalTransactions.length)

      setGoalTransactions(goalTransactions)
      setRecurrentExpenses(expenses.recurrent)
      setNonRecurrentExpenses(expenses.nonRecurrent)

    } catch (error) {
      console.error('❌ MisMetasView: Error fetching goal data:', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Helper function to get year status
  const getYearStatus = (transactions: Transaction[]): 'paid' | 'pending' | 'overdue' => {
    const now = new Date()
    const hasOverdue = transactions.some(t => 
      t.status === 'pending' && t.deadline && new Date(t.deadline) < now
    )
    
    if (hasOverdue) return 'overdue'
    
    const hasPending = transactions.some(t => t.status === 'pending')
    return hasPending ? 'pending' : 'paid'
  }

  // Get transaction icon using parametrized system
  const getTransactionIcon = (transaction: Transaction) => {
    const iconType = getTransactionIconType(transaction, recurrentGoalMap)
    const iconColor = getTransactionIconColor(transaction, iconType)
    
    // Handle REPEAT case (not supported by renderCustomIcon)
    if (iconType === 'REPEAT') {
      return <Repeat className={`h-3 w-3 ${iconColor}`} />
    }
    
    // Handle custom icons
    return renderCustomIcon(iconType, `h-3 w-3 ${iconColor}`)
  }

  // Get transaction background color
  const getTransactionBackground = (transaction: Transaction) => {
    const iconType = getTransactionIconType(transaction, recurrentGoalMap)
    return getTransactionIconBackground(transaction, iconType)
  }

  // Create hierarchical goal structure
  const goalGroups = useMemo(() => {
    const groups: GoalData[] = []
    
    // Process recurrent goal expenses
    const goalRecurrentExpenses = recurrentExpenses.filter(re => re.isgoal)
    goalRecurrentExpenses.forEach(recurrentExpense => {
      const expenseTransactions = goalTransactions.filter(t => 
        t.source_type === 'recurrent' && t.source_id === recurrentExpense.id
      )
      
      if (expenseTransactions.length > 0) {
        // Group by year
        const yearMap = new Map<number, Transaction[]>()
        expenseTransactions.forEach(transaction => {
          const year = transaction.year
          if (!yearMap.has(year)) {
            yearMap.set(year, [])
          }
          yearMap.get(year)!.push(transaction)
        })
        
        // Create year data
        const years: YearData[] = Array.from(yearMap.entries()).map(([year, transactions]) => {
          const totalValue = transactions.reduce((sum, t) => sum + t.value, 0)
          const paidValue = transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
          const progress = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0
          const status = getYearStatus(transactions)
          const isCompleted = progress === 100
          
          return {
            year,
            transactions: transactions.sort((a, b) => a.month - b.month),
            totalValue,
            paidValue,
            progress,
            status,
            isCompleted
          }
        }).sort((a, b) => a.year - b.year)
        
        // Create goal data
        const totalValue = years.reduce((sum, year) => sum + year.totalValue, 0)
        const paidValue = years.reduce((sum, year) => sum + year.paidValue, 0)
        const progress = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0
        const isCompleted = progress === 100
        
        groups.push({
          key: `recurrent-${recurrentExpense.id}`,
          source: recurrentExpense,
          years,
          totalValue,
          paidValue,
          progress,
          isCompleted
        })
      }
    })
    
    // Process non-recurrent goal expenses
    const goalNonRecurrentExpenses = nonRecurrentExpenses.filter(nre => nre.isgoal)
    goalNonRecurrentExpenses.forEach(nonRecurrentExpense => {
      const expenseTransactions = goalTransactions.filter(t => 
        t.source_type === 'non_recurrent' && t.source_id === nonRecurrentExpense.id
      )
      
      if (expenseTransactions.length > 0) {
        // Group by year
        const yearMap = new Map<number, Transaction[]>()
        expenseTransactions.forEach(transaction => {
          const year = transaction.year
          if (!yearMap.has(year)) {
            yearMap.set(year, [])
          }
          yearMap.get(year)!.push(transaction)
        })
        
        // Create year data
        const years: YearData[] = Array.from(yearMap.entries()).map(([year, transactions]) => {
          const totalValue = transactions.reduce((sum, t) => sum + t.value, 0)
          const paidValue = transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
          const progress = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0
          const status = getYearStatus(transactions)
          const isCompleted = progress === 100
          
          return {
            year,
            transactions: transactions.sort((a, b) => a.month - b.month),
            totalValue,
            paidValue,
            progress,
            status,
            isCompleted
          }
        }).sort((a, b) => a.year - b.year)
        
        // Create goal data
        const totalValue = years.reduce((sum, year) => sum + year.totalValue, 0)
        const paidValue = years.reduce((sum, year) => sum + year.paidValue, 0)
        const progress = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0
        const isCompleted = progress === 100
        
        groups.push({
          key: `non_recurrent-${nonRecurrentExpense.id}`,
          source: nonRecurrentExpense,
          years,
          totalValue,
          paidValue,
          progress,
          isCompleted
        })
      }
    })
    
    return groups.sort((a, b) => a.source.description.localeCompare(b.source.description))
  }, [goalTransactions, recurrentExpenses, nonRecurrentExpenses])

  // Filtrar goalGroups según el filtro seleccionado
  const filteredGoalGroups = useMemo(() => {
    return goalGroups.filter(goal => {
      switch (goalFilter) {
        case 'active':
          return !goal.isCompleted
        case 'completed':
          return goal.isCompleted
        case 'all':
        default:
          return true
      }
    })
  }, [goalGroups, goalFilter])

  // Calculate goal statistics
  const goalStats = useMemo(() => {
    const totalGoals = goalGroups.length
    const completed = goalGroups.filter(g => g.isCompleted).length
    const inProgress = totalGoals - completed
    const totalValue = goalGroups.reduce((sum, g) => sum + g.totalValue, 0)
    
    return {
      totalGoals,
      completed,
      inProgress,
      totalValue
    }
  }, [goalGroups])

  // Toggle goal expansion
  const toggleGoalExpansion = (goalKey: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(goalKey)) {
        newSet.delete(goalKey)
        // Also close all years for this goal
        setExpandedYears(prevYears => {
          const newYearSet = new Set(prevYears)
          newYearSet.forEach(yearKey => {
            if (yearKey.startsWith(goalKey + '-')) {
              newYearSet.delete(yearKey)
            }
          })
          return newYearSet
        })
      } else {
        newSet.add(goalKey)
      }
      return newSet
    })
  }

  // Toggle year expansion within a goal
  const toggleYearExpansion = (goalKey: string, year: number) => {
    const yearKey = `${goalKey}-${year}`
    setExpandedYears(prev => {
      const newSet = new Set(prev)
      if (newSet.has(yearKey)) {
        newSet.delete(yearKey)
      } else {
        newSet.add(yearKey)
      }
      return newSet
    })
  }

  // Helper function to get goal status
  const getGoalStatus = (goal: GoalData): { label: string; bgColor: string; textColor: string } => {
    if (goal.progress === 0) {
      return {
        label: 'Sin Empezar',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800'
      }
    }
    
    if (goal.progress === 100) {
      return {
        label: 'Pagado',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      }
    }
    
    // Check if any transaction is overdue
    const hasOverdueTransactions = goal.years.some(year => 
      year.transactions.some(transaction => 
        transaction.status === 'pending' && 
        transaction.deadline && 
        new Date(transaction.deadline) < new Date()
      )
    )
    
    if (hasOverdueTransactions) {
      return {
        label: 'en Mora',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      }
    }
    
    return {
      label: 'En Progreso',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800'
    }
  }

  // Helper function to get status styling
  const getStatusStyling = (status: 'paid' | 'pending' | 'overdue') => {
    switch (status) {
      case 'paid':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          label: 'Pagado'
        }
      case 'pending':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          label: 'Pendiente'
        }
      case 'overdue':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          label: 'Vencido'
        }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Mis Metas</h1>
          <p className="text-gray-600">Gestiona y monitorea el progreso de tus metas financieras</p>
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

        {/* Filtros Avanzados */}
        <div className="mb-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-blue-100 rounded-lg">
                  <svg className="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Filtros Avanzados</h3>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredGoalGroups.length} resultados
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Active filters summary */}
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                    {goalFilter === 'all' ? 'Todas' : goalFilter === 'active' ? 'Activas' : 'Completas'}
                  </span>
                </div>
                <div className={`transform transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}>
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Expandable Filters Content */}
          {filtersExpanded && (
            <div className="p-3 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Filtro Estado de Metas */}
                <div className="relative group">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado de Metas</label>
                  <div className="flex space-x-1 bg-gray-50 p-1 rounded-md">
                    <button
                      onClick={() => setGoalFilter('all')}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        goalFilter === 'all'
                          ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')}`
                          : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setGoalFilter('active')}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        goalFilter === 'active'
                          ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')}`
                          : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                      }`}
                    >
                      Activas
                    </button>
                    <button
                      onClick={() => setGoalFilter('completed')}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        goalFilter === 'completed'
                          ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')}`
                          : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                      }`}
                    >
                      Completas
                    </button>
                  </div>
                </div>
                
                {/* Acciones Rápidas */}
                <div className="relative group">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Acciones</label>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setGoalFilter('all');
                      }}
                      className="w-full px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-md shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-[1.005] hover:shadow-sm"
                    >
                      Todas las Metas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards - Consistent with DashboardView */}
        <div className="mb-4 bg-white border border-gray-200 rounded-xl shadow-sm p-1.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5">
            {/* Total de Metas */}
            <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <p className="text-xs font-medium text-black leading-none">Total de Metas</p>
              </div>
              <p className="text-sm text-black leading-none px-2">{goalStats.totalGoals}</p>
            </div>

            {/* Valor Total */}
            <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <p className="text-xs font-medium text-black leading-none">Valor Total</p>
              </div>
              <p className="text-sm text-black leading-none px-2">{formatCurrency(goalStats.totalValue)}</p>
            </div>

            {/* Metas Completadas */}
            <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <p className="text-xs font-medium text-black leading-none">Metas Completadas</p>
              </div>
              <p className="text-sm text-black leading-none px-2">{goalStats.completed}</p>
            </div>

            {/* En Progreso */}
            <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <p className="text-xs font-medium text-black leading-none">En Progreso</p>
              </div>
              <p className="text-sm text-black leading-none px-2">{goalStats.inProgress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex px-6 lg:px-8 pb-6 lg:pb-8 gap-4 min-h-0">
        {/* Left Column - Goals List */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Mis Metas
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">{texts.loading}</div>
          ) : filteredGoalGroups.length === 0 ? (
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
            <div className="overflow-y-auto">
              {filteredGoalGroups.map((goal) => {
                const isSelected = selectedGoal === goal.key
                const goalStatus = getGoalStatus(goal)
                
                return (
                  <button
                    key={goal.key}
                    onClick={() => setSelectedGoal(goal.key)}
                    className={`w-full p-4 text-left border-b border-gray-100 transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm ${
                      isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {/* Left Column */}
                      <div className="flex flex-col space-y-2">
                        {/* Top Left: Description */}
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${
                            goal.isCompleted
                              ? 'bg-green-100'
                              : isSelected 
                              ? 'bg-blue-100'
                              : 'bg-yellow-100'
                          }`}>
                            {goal.isCompleted ? (
                              <CheckCircle className={`h-3 w-3 ${
                                goal.isCompleted
                                  ? 'text-green-600'
                                  : isSelected
                                  ? 'text-blue-600'
                                  : 'text-yellow-600'
                              }`} />
                            ) : (
                              <Target className={`h-3 w-3 ${
                                isSelected ? 'text-blue-600' : 'text-yellow-600'
                              }`} />
                            )}
                          </div>
                          <h3 className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {goal.source.description}
                          </h3>
                        </div>
                        
                        {/* Bottom Left: Years */}
                        <div className="ml-6">
                          <p className="text-xs text-gray-500">{goal.years.length} años</p>
                        </div>
                      </div>
                      
                      {/* Right Column */}
                      <div className="flex flex-col space-y-2 items-end">
                        {/* Top Right: Total Value + Status + Percentage */}
                        <div className="flex flex-col items-end space-y-1">
                          <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {formatCurrency(goal.totalValue)}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${goalStatus.bgColor} ${goalStatus.textColor}`}>
                              {goalStatus.label}
                            </span>
                            <span className="text-xs text-gray-600 font-medium">
                              {goal.progress}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Bottom Right: Progress Bar */}
                        <div className="w-full">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                goal.isCompleted ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column - Canvas/Detail Area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {!selectedGoal ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una meta</h3>
                <p className="text-gray-500">Haz clic en una meta de la izquierda para ver su progreso detallado</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Selected Goal Content - Direct Year Hierarchy */}
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const selectedGoalData = filteredGoalGroups.find(g => g.key === selectedGoal)
                  if (!selectedGoalData) return null

                  return (
                    <div className="space-y-4">
                      {selectedGoalData.years.map((yearData) => {
                        const yearKey = `${selectedGoal}-${yearData.year}`
                        const isYearExpanded = expandedYears.has(yearKey)
                        const statusStyling = getStatusStyling(yearData.status)
                        
                        return (
                          <div key={yearData.year} className="border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                            {/* Year Header */}
                            <button
                              onClick={() => toggleYearExpansion(selectedGoal, yearData.year)}
                              className="w-full p-4 text-left transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm"
                            >
                              <div className="flex items-center justify-between min-h-[20px]">
                                {/* Left side: Calendar icon + Year + Actual + Progress */}
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs font-medium text-gray-900">
                                    {yearData.year}
                                  </span>
                                  {yearData.year === currentYear && (
                                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                      Actual
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    yearData.isCompleted 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {yearData.progress}% completado
                                  </span>
                                </div>

                                {/* Right side: Value and Status */}
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs text-gray-600">
                                    {formatCurrency(yearData.paidValue)} de {formatCurrency(yearData.totalValue)}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyling.bgColor} ${statusStyling.textColor}`}>
                                    {statusStyling.label}
                                  </span>
                                  <div className="ml-2">
                                    {isYearExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Expanded Year Content - Months */}
                            {isYearExpanded && (
                              <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                                <h6 className="text-sm font-medium text-gray-800 mb-3 mt-3">Detalle mensual:</h6>
                                <div className="space-y-2">
                                  {yearData.transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200 min-h-[20px]">
                                      <div className="flex items-center space-x-2">
                                        <div className={`p-1 rounded-full ${getTransactionBackground(transaction)} transition-all duration-300 hover:scale-110`}>
                                          {getTransactionIcon(transaction)}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 min-w-0 month-name">
                                          {months[transaction.month - 1]}
                                        </span>
                                        {transaction.month === currentMonth && transaction.year === currentYear && (
                                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                            Actual
                                          </span>
                                        )}
                                        {/* Navigation Link Icon - Same as GeneralDashboard */}
                                        <button
                                          onClick={() => handleNavigateToMonth(transaction.month, transaction.year)}
                                          className="text-gray-400 hover:text-blue-600 transition-all duration-300 p-1 rounded-md hover:bg-blue-50 hover:scale-[1.005] hover:shadow-sm"
                                          title={`Ir a Control del mes - ${months[transaction.month - 1]} ${transaction.year}`}
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
                                      <div className="flex items-center space-x-3">
                                        <span className="text-xs text-gray-600">
                                          {formatCurrency(transaction.value)}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          transaction.status === 'paid' 
                                            ? 'bg-green-100 text-green-800' 
                                            : transaction.deadline && new Date(transaction.deadline) < new Date()
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {transaction.status === 'paid' ? 'Pagado' : 
                                           transaction.deadline && new Date(transaction.deadline) < new Date() ? 'Vencido' : 'Pendiente'}
                                        </span>
                                        {/* Attachment Clip */}
                                        <AttachmentClip transaction={transaction} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Attachment Modals */}
      <AttachmentModals />
    </div>
  )
} 