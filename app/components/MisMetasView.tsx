'use client'

import { useState, useEffect, useMemo } from 'react'
import { Target, TrendingUp, DollarSign, Calendar, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, measureQueryPerformance } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useSearchParams } from 'next/navigation'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import { getColor, getGradient } from '@/lib/config/colors'
// import { useAttachments } from '@/lib/hooks/useAttachments'

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
  
  // Attachments functionality - COMMENTED OUT for build stability until import structure is fixed
  // const {
  //   attachmentCounts,
  //   loadAttachmentCounts,
  //   handleAttachmentUpload,
  //   handleAttachmentList,
  //   handleAttachmentUploadComplete,
  //   handleAttachmentDeleted,
  //   AttachmentClip,
  //   AttachmentModals
  // } = useAttachments(user)
  
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

  const fetchGoalData = async () => {
    try {
      console.log('🎯 MisMetasView: fetchGoalData started')
      setError(null)
      setLoading(true)
      
      const result = await measureQueryPerformance(
        'fetchMisMetasData',
        async () => {
          // Get all expenses to find goal ones
          const expenses = await fetchUserExpenses(user)
          
          // Get ALL transactions (not filtered by year) for goals that may span multiple years
          const transactions = await fetchUserTransactions(user, undefined, undefined)
          
          // Filter goal transactions by joining with expense data
          const goalTransactionIds = new Set<number>()
          
          // Add recurrent goal transaction IDs
          expenses.recurrent
            .filter(re => re.isgoal)
            .forEach(re => {
              transactions
                .filter(t => t.source_type === 'recurrent' && t.source_id === re.id)
                .forEach(t => goalTransactionIds.add(t.id))
            })
          
          // Add non-recurrent goal transaction IDs
          expenses.nonRecurrent
            .filter(nre => nre.isgoal)
            .forEach(nre => {
              transactions
                .filter(t => t.source_type === 'non_recurrent' && t.source_id === nre.id)
                .forEach(t => goalTransactionIds.add(t.id))
            })
          
          // Filter transactions to only goals
          const goalTransactions = transactions.filter(t => goalTransactionIds.has(t.id))
          
          return {
            goalTransactions,
            recurrent: expenses.recurrent,
            nonRecurrent: expenses.nonRecurrent
          }
        }
      )

      console.log('🎯 MisMetasView: Data fetched successfully')
      console.log('🎯 MisMetasView: Goal transactions count:', result.goalTransactions.length)

      setGoalTransactions(result.goalTransactions)
      setRecurrentExpenses(result.recurrent)
      setNonRecurrentExpenses(result.nonRecurrent)

      // Load attachment counts for goal transactions
      // await loadAttachmentCounts(result.goalTransactions)

    } catch (error) {
      console.error('❌ Error in fetchGoalData():', error)
      setError(`Error al cargar metas: ${error instanceof Error ? error.message : 'Error desconocido'}`)
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

  // Helper function to determine year status based on transaction statuses
  const getYearStatus = (transactions: Transaction[]): 'paid' | 'pending' | 'overdue' => {
    const hasOverdue = transactions.some(t => 
      t.status === 'pending' && t.deadline && new Date(t.deadline) < new Date()
    )
    if (hasOverdue) return 'overdue'
    
    const hasPending = transactions.some(t => t.status === 'pending')
    if (hasPending) return 'pending'
    
    return 'paid'
  }

  // Calculate goal statistics
  const goalStats = useMemo(() => {
    const stats = {
      totalGoals: 0,
      totalValue: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      completed: 0,
      inProgress: 0
    }

    // Group goal transactions by source
    const goalGroups = new Map<string, Transaction[]>()
    
    goalTransactions.forEach(transaction => {
      const key = `${transaction.source_type}-${transaction.source_id}`
      if (!goalGroups.has(key)) {
        goalGroups.set(key, [])
      }
      goalGroups.get(key)!.push(transaction)
    })

    stats.totalGoals = goalGroups.size

    goalGroups.forEach(transactions => {
      const totalValue = transactions.reduce((sum, t) => sum + t.value, 0)
      const paidValue = transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
      
      stats.totalValue += totalValue
      stats.paid += paidValue
      
      // Check if goal is completed (all transactions paid)
      if (transactions.every(t => t.status === 'paid')) {
        stats.completed++
      } else {
        stats.inProgress++
      }

      // Count pending and overdue transactions
      transactions.forEach(t => {
        if (t.status === 'pending') {
          if (t.deadline && new Date(t.deadline) < new Date()) {
            stats.overdue++
          } else {
            stats.pending++
          }
        }
      })
    })

    return stats
  }, [goalTransactions])

  // Group transactions by goal and then by year (hierarchical structure)
  const goalGroups = useMemo(() => {
    const groups = new Map<string, {
      source: RecurrentExpense | NonRecurrentExpense
      transactions: Transaction[]
    }>()

    goalTransactions.forEach(transaction => {
      const key = `${transaction.source_type}-${transaction.source_id}`
      
      if (!groups.has(key)) {
        // Find the source expense
        let source: RecurrentExpense | NonRecurrentExpense | undefined
        
        if (transaction.source_type === 'recurrent') {
          source = recurrentExpenses.find(re => re.id === transaction.source_id && re.isgoal)
        } else {
          source = nonRecurrentExpenses.find(nre => nre.id === transaction.source_id && nre.isgoal)
        }

        if (source) {
          groups.set(key, {
            source,
            transactions: []
          })
        }
      }

      const group = groups.get(key)
      if (group) {
        group.transactions.push(transaction)
      }
    })

    // Transform to hierarchical structure with years
    const hierarchicalGoals: GoalData[] = []
    
    groups.forEach((group, key) => {
      // Group transactions by year
      const yearGroups = new Map<number, Transaction[]>()
      
      group.transactions.forEach(transaction => {
        if (!yearGroups.has(transaction.year)) {
          yearGroups.set(transaction.year, [])
        }
        yearGroups.get(transaction.year)!.push(transaction)
      })

      // Create year data objects
      const years: YearData[] = Array.from(yearGroups.entries())
        .map(([year, transactions]) => {
          const totalValue = transactions.reduce((sum, t) => sum + t.value, 0)
          const paidValue = transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
          const progress = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0
          const status = getYearStatus(transactions)
          const isCompleted = transactions.every(t => t.status === 'paid')

          return {
            year,
            transactions: transactions.sort((a, b) => a.month - b.month),
            totalValue,
            paidValue,
            progress,
            status,
            isCompleted
          }
        })
        .sort((a, b) => a.year - b.year)

      // Calculate overall goal statistics
      const totalValue = group.transactions.reduce((sum, t) => sum + t.value, 0)
      const paidValue = group.transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
      const progress = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0
      const isCompleted = group.transactions.every(t => t.status === 'paid')

      hierarchicalGoals.push({
        key,
        source: group.source,
        years,
        totalValue,
        paidValue,
        progress,
        isCompleted
      })
    })

    return hierarchicalGoals
  }, [goalTransactions, recurrentExpenses, nonRecurrentExpenses])

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
    <div className="flex-1 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{texts.misMetas}</h1>
              <p className="text-gray-600">Seguimiento de tus objetivos financieros</p>
            </div>
          </div>
          
          {/* Year filter */}
          <div className="flex items-center gap-4">
            <label className="block text-sm font-medium text-gray-700 mr-2 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-green-500" />
              Año
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="appearance-none px-4 py-2 border border-green-200 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white text-green-700 font-semibold transition-all duration-150 hover:border-green-400 cursor-pointer pr-8"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
                <ChevronDown className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Metas</p>
              <p className="text-2xl font-bold text-gray-900">{goalStats.totalGoals}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(goalStats.totalValue)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Metas Completadas</p>
              <p className="text-2xl font-bold text-gray-900">{goalStats.completed}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Progreso</p>
              <p className="text-2xl font-bold text-gray-900">{goalStats.inProgress}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mis Metas Activas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {goalGroups.length === 0 
              ? 'No tienes metas configuradas para este año'
              : `${goalGroups.length} meta${goalGroups.length !== 1 ? 's' : ''} encontrada${goalGroups.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              Cargando metas...
            </div>
          ) : goalGroups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay metas para este año</p>
              <p className="text-sm mt-2">Agrega metas marcando la opción "Es Meta" al crear gastos recurrentes o únicos.</p>
            </div>
          ) : (
            goalGroups.map((goal) => (
              <div key={goal.key} className="p-6">
                {/* Goal Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleGoalExpansion(goal.key)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${goal.isCompleted ? 'bg-green-100' : 'bg-orange-100'}`}>
                        {goal.isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Target className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{goal.source.description}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
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
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Goal Content - Years */}
                {expandedGoals.has(goal.key) && (
                  <div className="mt-6 pl-6 border-l-2 border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-4">Progreso por año:</h4>
                    <div className="space-y-3">
                      {goal.years.map((yearData) => {
                        const yearKey = `${goal.key}-${yearData.year}`
                        const statusStyling = getStatusStyling(yearData.status)
                        
                        return (
                          <div key={yearData.year} className="border border-gray-200 rounded-lg">
                            {/* Year Header */}
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleYearExpansion(goal.key, yearData.year)}
                            >
                              {/* Left side: Year, Current label, and Progress */}
                              <div className="flex items-center gap-3">
                                <h5 className="font-medium text-gray-900">
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
                                    <ChevronUp className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Year Content - Months */}
                            {expandedYears.has(yearKey) && (
                              <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                                <h6 className="font-medium text-gray-800 mb-3 mt-3">Detalle mensual:</h6>
                                <div className="space-y-2">
                                  {yearData.transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-700 min-w-0">
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
                                          className="text-gray-400 hover:text-blue-600 transition-colors duration-200 p-1 rounded-md hover:bg-blue-50"
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
                                        {/* <AttachmentClip transaction={transaction} className="ml-2" /> */}
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
      {/* <AttachmentModals /> */}
    </div>
  )
} 