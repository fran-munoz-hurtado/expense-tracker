'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp, Calendar, DollarSign, FileText, Repeat, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { type Transaction, type User } from '@/lib/supabase'
import { fetchUserTransactions } from '@/lib/dataUtils'
import { useDataSyncEffect } from '@/lib/hooks/useDataSync'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'

interface CategoriesViewProps {
  navigationParams?: { year?: number; month?: number } | null
  user: User
}

interface CategoryGroup {
  categoryName: string
  transactions: Transaction[]
  total: number
  paid: number
  pending: number
  overdue: number
  count: number
}

export default function CategoriesView({ navigationParams, user }: CategoriesViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(navigationParams?.month || null)
  const [filterType, setFilterType] = useState<'all' | 'recurrent' | 'non_recurrent'>('all')

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const availableYears = Array.from({ length: 16 }, (_, i) => 2025 + i)

  // Helper function to format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Helper function to check if date is overdue
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return deadlineDate < todayDate;
  }

  // Fetch transactions data
  const fetchData = async () => {
    try {
      setError(null)
      setLoading(true)
      
      console.log(`🔄 CategoriesView: Fetching data for year ${selectedYear}${selectedMonth ? `, month ${selectedMonth}` : ' (all months)'}`)
      
      let allTransactions: Transaction[] = []
      
      if (selectedMonth) {
        // Fetch specific month
        allTransactions = await fetchUserTransactions(user, selectedMonth, selectedYear)
      } else {
        // Fetch entire year
        const monthPromises = Array.from({ length: 12 }, (_, i) => 
          fetchUserTransactions(user, i + 1, selectedYear)
        )
        const monthResults = await Promise.all(monthPromises)
        allTransactions = monthResults.flat()
      }

      console.log(`📊 CategoriesView: Fetched ${allTransactions.length} transactions`)
      setTransactions(allTransactions)

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
  }, [user, selectedYear, selectedMonth])

  // Data sync effect
  useDataSyncEffect(() => {
    console.log('🔄 CategoriesView: Data sync triggered, refetching data')
    fetchData()
  }, [])

  // Group transactions by category
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    // Filter transactions by type if needed
    const filteredTransactions = transactions.filter(transaction => {
      if (filterType === 'all') return true
      return transaction.source_type === filterType
    })

    // Only include expense transactions
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense')

    // Group by category
    const groups = new Map<string, Transaction[]>()
    
    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'Sin categoría'
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(transaction)
    })

    // Convert to CategoryGroup objects with calculations
    const categoryGroupsArray: CategoryGroup[] = Array.from(groups.entries()).map(([categoryName, transactions]) => {
      const total = transactions.reduce((sum, t) => sum + t.value, 0)
      const paid = transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
      const pendingTransactions = transactions.filter(t => {
        if (t.status !== 'pending') return false
        if (!t.deadline) return true
        return !isDateOverdue(t.deadline)
      })
      const overdueTransactions = transactions.filter(t => {
        if (t.status !== 'pending') return false
        if (!t.deadline) return false
        return isDateOverdue(t.deadline)
      })
      
      const pending = pendingTransactions.reduce((sum, t) => sum + t.value, 0)
      const overdue = overdueTransactions.reduce((sum, t) => sum + t.value, 0)

      return {
        categoryName,
        transactions: transactions.sort((a, b) => {
          // Sort by deadline (closest first)
          if (a.deadline && b.deadline) {
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          }
          if (a.deadline && !b.deadline) return -1
          if (!a.deadline && b.deadline) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }),
        total,
        paid,
        pending,
        overdue,
        count: transactions.length
      }
    })

    // Sort categories by total amount (descending)
    return categoryGroupsArray.sort((a, b) => b.total - a.total)
  }, [transactions, filterType])

  // Calculate overall totals
  const overallTotals = useMemo(() => {
    return categoryGroups.reduce((acc, group) => ({
      total: acc.total + group.total,
      paid: acc.paid + group.paid,
      pending: acc.pending + group.pending,
      overdue: acc.overdue + group.overdue,
      count: acc.count + group.count
    }), { total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
  }, [categoryGroups])

  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  // Get category display name with fallback
  const getCategoryDisplayName = (categoryName: string) => {
    if (categoryName === 'sin categoría' || categoryName === 'Sin categoría') {
      return 'Sin categoría'
    }
    return categoryName
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Transacciones por Categoría</h1>
        <p className="text-gray-600">Organiza y analiza tus gastos agrupados por categoría</p>
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

      {/* Filters Section */}
      <div className="mb-4 bg-white border border-gray-200 rounded-xl shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-blue-100 rounded-lg">
              <Calendar className="h-3 w-3 text-blue-600" />
            </div>
            <h3 className="text-xs font-semibold text-gray-800">Filtros</h3>
          </div>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {categoryGroups.length} categorías
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Year Filter */}
          <div className="relative group">
            <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-2 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {/* Month Filter */}
          <div className="relative group">
            <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
            <select
              value={selectedMonth || 'all'}
              onChange={(e) => setSelectedMonth(e.target.value === 'all' ? null : Number(e.target.value))}
              className="w-full px-2 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
            >
              <option value="all">Todos los meses</option>
              {months.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div className="relative group">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <div className="flex space-x-1 bg-gray-50 p-1 rounded-md">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  filterType === 'all'
                    ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm`
                    : `text-${getNestedColor('filter', 'inactive', 'text')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('recurrent')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  filterType === 'recurrent'
                    ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm`
                    : `text-${getNestedColor('filter', 'inactive', 'text')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
                }`}
              >
                Recurrentes
              </button>
              <button
                onClick={() => setFilterType('non_recurrent')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  filterType === 'non_recurrent'
                    ? `bg-${getNestedColor('filter', 'active', 'bg')} text-${getNestedColor('filter', 'active', 'text')} shadow-sm`
                    : `text-${getNestedColor('filter', 'inactive', 'text')} hover:bg-${getNestedColor('filter', 'inactive', 'hoverBg')}`
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
                  setSelectedYear(new Date().getFullYear())
                  setSelectedMonth(new Date().getMonth() + 1)
                  setFilterType('all')
                }}
                className="w-full px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-md shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
              >
                Mes Actual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="mb-4 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Resumen General</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`bg-gradient-to-br ${getGradient('expense')} p-3 rounded-lg border`}>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-white" />
              <div>
                <p className="text-xs font-medium text-white/90">Total</p>
                <p className="text-lg font-bold text-white">{formatCurrency(overallTotals.total)}</p>
                <p className="text-xs text-white/80">{overallTotals.count} transacciones</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg border">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-white" />
              <div>
                <p className="text-xs font-medium text-white/90">Pagado</p>
                <p className="text-lg font-bold text-white">{formatCurrency(overallTotals.paid)}</p>
                <p className="text-xs text-white/80">
                  {overallTotals.total > 0 ? Math.round((overallTotals.paid / overallTotals.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-white" />
              <div>
                <p className="text-xs font-medium text-white/90">Pendiente</p>
                <p className="text-lg font-bold text-white">{formatCurrency(overallTotals.pending)}</p>
                <p className="text-xs text-white/80">
                  {overallTotals.total > 0 ? Math.round((overallTotals.pending / overallTotals.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-lg border">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-white" />
              <div>
                <p className="text-xs font-medium text-white/90">Vencido</p>
                <p className="text-lg font-bold text-white">{formatCurrency(overallTotals.overdue)}</p>
                <p className="text-xs text-white/80">
                  {overallTotals.total > 0 ? Math.round((overallTotals.overdue / overallTotals.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Categorías 
            {selectedMonth ? ` - ${months[selectedMonth - 1]} ${selectedYear}` : ` - ${selectedYear}`}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">{texts.loading}</div>
        ) : categoryGroups.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay transacciones para mostrar</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categoryGroups.map((group) => {
              const isExpanded = expandedCategories.has(group.categoryName)
              const displayName = getCategoryDisplayName(group.categoryName)
              
              return (
                <div key={group.categoryName} className="group">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(group.categoryName)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          group.categoryName === 'sin categoría' || group.categoryName === 'Sin categoría'
                            ? 'bg-red-100'
                            : 'bg-blue-100'
                        }`}>
                          <DollarSign className={`h-4 w-4 ${
                            group.categoryName === 'sin categoría' || group.categoryName === 'Sin categoría'
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{displayName}</h3>
                          <p className="text-sm text-gray-500">{group.count} transacciones</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(group.total)}</p>
                          <div className="flex space-x-3 text-xs">
                            <span className="text-green-600">Pagado: {formatCurrency(group.paid)}</span>
                            {group.pending > 0 && (
                              <span className="text-yellow-600">Pendiente: {formatCurrency(group.pending)}</span>
                            )}
                            {group.overdue > 0 && (
                              <span className="text-red-600">Vencido: {formatCurrency(group.overdue)}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${group.total > 0 ? (group.paid / group.total) * 100 : 0}%` }}
                            />
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content - Transactions List */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-gray-50">
                      <div className="space-y-2">
                        {group.transactions.map((transaction) => (
                          <div key={transaction.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-1.5 rounded-full ${
                                  transaction.source_type === 'recurrent' 
                                    ? 'bg-blue-100' 
                                    : 'bg-gray-100'
                                }`}>
                                  {transaction.source_type === 'recurrent' ? (
                                    <Repeat className="h-3 w-3 text-blue-600" />
                                  ) : (
                                    <FileText className="h-3 w-3 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <span>{months[transaction.month - 1]} {transaction.year}</span>
                                    {transaction.deadline && (
                                      <span>• Vence: {(() => {
                                        const [year, month, day] = transaction.deadline.split('-').map(Number);
                                        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                                      })()}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(transaction.value)}
                                </span>
                                <span className={cn(
                                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                  transaction.status === 'paid' 
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.deadline && isDateOverdue(transaction.deadline)
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                )}>
                                  {transaction.status === 'paid' 
                                    ? 'Pagado' 
                                    : transaction.deadline && isDateOverdue(transaction.deadline)
                                      ? 'Vencido'
                                      : 'Pendiente'
                                  }
                                </span>
                              </div>
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
        )}
      </div>
    </div>
  )
} 