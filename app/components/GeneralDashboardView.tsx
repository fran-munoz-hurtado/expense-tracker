'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, ChevronUp, ChevronDown, TrendingUp, Info } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User } from '@/lib/supabase'
import { fetchUserExpenses, fetchMonthlyStats, measureQueryPerformance } from '@/lib/dataUtils'
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
  const { transactions, isLoading, fetchTransactions } = useTransactionStore()
  
  // Function to validate that all transactions belong to the selected year
  function validateYearTransactions(transactions: Transaction[], selectedYear: number) {
    const invalid = transactions.filter(tx => tx.year !== selectedYear)
    if (invalid.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('[zustand] GeneralDashboardView: Found', invalid.length, 'transactions with wrong year:', invalid.slice(0, 3))
    }
  }
  
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [monthlyData, setMonthlyData] = useState<Record<number, {
    transactions: Transaction[]
    recurrent: number
    nonRecurrent: number
    totalExpenses: number
    totalIncome: number
    netFlow: number
    balance: number
    paidExpenses: number
    pendingExpenses: number
    overdueExpenses: number
    percentagePaid: number
  }>>({})

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

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount))
  }

  // Get status color based on percentage paid
  const getStatusColor = (percentagePaid: number): string => {
    if (percentagePaid >= 80) {
      return 'text-green-600'
    } else if (percentagePaid >= 50) {
      return 'text-yellow-600'
    } else {
      return 'text-red-600'
    }
  }

  // Get status icon based on percentage paid
  const getStatusIcon = (percentagePaid: number) => {
    if (percentagePaid >= 80) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (percentagePaid >= 50) {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />
    } else {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  // Helper function to check if a deadline is overdue
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

  // Fetch data using pure Zustand pattern
  const fetchData = useCallback(async () => {
    if (!user || !selectedYear) return
    
    try {
      setError(null)
      
      console.log('[zustand] GeneralDashboardView: fetchTransactions triggered for year', selectedYear)
      
      // Use pure Zustand pattern with year filtering
      await fetchTransactions({ 
        userId: user.id, 
        year: selectedYear 
      })
      
      console.log('[zustand] GeneralDashboardView: transactions loaded:', transactions.length)
      
      // Also fetch expenses for calculations (legitimate)
      const expenses = await fetchUserExpenses(user)
      setRecurrentExpenses(expenses.recurrent)
      setNonRecurrentExpenses(expenses.nonRecurrent)
      
      // Validate year consistency
      const yearTransactions = transactions.filter(t => t.year === selectedYear)
      validateYearTransactions(yearTransactions, selectedYear)

    } catch (error) {
      console.error('❌ Error in fetchData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [user, selectedYear, fetchTransactions, transactions])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Data sync effect using pure Zustand pattern
  useDataSyncEffect(() => {
    console.log('[zustand] GeneralDashboardView: useDataSyncEffect triggered')
    fetchData()
  }, [fetchData])

  // Development logging for Zustand transactions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isLoading) {
      const yearTxs = transactions.filter(t => t.year === selectedYear)
      console.log('[zustand] GeneralDashboardView: loaded', yearTxs.length, 'transactions for year', selectedYear, 'from Zustand')
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
        totalExpenses: number
        totalIncome: number
        netFlow: number
        balance: number
        paidExpenses: number
        pendingExpenses: number
        overdueExpenses: number
        percentagePaid: number
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
          totalExpenses: totalStats.total,
          totalIncome: incomeStats.total,
          netFlow: incomeStats.total - totalStats.total,
          balance: incomeStats.total - totalStats.total,
          paidExpenses: totalStats.paid,
          pendingExpenses: totalStats.pending,
          overdueExpenses: totalStats.overdue,
          percentagePaid: getPercentage(totalStats.paid, totalStats.total)
        }
      }

      setMonthlyData(monthlyStats)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[zustand] GeneralDashboardView: renderizando tabla con', Object.keys(monthlyStats).length, 'meses y', transactions.length, 'transacciones')
      }
    }
  }, [isLoading, transactions, selectedYear])

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
    return getPercentage(data.paidExpenses, data.totalIncome)  // Fixed property names
  }

  // Delete transaction functions
  const handleDeleteTransaction = (transaction: Transaction) => {
    // This function is no longer needed as Supabase calls are removed
    // The confirmation modals will handle deletion logic
  }

  // Modify transaction functions
  const handleModifyTransaction = (transaction: Transaction) => {
    // This function is no longer needed as Supabase calls are removed
    // The confirmation modals will handle modification logic
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark font-sans">Balance general</h2>
          <p className="text-sm text-green-dark font-sans">Resumen financiero por mes</p>
        </div>
        
        {/* Filtro de año */}
        <div className="flex items-center">
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
        
        {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>

      {/* Main Content - Encapsulated in white section */}
      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-5xl mx-auto">
          <section className="bg-white rounded-xl shadow-sm px-6 py-4">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed general-dashboard-table">
                <colgroup>
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '170px' }} />
                </colgroup>
                <thead>
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
                      Balance (CuantoQueda)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-3 py-2 text-center text-gray-400 animate-pulse">{texts.loading}</td></tr>
                  ) :
                    Object.entries(monthlyData).map(([monthStr, data], idx) => {
                      const month = parseInt(monthStr)
                      const totalAmount = data.totalExpenses
                      const balance = data.balance
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-[#e4effa] text-[#3f70ad]">
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
                            {formatCurrency(data.totalIncome)}
                          </td>
                          <td className="px-3 py-2 text-sm text-[#a07b00]">
                            {formatCurrency(totalAmount)}
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
                  const totalAmount = data.totalExpenses
                  const balance = data.balance
                  const balanceColor = balance >= 0 ? 'text-[#3f70ad]' : 'text-[#d9534f]'
                  
                  return (
                    <div key={month} className="bg-neutral-bg rounded-lg border p-4 mobile-card">
                      <div className="flex justify-between items-center mb-3">
                        <button
                          onClick={() => onNavigateToMonth(month, selectedYear)}
                          className="text-gray-dark font-medium text-lg cursor-pointer transition-colors duration-200 group flex items-center gap-2"
                        >
                          {months[month - 1]}
                          {selectedYear === currentYear && month === currentMonth && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-[#e4effa] text-[#3f70ad]">
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
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Ingresos */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Ingresos</span>
                          <span className="text-sm text-[#3f70ad] font-medium">
                            {formatCurrency(data.totalIncome)}
                          </span>
                        </div>
                        
                        {/* Gastos Totales */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Gastos Totales</span>
                          <span className="text-sm text-[#a07b00] font-medium">
                            {formatCurrency(totalAmount)}
                          </span>
                        </div>
                        
                        {/* Balance */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-700">Balance</span>
                          <span className={`text-sm font-medium ${balanceColor}`}>
                            {formatCurrency(balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
} 