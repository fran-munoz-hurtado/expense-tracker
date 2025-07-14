'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp, Calendar, DollarSign, FileText, Repeat, CheckCircle, AlertCircle, TrendingUp, X, Paperclip } from 'lucide-react'
import { type Transaction, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserTransactions, fetchAttachmentCounts } from '@/lib/dataUtils'
import { useDataSyncEffect } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'

interface CategoriesViewProps {
  navigationParams?: { year?: number; month?: number } | null
  user: User
}

interface YearGroup {
  year: number
  transactions: Transaction[]
  total: number
  paid: number
  pending: number
  overdue: number
}

interface RecurrentGroup {
  sourceId: number
  description: string
  yearGroups: YearGroup[]
  total: number
  paid: number
  pending: number
  overdue: number
}

interface CategoryGroup {
  categoryName: string
  recurrentGroups: RecurrentGroup[]
  nonRecurrentTransactions: Transaction[]
  total: number
  paid: number
  pending: number
  overdue: number
  count: number
}

export default function CategoriesView({ navigationParams, user }: CategoriesViewProps) {
  const navigation = useAppNavigation()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedRecurrentGroups, setExpandedRecurrentGroups] = useState<Set<string>>(new Set())
  const [expandedYearGroups, setExpandedYearGroups] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(navigationParams?.month || null)
  const [filterType, setFilterType] = useState<'all' | 'recurrent' | 'non_recurrent'>('all')

  // Direct attachment functionality implementation (without external hook)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)
  const [showTransactionAttachments, setShowTransactionAttachments] = useState(false)
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null)

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

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const availableYears = Array.from({ length: 16 }, (_, i) => 2025 + i)

  // Navigation function to redirect to Control del mes
  const handleNavigateToMonth = async (month: number, year: number) => {
    try {
      console.log(`🗂️ CategoriesView: Navigating to Control del mes - Month: ${month}, Year: ${year}`)
      await navigation.navigateToDashboard(month, year)
    } catch (error) {
      console.error('❌ CategoriesView: Navigation error:', error)
    }
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

      // Load attachment counts
      await loadAttachmentCounts(allTransactions)

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

  // Group transactions by category with recurrent and year grouping
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

    // Convert to CategoryGroup objects with recurrent and year grouping
    const categoryGroupsArray: CategoryGroup[] = Array.from(groups.entries()).map(([categoryName, transactions]) => {
      // Separate recurrent and non-recurrent transactions
      const recurrentTransactions = transactions.filter(t => t.source_type === 'recurrent')
      const nonRecurrentTransactions = transactions.filter(t => t.source_type === 'non_recurrent')

      // Group recurrent transactions by source_id
      const recurrentGroups = new Map<number, Transaction[]>()
      recurrentTransactions.forEach(transaction => {
        const sourceId = transaction.source_id
        if (!recurrentGroups.has(sourceId)) {
          recurrentGroups.set(sourceId, [])
        }
        recurrentGroups.get(sourceId)!.push(transaction)
      })

      // Convert recurrent groups to RecurrentGroup objects with year grouping
      const recurrentGroupsArray: RecurrentGroup[] = Array.from(recurrentGroups.entries()).map(([sourceId, groupTransactions]) => {
        // Group transactions by year
        const yearGroups = new Map<number, Transaction[]>()
        groupTransactions.forEach(transaction => {
          const year = transaction.year
          if (!yearGroups.has(year)) {
            yearGroups.set(year, [])
          }
          yearGroups.get(year)!.push(transaction)
        })

        // Convert year groups to YearGroup objects
        const yearGroupsArray: YearGroup[] = Array.from(yearGroups.entries()).map(([year, yearTransactions]) => {
          const sortedTransactions = yearTransactions.sort((a, b) => {
            // Sort by month
            return a.month - b.month
          })

          const total = sortedTransactions.reduce((sum, t) => sum + t.value, 0)
          const paid = sortedTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
          const pendingTransactions = sortedTransactions.filter(t => {
            if (t.status !== 'pending') return false
            if (!t.deadline) return true
            return !isDateOverdue(t.deadline)
          })
          const overdueTransactions = sortedTransactions.filter(t => {
            if (t.status !== 'pending') return false
            if (!t.deadline) return false
            return isDateOverdue(t.deadline)
          })
          
          const pending = pendingTransactions.reduce((sum, t) => sum + t.value, 0)
          const overdue = overdueTransactions.reduce((sum, t) => sum + t.value, 0)

          return {
            year,
            transactions: sortedTransactions,
            total,
            paid,
            pending,
            overdue
          }
        })

        // Sort year groups by year (descending - newest first)
        const sortedYearGroups = yearGroupsArray.sort((a, b) => b.year - a.year)

        // Calculate recurrent group totals
        const allRecurrentTransactions = groupTransactions
        const total = allRecurrentTransactions.reduce((sum, t) => sum + t.value, 0)
        const paid = allRecurrentTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
        const pendingTransactions = allRecurrentTransactions.filter(t => {
          if (t.status !== 'pending') return false
          if (!t.deadline) return true
          return !isDateOverdue(t.deadline)
        })
        const overdueTransactions = allRecurrentTransactions.filter(t => {
          if (t.status !== 'pending') return false
          if (!t.deadline) return false
          return isDateOverdue(t.deadline)
        })
        
        const pending = pendingTransactions.reduce((sum, t) => sum + t.value, 0)
        const overdue = overdueTransactions.reduce((sum, t) => sum + t.value, 0)

        return {
          sourceId,
          description: groupTransactions[0].description, // Use first transaction's description
          yearGroups: sortedYearGroups,
          total,
          paid,
          pending,
          overdue
        }
      })

      // Sort non-recurrent transactions by deadline
      const sortedNonRecurrentTransactions = nonRecurrentTransactions.sort((a, b) => {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        }
        if (a.deadline && !b.deadline) return -1
        if (!a.deadline && b.deadline) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      // Calculate category totals
      const allTransactions = [...recurrentTransactions, ...nonRecurrentTransactions]
      const total = allTransactions.reduce((sum, t) => sum + t.value, 0)
      const paid = allTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
      const pendingTransactions = allTransactions.filter(t => {
        if (t.status !== 'pending') return false
        if (!t.deadline) return true
        return !isDateOverdue(t.deadline)
      })
      const overdueTransactions = allTransactions.filter(t => {
        if (t.status !== 'pending') return false
        if (!t.deadline) return false
        return isDateOverdue(t.deadline)
      })
      
      const pending = pendingTransactions.reduce((sum, t) => sum + t.value, 0)
      const overdue = overdueTransactions.reduce((sum, t) => sum + t.value, 0)

      return {
        categoryName,
        recurrentGroups: recurrentGroupsArray,
        nonRecurrentTransactions: sortedNonRecurrentTransactions,
        total,
        paid,
        pending,
        overdue,
        count: allTransactions.length
      }
    })

    // Sort categories by total amount (descending)
    return categoryGroupsArray.sort((a, b) => b.total - a.total)
  }, [transactions, filterType])

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

  // Toggle recurrent group expansion
  const toggleRecurrentGroup = (categoryName: string, sourceId: number) => {
    const groupKey = `${categoryName}-${sourceId}`
    setExpandedRecurrentGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  // Toggle year group expansion
  const toggleYearGroup = (categoryName: string, sourceId: number, year: number) => {
    const yearKey = `${categoryName}-${sourceId}-${year}`
    setExpandedYearGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(yearKey)) {
        newSet.delete(yearKey)
      } else {
        newSet.add(yearKey)
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

  // Get transaction icon (consistent with DashboardView)
  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.source_type === 'recurrent') {
      return <Repeat className={`h-4 w-4 text-${getColor(transaction.type, 'icon')}`} />
    } else {
      return <FileText className={`h-4 w-4 text-${getColor(transaction.type, 'icon')}`} />
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
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
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex px-6 lg:px-8 pb-6 lg:pb-8 gap-4 min-h-0">
        {/* Left Column - Categories List */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Categorías
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">{texts.loading}</div>
          ) : categoryGroups.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No hay categorías para mostrar</div>
          ) : (
            <div className="overflow-y-auto">
              {categoryGroups.map((group) => {
                const displayName = getCategoryDisplayName(group.categoryName)
                const isSelected = selectedCategory === group.categoryName
                
                return (
                  <button
                    key={group.categoryName}
                    onClick={() => setSelectedCategory(group.categoryName)}
                    className={`w-full p-4 text-left border-b border-gray-100 transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm ${
                      isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${
                          group.categoryName === 'sin categoría' || group.categoryName === 'Sin categoría'
                            ? 'bg-red-100'
                            : isSelected 
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}>
                          <DollarSign className={`h-4 w-4 ${
                            group.categoryName === 'sin categoría' || group.categoryName === 'Sin categoría'
                              ? 'text-red-600'
                              : isSelected
                              ? 'text-blue-600'
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {displayName}
                          </h3>
                          <p className="text-xs text-gray-500">{group.count} transacciones</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {formatCurrency(group.total)}
                        </p>
                        <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${group.total > 0 ? (group.paid / group.total) * 100 : 0}%` }}
                          />
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
          {!selectedCategory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una categoría</h3>
                <p className="text-gray-500">Haz clic en una categoría de la izquierda para ver sus transacciones</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Selected Category Content - Direct Transaction Hierarchy */}
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const group = categoryGroups.find(g => g.categoryName === selectedCategory)
                  if (!group) return null

                  return (
                    <div className="space-y-3">
                      {/* Recurrent Groups */}
                      {group.recurrentGroups.map((recurrentGroup) => {
                        const groupKey = `${group.categoryName}-${recurrentGroup.sourceId}`
                        const isRecurrentExpanded = expandedRecurrentGroups.has(groupKey)
                        
                        return (
                          <div key={recurrentGroup.sourceId} className="bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                            {/* Recurrent Group Header */}
                            <button
                              onClick={() => toggleRecurrentGroup(group.categoryName, recurrentGroup.sourceId)}
                              className="w-full p-4 text-left transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm hover:bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-1.5 rounded-full bg-${getColor('expense', 'light')} transition-all duration-300 hover:scale-110`}>
                                    <Repeat className={`h-4 w-4 text-${getColor('expense', 'icon')}`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{recurrentGroup.description}</p>
                                    <p className="text-xs text-gray-500">({recurrentGroup.yearGroups.length} años)</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(recurrentGroup.total)}</p>
                                    <div className="flex space-x-2 text-xs">
                                      <span className="text-green-600">{formatCurrency(recurrentGroup.paid)}</span>
                                      {recurrentGroup.pending > 0 && (
                                        <span className="text-yellow-600">{formatCurrency(recurrentGroup.pending)}</span>
                                      )}
                                      {recurrentGroup.overdue > 0 && (
                                        <span className="text-red-600">{formatCurrency(recurrentGroup.overdue)}</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {isRecurrentExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Recurrent Group Transactions */}
                            {isRecurrentExpanded && (
                              <div className="px-4 pb-4 bg-white rounded-b-lg">
                                <div className="space-y-2">
                                  {recurrentGroup.yearGroups.map((yearGroup) => {
                                    const yearKey = `${group.categoryName}-${recurrentGroup.sourceId}-${yearGroup.year}`
                                    const isYearGroupExpanded = expandedYearGroups.has(yearKey)

                                    return (
                                      <div key={yearGroup.year} className="bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                                        {/* Year Group Header */}
                                        <button
                                          onClick={() => toggleYearGroup(group.categoryName, recurrentGroup.sourceId, yearGroup.year)}
                                          className="w-full p-3 text-left transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm hover:bg-gray-50 rounded-lg"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <div className={`p-1 rounded-full bg-${getColor('expense', 'light')} transition-all duration-300 hover:scale-110`}>
                                                <Calendar className={`h-3 w-3 text-${getColor('expense', 'icon')}`} />
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-gray-900">{yearGroup.year}</span>
                                                <span className="text-xs font-medium text-gray-500">({yearGroup.transactions.length} meses)</span>
                                                <span className="text-xs font-medium text-gray-900">{formatCurrency(yearGroup.total)}</span>
                                                <div className="flex space-x-1 text-xs">
                                                  <span className="text-green-600">{formatCurrency(yearGroup.paid)}</span>
                                                  {yearGroup.pending > 0 && (
                                                    <span className="text-yellow-600">{formatCurrency(yearGroup.pending)}</span>
                                                  )}
                                                  {yearGroup.overdue > 0 && (
                                                    <span className="text-red-600">{formatCurrency(yearGroup.overdue)}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {isYearGroupExpanded ? (
                                              <ChevronUp className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                            )}
                                          </div>
                                        </button>

                                        {/* Year Group Transactions */}
                                        {isYearGroupExpanded && (
                                          <div className="px-3 pb-3 bg-white rounded-b-lg">
                                            <div className="space-y-1">
                                              {yearGroup.transactions.map((transaction) => (
                                                <div key={transaction.id} className="bg-gray-50 rounded-md p-3 border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                      <div className={`p-1 rounded-full bg-${getColor(transaction.type, 'light')} transition-all duration-300 hover:scale-110`}>
                                                        {getTransactionIcon(transaction)}
                                                      </div>
                                                      <span className="text-xs font-medium text-gray-900">{months[transaction.month - 1]}</span>
                                                      {/* Navigation Link Icon */}
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
                                                      {transaction.deadline && (
                                                        <span className="text-xs font-medium text-gray-500">
                                                          Vence: {(() => {
                                                            const [year, month, day] = transaction.deadline.split('-').map(Number);
                                                            return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
                                                          })()}
                                                        </span>
                                                      )}
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2">
                                                      <span className="text-xs font-semibold text-gray-900">
                                                        {formatCurrency(transaction.value)}
                                                      </span>
                                                      <span className={cn(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
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
                                                      {/* Attachment Clip */}
                                                      <AttachmentClip transaction={transaction} />
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

                                  {/* Non-Recurrent Transactions */}
                                  {group.nonRecurrentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <div className={`p-1.5 rounded-full bg-${getColor(transaction.type, 'light')} transition-all duration-300 hover:scale-110`}>
                                            {getTransactionIcon(transaction)}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                                              <span>{months[transaction.month - 1]} {transaction.year}</span>
                                              {/* Navigation Link Icon */}
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
                                          {/* Attachment Clip */}
                                          <AttachmentClip transaction={transaction} />
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