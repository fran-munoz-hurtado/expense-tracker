'use client'

import { useState, useEffect, useMemo } from 'react'
import { Target, TrendingUp, DollarSign, Calendar, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, X, Paperclip } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, measureQueryPerformance, fetchAttachmentCounts } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useSearchParams } from 'next/navigation'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import { getColor, getGradient, getNestedColor } from '@/lib/config/colors'
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
  const [selectedTransactionForAttachment, setSelectedTransactionForAttachment] = useState<Transaction | null>(null)
  const [showAttachmentsList, setShowAttachmentsList] = useState(false)
  const [selectedTransactionForList, setSelectedTransactionForList] = useState<Transaction | null>(null)

  // Estado para filtros
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed'>('all')

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
    setSelectedTransactionForAttachment(transaction)
    setShowAttachmentModal(true)
    setShowAttachmentsList(false)
  }

  const handleAttachmentList = (transaction: Transaction) => {
    setSelectedTransactionForList(transaction)
    setShowAttachmentsList(true)
  }

  const handleAttachmentUploadComplete = (attachment: TransactionAttachment) => {
    setAttachmentCounts(prev => ({
      ...prev,
      [attachment.transaction_id]: (prev[attachment.transaction_id] || 0) + 1
    }))
    
    if (selectedTransactionForAttachment) {
      setSelectedTransactionForList(selectedTransactionForAttachment)
      setShowAttachmentsList(true)
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
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
            <section className="relative bg-white rounded-xl p-0 w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowAttachmentsList(false)
                  setSelectedTransactionForList(null)
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
                    <p className="text-sm text-gray-600">Para: {selectedTransactionForList.description}</p>
                  </div>
                </div>
                
                <TransactionAttachments
                  transactionId={selectedTransactionForList.id}
                  userId={user.id}
                  onAttachmentDeleted={handleAttachmentDeleted}
                  onAddAttachment={() => handleAttachmentUpload(selectedTransactionForList)}
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
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  
  // Two-level expansion state: goals and years within goals
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set()) // Format: "goalKey-year"

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
    <div className="flex-1 p-6 lg:p-8 bg-gray-50 min-h-screen">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Filtros Avanzados */}
      <div className="mt-2 mb-4 bg-white border border-gray-200 rounded-xl shadow-sm p-3">
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
            {filteredGoalGroups.length} resultados
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Filtro Estado de Metas */}
          <div className="relative group">
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado de Metas</label>
            <div className="flex space-x-1 bg-gray-50 p-1 rounded-md">
              <button
                onClick={() => setGoalFilter('all')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg ${
                  goalFilter === 'all'
                    ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')} scale-105`
                    : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')} hover:shadow-md`
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setGoalFilter('active')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg ${
                  goalFilter === 'active'
                    ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')} scale-105`
                    : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')} hover:shadow-md`
                }`}
              >
                Activas
              </button>
              <button
                onClick={() => setGoalFilter('completed')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg ${
                  goalFilter === 'completed'
                    ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm border border-${getNestedColor('filter', 'active', 'border')} scale-105`
                    : `text-${getNestedColor('filter', 'inactive', 'text')} hover:text-${getNestedColor('filter', 'inactive', 'hover')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')} hover:shadow-md`
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
                className="w-full px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-md shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg"
              >
                Todas las Metas
              </button>
            </div>
          </div>
        </div>
        
        {/* Resumen de Filtros Activos */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Filtros activos:</span>
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              {goalFilter === 'all' ? 'Todas' : goalFilter === 'active' ? 'Activas' : 'Completas'}
            </span>
          </div>
        </div>
      </div>

      {/* Statistics Cards - Consistent with DashboardView */}
      <div className="mb-4 bg-white border border-gray-200 rounded-xl shadow-sm p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total de Metas */}
          <div className={`bg-gradient-to-br ${getGradient('income')} p-3 rounded-lg border border-${getColor('income', 'border')} shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-110 hover:border-${getColor('income', 'border')} hover:-translate-y-1`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 bg-${getColor('income', 'secondary')} rounded-lg transition-all duration-300 hover:bg-${getColor('income', 'secondary')} hover:scale-110`}>
                <Target className={`h-4 w-4 text-${getColor('income', 'icon')} transition-all duration-300`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-${getColor('income', 'text')} transition-all duration-200`}>Total de Metas</p>
                <p className={`text-base font-bold text-${getColor('income', 'dark')} transition-all duration-200`}>{goalStats.totalGoals}</p>
              </div>
            </div>
          </div>

          {/* Valor Total */}
          <div className={`bg-gradient-to-br ${getGradient('expense')} p-3 rounded-lg border border-${getColor('expense', 'border')} shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-110 hover:border-${getColor('expense', 'border')} hover:-translate-y-1`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 bg-${getColor('expense', 'secondary')} rounded-lg transition-all duration-300 hover:bg-${getColor('expense', 'secondary')} hover:scale-110`}>
                <DollarSign className={`h-4 w-4 text-${getColor('expense', 'icon')} transition-all duration-300`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-${getColor('expense', 'text')} transition-all duration-200`}>Valor Total</p>
                <p className={`text-base font-bold text-${getColor('expense', 'dark')} transition-all duration-200`}>{formatCurrency(goalStats.totalValue)}</p>
              </div>
            </div>
          </div>

          {/* Metas Completadas */}
          <div className={`bg-gradient-to-br ${getGradient('balance')} p-3 rounded-lg border border-${getColor('balance', 'border')} shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-110 hover:border-${getColor('balance', 'border')} hover:-translate-y-1`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 bg-${getColor('balance', 'secondary')} rounded-lg transition-all duration-300 hover:bg-${getColor('balance', 'secondary')} hover:scale-110`}>
                <CheckCircle className={`h-4 w-4 text-${getColor('balance', 'icon')} transition-all duration-300`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-${getColor('balance', 'text')} transition-all duration-200`}>Metas Completadas</p>
                <p className={`text-base font-bold text-${getColor('balance', 'primary')} transition-all duration-200`}>{goalStats.completed}</p>
              </div>
            </div>
          </div>

          {/* En Progreso */}
          <div className={`bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-110 hover:border-orange-200 hover:-translate-y-1`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 bg-orange-200 rounded-lg transition-all duration-300 hover:bg-orange-200 hover:scale-110`}>
                <Clock className={`h-4 w-4 text-orange-600 transition-all duration-300`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-orange-600 transition-all duration-200`}>En Progreso</p>
                <p className={`text-base font-bold text-orange-800 transition-all duration-200`}>{goalStats.inProgress}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mis Metas Activas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredGoalGroups.length === 0 
              ? 'No hay metas que coincidan con el filtro seleccionado'
              : `${filteredGoalGroups.length} meta${filteredGoalGroups.length !== 1 ? 's' : ''} encontrada${filteredGoalGroups.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              Cargando metas...
            </div>
          ) : filteredGoalGroups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay metas para mostrar</p>
              <p className="text-sm mt-2">
                {goalFilter === 'all' 
                  ? 'Agrega metas marcando la opción "Es Meta" al crear gastos recurrentes o únicos.' 
                  : goalFilter === 'active' 
                    ? 'No hay metas activas en este momento.'
                    : 'No hay metas completadas en este momento.'
                }
              </p>
            </div>
          ) : (
            filteredGoalGroups.map((goal) => (
              <div key={goal.key} className="p-6">
                {/* Goal Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md"
                  onClick={() => toggleGoalExpansion(goal.key)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${goal.isCompleted ? 'bg-green-100' : 'bg-orange-100'}`}>
                        {goal.isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Target className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{goal.source.description}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span>{formatCurrency(goal.paidValue)} de {formatCurrency(goal.totalValue)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            goal.isCompleted 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {goal.progress}% completado
                          </span>
                          <span className="text-xs text-gray-500">
                            {goal.years.length} año{goal.years.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            goal.isCompleted ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {expandedGoals.has(goal.key) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 transition-all duration-300" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 transition-all duration-300" />
                    )}
                  </div>
                </div>

                {/* Expanded Goal Content - Years */}
                {expandedGoals.has(goal.key) && (
                  <div className="mt-6 pl-6 border-l-2 border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Progreso por año:</h4>
                    <div className="space-y-3">
                      {goal.years.map((yearData) => {
                        const yearKey = `${goal.key}-${yearData.year}`
                        const statusStyling = getStatusStyling(yearData.status)
                        
                        return (
                          <div key={yearData.year} className="border border-gray-200 rounded-lg">
                            {/* Year Header */}
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:shadow-md"
                              onClick={() => toggleYearExpansion(goal.key, yearData.year)}
                            >
                              {/* Left side: Year, Current label, and Progress */}
                              <div className="flex items-center gap-3">
                                <h5 className="text-sm font-medium text-gray-900">
                                  {yearData.year === currentYear && (
                                    <span className="mr-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                      Actual
                                    </span>
                                  )}
                                  {yearData.year}
                                </h5>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  yearData.isCompleted 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {yearData.progress}% completado
                                </span>
                              </div>
                              
                              {/* Right side: Value and Status */}
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  {formatCurrency(yearData.paidValue)} de {formatCurrency(yearData.totalValue)}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyling.bgColor} ${statusStyling.textColor}`}>
                                  {statusStyling.label}
                                </span>
                                <div className="ml-2">
                                  {expandedYears.has(yearKey) ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Year Content - Months */}
                            {expandedYears.has(yearKey) && (
                              <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                                <h6 className="text-sm font-medium text-gray-800 mb-3 mt-3">Detalle mensual:</h6>
                                <div className="space-y-2">
                                  {yearData.transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-blue-200">
                                      <div className="flex items-center gap-3">
                                        {/* Ícono de calendario */}
                                        <Calendar className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm font-medium text-gray-700 min-w-0 month-name">
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
                                          className="text-gray-400 hover:text-blue-600 transition-all duration-300 p-1 rounded-md hover:bg-blue-50 hover:scale-125 hover:shadow-lg hover:-translate-y-0.5"
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
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">
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
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Attachment Modals */}
      <AttachmentModals />
    </div>
  )
} 