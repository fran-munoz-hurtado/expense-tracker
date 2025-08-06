'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Calendar, Target, AlertCircle, CheckCircle, Info, Repeat, Tag } from 'lucide-react'
import { type User, type Transaction, type RecurrentExpense, type NonRecurrentExpense } from '@/lib/supabase'
import { texts } from '@/lib/translations'
import { fetchUserTransactions, fetchUserExpenses } from '@/lib/dataUtils'
import { getStatusColors } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'
import { getTransactionIconType, getTransactionIconColor, getTransactionIconBackground } from '@/lib/utils/transactionIcons'
import { renderCustomIcon } from '@/lib/utils/iconRenderer'
import ResumenMensual from './ResumenMensual'
import TransactionIcon from './TransactionIcon'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import React from 'react'

interface ComoVamosViewProps {
  user: User
  navigationParams?: any
}

export default function ComoVamosView({ user, navigationParams }: ComoVamosViewProps) {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const navigation = useAppNavigation()

  // Log component mounting/unmounting for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 ComoVamosView: Component mounted')
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 ComoVamosView: Component unmounted')
      }
    }
  }, [])

  // Get current month and year
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Create recurrentGoalMap like in other views
  const recurrentGoalMap = React.useMemo(() => {
    const map: Record<number, boolean> = {}
    recurrentExpenses.forEach(re => {
      if (re.isgoal) map[re.id] = true
    })
    return map
  }, [recurrentExpenses])

  // Fetch transactions and expenses for current month
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 ComoVamosView: loading started')
        }
        setLoadingTransactions(true)
        
        const [monthTransactions, expenses] = await Promise.all([
          fetchUserTransactions(user, currentMonth, currentYear),
          fetchUserExpenses(user)
        ])
        
        setTransactions(monthTransactions)
        setRecurrentExpenses(expenses.recurrent)
        setNonRecurrentExpenses(expenses.nonRecurrent)
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ ComoVamosView: loaded successfully with ${monthTransactions.length} transactions`)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoadingTransactions(false)
      }
    }

    // Only fetch if we have a valid user
    if (user) {
      fetchData()
    }
  }, [user, currentMonth, currentYear])

  // Helper function to compare dates without time
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return deadlineDate < todayDate;
  }

  // Helper function to get days until deadline
  const getDaysUntilDeadline = (deadline: string): number => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = deadlineDate.getTime() - todayDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Helper function to get days until deadline and format it
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
        className: 'text-xs font-medium text-warning-yellow bg-warning-bg px-2 py-1 rounded-full'
      };
    } else if (diffDays === 0) {
      return {
        text: 'Vence hoy',
        className: 'text-xs font-medium text-warning-yellow bg-warning-bg px-2 py-1 rounded-full'
      };
    } else {
      return {
        text: `Venció hace ${Math.abs(diffDays) === 1 ? '1 día' : Math.abs(diffDays) + ' días'}`,
        className: 'text-xs font-medium text-error-red bg-error-bg px-2 py-1 rounded-full'
      };
    }
  }

  // Navigation function to go to Mis cuentas
  const handleNavigateToControlDelMes = () => {
    navigation.navigateToDashboard(currentMonth, currentYear)
  }

  // Calculate goals status
  const getGoalsStatus = () => {
    const goalTransactions = transactions.filter(t => 
      t.type === 'expense' && 
      t.source_type === 'recurrent' && 
      recurrentGoalMap[t.source_id]
    )
    
    const hasOverdueGoals = goalTransactions.some(t => 
      t.status === 'pending' && 
      t.deadline && 
      isDateOverdue(t.deadline)
    )
    
    return hasOverdueGoals ? 'overdue' : 'on-time'
  }

  // Get active categories with their status
  const getActiveCategoriesWithStatus = () => {
    const categoryMap = new Map<string, { transactions: Transaction[], hasOverdue: boolean }>()
    
    const expenseTransactions = transactions.filter(t => 
      t.type === 'expense' && 
      t.category !== 'Ahorro' && 
      !recurrentGoalMap[t.source_id]
    )
    
    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'Sin categoría'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { transactions: [], hasOverdue: false })
      }
      
      const categoryData = categoryMap.get(category)!
      categoryData.transactions.push(transaction)
      
      if (transaction.status === 'pending' && transaction.deadline && isDateOverdue(transaction.deadline)) {
        categoryData.hasOverdue = true
      }
    })
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        name: category,
        status: data.hasOverdue ? 'overdue' : 'on-time',
        transactionCount: data.transactions.length
      }))
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 3)
  }

  // Get category icon using the same system as CategoriesView
  const getCategoryIcon = (categoryName: string) => {
    return (
      <Tag className={`h-4 w-4 transform rotate-90 ${
        categoryName === 'sin categoría' || categoryName === 'Sin categoría'
          ? 'text-[#d9534f]'
          : (() => {
              // Check if it's a default category
              const isDefaultCategory = Object.values(CATEGORIES.EXPENSE).includes(categoryName as any)
              return isDefaultCategory ? 'text-[#5d7760]' : 'text-[#3d9f65]'
            })()
      } fill-current`} />
    )
  }

  // ResumenCumplimiento component
  const ResumenCumplimiento = () => {
    const goalsStatus = getGoalsStatus()
    const activeCategories = getActiveCategoriesWithStatus()
    
    if (loadingTransactions) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-4 w-full">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-xl shadow-sm p-4 w-full">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
            Resumen de cumplimiento
          </h3>
          <p className="text-xs text-gray-500 font-sans">
            Estado general de tus compromisos financieros
          </p>
        </div>

        <div className="space-y-4">
          {/* Estado de Metas */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-dark font-sans">Metas</h4>
            <p className="text-xs text-gray-500 font-sans">Estado general de tus metas financieras</p>
            
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-green-primary" />
                <span className={`px-2 py-1 rounded-md text-xs font-medium font-sans ${
                  goalsStatus === 'overdue' 
                    ? 'bg-warning-bg text-warning-yellow' 
                    : 'bg-green-light text-green-primary'
                }`}>
                  {goalsStatus === 'overdue' ? 'Pendiente' : 'Al día'}
                </span>
              </div>
              
              <button
                onClick={() => navigation.navigateToMisMetas(currentYear)}
                className="text-sm text-green-primary hover:text-green-dark underline hover:opacity-80 transition-opacity font-sans"
              >
                → Ver metas en detalle
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-100"></div>

          {/* Estado de Categorías */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-dark font-sans">Categorías</h4>
            <p className="text-xs text-gray-500 font-sans">Revisión rápida de tus categorías</p>
            
            {activeCategories.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500 font-sans">
                  No hay categorías activas este mes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeCategories.map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category.name)}
                      <span className="text-xs text-gray-dark font-sans">{category.name}</span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium font-sans ${
                        category.status === 'overdue' 
                          ? 'bg-error-bg text-error-red' 
                          : 'bg-green-light text-green-primary'
                      }`}>
                        {category.status === 'overdue' ? 'Vencido' : 'Al día'}
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => navigation.navigateToCategories(currentYear, currentMonth)}
                    className="text-sm text-green-primary hover:text-green-dark underline hover:opacity-80 transition-opacity font-sans"
                  >
                    → Ver categorías
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Filter and sort upcoming due transactions
  const upcomingTransactions = transactions
    .filter(t => t.type === 'expense' && t.deadline && t.status === 'pending')
    .filter(t => {
      const daysUntil = getDaysUntilDeadline(t.deadline!)
      return daysUntil <= 5 && daysUntil >= -30 // Show up to 5 days ahead and 30 days overdue
    })
    .sort((a, b) => {
      const aDays = getDaysUntilDeadline(a.deadline!)
      const bDays = getDaysUntilDeadline(b.deadline!)
      return aDays - bDays
    })
    .slice(0, 3)

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number)
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
  }

  // Get status for transaction
  const getTransactionStatus = (transaction: Transaction): 'pending' | 'overdue' => {
    if (!transaction.deadline) return 'pending'
    return isDateOverdue(transaction.deadline) ? 'overdue' : 'pending'
  }

  // Get status text
  const getStatusText = (status: 'pending' | 'overdue'): string => {
    return status === 'overdue' ? 'Se pasó la fecha' : 'Falta pagar'
  }

  // EstadoAhorro component
  const EstadoAhorro = () => {
    if (loadingTransactions) {
      return (
        <div className="bg-green-50 border border-gray-200 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      )
    }

    // Calculate savings data
    const savingsTransactions = transactions.filter(t => 
      t.type === 'expense' && t.category === 'Ahorro'
    )
    
    const totalSavingsThisMonth = savingsTransactions.reduce((sum, t) => sum + t.value, 0)
    
    // Calculate total income this month
    const totalIncomeThisMonth = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0)
    
    // Calculate percentage
    const savingsPercentage = totalIncomeThisMonth > 0 
      ? (totalSavingsThisMonth / totalIncomeThisMonth) * 100 
      : 0
    
    // Check if any savings transaction is overdue
    const hasOverdueSavings = savingsTransactions.some(t => 
      t.status === 'pending' && t.deadline && isDateOverdue(t.deadline)
    )
    
    // Calculate total historical savings (for now, just use current month - could be extended)
    const totalHistoricalSavings = totalSavingsThisMonth // Placeholder for historical data
    
    // If no savings this month, show motivational message
    if (totalSavingsThisMonth === 0) {
      return (
        <div className="bg-green-50 border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-sm font-semibold text-gray-dark font-sans mb-1">
            Tu ahorro este mes
          </h3>
          <p className="text-sm text-gray-500 font-sans mb-2">
            Guardar aunque sea un poco te ayuda a estar más tranquilo mañana.<br />
            Puedes empezar hoy con lo que tengas.
          </p>
          <button
            onClick={handleNavigateToControlDelMes}
            className="text-sm text-green-primary hover:text-green-dark underline hover:opacity-80 transition-opacity font-sans"
          >
            → Registrar ahorro
          </button>
        </div>
      )
    }

    return (
      <div className="bg-green-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-dark font-sans mb-1">
          Tu ahorro este mes
        </h3>
        
        <div className="mb-2">
          <span className="text-xl font-semibold text-green-800 font-sans">
            {formatCurrency(totalSavingsThisMonth)}
          </span>
        </div>
        
        <p className="text-sm text-gray-500 font-sans mb-2">
          Representa el {savingsPercentage.toFixed(1)}% de tus ingresos este mes
        </p>
        
        <div className="flex items-center space-x-2 mb-2">
          <span className={`px-2 py-1 rounded-md text-xs font-medium font-sans ${
            hasOverdueSavings 
              ? 'bg-error-bg text-error-red' 
              : 'bg-green-light text-green-primary'
          }`}>
            {hasOverdueSavings ? 'Vencido' : 'Al día'}
          </span>
        </div>
        
        <p className="text-sm text-gray-500 font-sans">
          Has ahorrado {formatCurrency(totalHistoricalSavings)} en total
        </p>
      </div>
    )
  }

  // ProximosVencimientos component
  const ProximosVencimientos = () => {
    if (loadingTransactions) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-4 w-full">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-xl shadow-sm p-4 w-full">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
            Próximos vencimientos
          </h3>
          <p className="text-xs text-gray-500 font-sans">
            Pagos que vencerán pronto
          </p>
        </div>

        {upcomingTransactions.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-dark font-sans mb-1">
              ¡No tienes pagos próximos!
            </p>
            <p className="text-xs text-gray-500 font-sans">
              Sigue así, tu organización va muy bien.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {upcomingTransactions.map((transaction, index) => {
                const status = getTransactionStatus(transaction)
                const statusColors = getStatusColors(status)
                const daysUntilText = getDaysUntilDeadlineText(transaction.deadline!)
                
                return (
                  <div key={transaction.id} className={`py-3 ${index === 0 ? 'pt-0' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <TransactionIcon
                          transaction={transaction}
                          recurrentGoalMap={{}}
                          size="w-4 h-4"
                          containerSize="w-6 h-6"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-dark font-sans truncate mb-1">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500 font-sans leading-none">
                            Vence: {formatDate(transaction.deadline!)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={daysUntilText.className}>
                          {daysUntilText.text}
                        </span>
                        <span className="text-sm font-medium text-gray-800 font-sans">
                          {formatCurrency(transaction.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Unified navigation link */}
            <div className="mt-3 text-right">
              <button
                onClick={handleNavigateToControlDelMes}
                className="text-sm text-green-primary hover:text-green-dark underline hover:opacity-80 transition-opacity font-sans"
              >
                → Ver con más detalle
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 font-sans">{texts.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark font-sans">¿Cómo vamos?</h2>
          <p className="text-sm text-green-dark font-sans">Tu estado financiero general</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Estado del Ahorro Component */}
          <EstadoAhorro />
          
          {/* Resumen Mensual Component */}
          <ResumenMensual user={user} />
          
          {/* Próximos Vencimientos Component */}
          <ProximosVencimientos />
          
          {/* Resumen de Cumplimiento Component */}
          <ResumenCumplimiento />
        </div>
      </div>
    </div>
  )
} 