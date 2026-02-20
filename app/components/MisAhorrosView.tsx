'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, AlertTriangle } from 'lucide-react'
import { type User, type Transaction } from '@/lib/supabase'
import { useTransactionStore } from '@/lib/store/transactionStore'
import { useGroupStore } from '@/lib/store/groupStore'
import { useDataSyncEffect } from '@/lib/hooks/useDataSync'
import TransactionIcon from './TransactionIcon'
import { cn } from '@/lib/utils'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'

interface MisAhorrosViewProps {
  user: User
  navigationParams?: any
}

export default function MisAhorrosView({ user, navigationParams }: MisAhorrosViewProps) {
  const { transactions, isLoading, fetchTransactions } = useTransactionStore()
  const { currentGroupId } = useGroupStore()
  
  const [error, setError] = useState<string | null>(null)
  const navigation = useAppNavigation()

  // Optional validator to ensure data consistency
  function validateSavingsData(transactions: Transaction[]) {
    const savingsTransactions = transactions.filter(t => t.type === 'expense' && t.category === 'Ahorro')
    const invalid = transactions.filter(t => t.type !== 'expense' || t.category !== 'Ahorro')
    if (invalid.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('[zustand] MisAhorrosView: Found', invalid.length, 'non-savings transactions in view:', invalid.slice(0, 3))
    }
    return savingsTransactions
  }

  // Get current month and year
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Navigation handler to go to "Mis cuentas" with specific month/year filters
  const handleNavigateToMonth = async (month: number, year: number) => {
    try {
      console.log(`🔄 MisAhorrosView: Navigating to Mis cuentas - ${month}/${year}`)
      await navigation.navigateToDashboard(month, year)
      console.log('✅ Navigation completed')
    } catch (error) {
      console.error('❌ Navigation error:', error)
    }
  }

  // Month names for display
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Fetch transactions data using pure Zustand pattern
  const fetchData = useCallback(async () => {
    if (!user || !currentGroupId) return
    
    try {
      setError(null)
      await fetchTransactions({ userId: user.id, groupId: currentGroupId, scope: 'all' })
      
      console.log('[zustand] MisAhorrosView: transactions loaded:', transactions.length)
      
      // Validate savings data
      validateSavingsData(transactions)

    } catch (error) {
      console.error('❌ Error in fetchData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [user, currentGroupId, fetchTransactions, transactions])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Development logging for Zustand transactions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isLoading) {
      const savings = transactions.filter(t => t.type === 'expense' && t.category === 'Ahorro')
      if (savings.length > 0) {
        console.log('[zustand] MisAhorrosView: loaded', savings.length, 'savings transactions from Zustand')
      }
    }
  }, [isLoading, transactions])

  // Data sync effect using pure Zustand pattern
  useDataSyncEffect(() => {
    console.log('[zustand] MisAhorrosView: useDataSyncEffect triggered')
    fetchData()
  }, [fetchData])

  // Helper function to compare dates without time
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Helper function to format month-year labels
  const formatMonthYear = (date: Date): string => {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ]
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  // Format date for display (same as other sections)
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number)
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
  }

  // Format month-year for period display - now shows only month abbreviation
  const formatPeriod = (month: number, year: number): string => {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ]
    return `${months[month - 1]}` // Only return month abbreviation
  }

  // Status functions (specific for savings view)
  const getSavingsStatusText = (transaction: Transaction): string => {
    if (transaction.status === 'paid') return 'Guardado'
    if (transaction.deadline && isDateOverdue(transaction.deadline)) return 'No se ha guardado'
    return 'Falta guardar'
  }

  const getStatusColor = (transaction: Transaction): string => {
    if (transaction.status === 'paid') return 'bg-green-light text-green-800'
    if (transaction.deadline && isDateOverdue(transaction.deadline)) return 'bg-error-bg text-red-800'
    return 'bg-warning-bg text-amber-800'
  }

  // TablaAhorros component
  const TablaAhorros = () => {
    if (isLoading) return null
    if (error) return null
    
    // Filter and sort savings transactions
    const savingsTransactions = transactions
      .filter(t => t.type === 'expense' && t.category === 'Ahorro')
      .sort((a, b) => {
        // First sort by year ascending (current/recent first)
        if (a.year !== b.year) return a.year - b.year
        // Then sort by month ascending (current/recent first)
        if (a.month !== b.month) return a.month - b.month
        // Finally sort by deadline ascending (current/recent first)
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      })
    
    if (savingsTransactions.length === 0) return null
    
    // Group transactions by year (ascending order)
    const groupedByYear = savingsTransactions.reduce((groups, transaction) => {
      const year = transaction.year
      if (!groups[year]) {
        groups[year] = []
      }
      groups[year].push(transaction)
      return groups
    }, {} as Record<number, Transaction[]>)
    
    // Sort years in ascending order (current/recent first)
    const sortedYears = Object.keys(groupedByYear)
      .map(year => parseInt(year))
      .sort((a, b) => a - b)
    
    return (
      <div className="rounded-xl bg-white shadow-soft p-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
            Transacciones de ahorro
          </h3>
          <p className="text-xs text-gray-500 font-sans">
            Historial completo de tus movimientos de ahorro
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full">
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
                </tr>
              </thead>
              <tbody className="bg-white">
                {sortedYears.map((year) => (
                  <React.Fragment key={year}>
                    {/* Year divider row */}
                    <tr>
                      <td colSpan={4} className="px-4 pt-4 pb-2 border-t border-gray-200 bg-white">
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
                              recurrentGoalMap={{}}
                              size="w-4 h-4"
                              containerSize="w-6 h-6"
                            />
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-gray-900 font-sans">
                                {formatPeriod(transaction.month, transaction.year)}
                              </div>
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
                            {transaction.deadline ? formatDate(transaction.deadline) : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans",
                            getStatusColor(transaction)
                          )}>
                            {getSavingsStatusText(transaction)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900 font-sans">
                            {formatCurrency(transaction.value)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {sortedYears.map((year) => (
            <div key={year}>
              {/* Year divider */}
              <div className="mb-4 pb-2 border-b border-gray-200 pt-2">
                <div className="text-sm text-gray-500 font-sans">
                  {year}
                </div>
              </div>
              
              {/* Transactions for this year */}
              <div className="space-y-3">
                {groupedByYear[year].map((transaction) => (
                  <div key={transaction.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <TransactionIcon
                          transaction={transaction}
                          recurrentGoalMap={{}}
                          size="w-4 h-4"
                          containerSize="w-6 h-6"
                        />
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900 font-sans">
                            {formatPeriod(transaction.month, transaction.year)}
                          </div>
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
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 font-sans">
                          {formatCurrency(transaction.value)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-500 font-sans">Fecha límite</span>
                        <div className="text-sm text-gray-900 font-sans">
                          {transaction.deadline ? formatDate(transaction.deadline) : '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-sans">Estado</span>
                        <div className="mt-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans",
                            getStatusColor(transaction)
                          )}>
                            {getSavingsStatusText(transaction)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ResumenAhorro component
  const ResumenAhorro = () => {
    if (isLoading) {
      return (
        <div className="rounded-xl bg-white shadow-soft p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-xl bg-white shadow-soft p-4">
          <div className="text-center text-red-500">{error}</div>
        </div>
      )
    }

    // Filter savings transactions (historical)
    const savingsTransactions = transactions.filter(t => 
      t.type === 'expense' && t.category === 'Ahorro'
    )

    // Calculate temporal marks for the progress bar - responsive and clean
    const generateResponsiveTemporalMarks = () => {
      if (savingsTransactions.length === 0) return []
      
      // Find the first and last savings transaction dates
      const dates = savingsTransactions.map(t => new Date(t.year, t.month - 1))
      const firstDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const lastDate = new Date(Math.max(...dates.map(d => d.getTime())))
      
      // Calculate months between first and last transaction
      const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                        (lastDate.getMonth() - firstDate.getMonth())
      
      const marks = []
      
      if (monthsDiff <= 0) {
        // Single month: show only first
        marks.push(firstDate)
      } else if (monthsDiff <= 6) {
        // Short range (≤ 6 months): show all months
        for (let i = 0; i <= monthsDiff; i++) {
          const markDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + i)
          marks.push(markDate)
        }
      } else if (monthsDiff <= 12) {
        // Medium range (6–12 months): show 3 marks → inicio, mitad, fin
        marks.push(firstDate)
        const middleMonth = Math.floor(monthsDiff / 2)
        const middleDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + middleMonth)
        marks.push(middleDate)
        marks.push(lastDate)
      } else {
        // Long range (> 12 months): show 4 marks → inicio, 1/3, 2/3, fin
        marks.push(firstDate)
        const oneThirdMonth = Math.floor(monthsDiff / 3)
        const twoThirdMonth = Math.floor((monthsDiff * 2) / 3)
        const oneThirdDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + oneThirdMonth)
        const twoThirdDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + twoThirdMonth)
        marks.push(oneThirdDate)
        marks.push(twoThirdDate)
        marks.push(lastDate)
      }
      
      return marks
    }

    // Calculate savings stats (same logic as ResumenMensual)
    const totalSavings = savingsTransactions.reduce((sum, t) => sum + t.value, 0)
    const paidSavings = savingsTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
    const pendingSavings = savingsTransactions.filter(t => {
      if (t.status !== 'pending') return false
      if (!t.deadline) return true
      return !isDateOverdue(t.deadline)
    }).reduce((sum, t) => sum + t.value, 0)
    const overdueSavings = savingsTransactions.filter(t => {
      if (t.status !== 'pending') return false
      if (!t.deadline) return false
      return isDateOverdue(t.deadline)
    }).reduce((sum, t) => sum + t.value, 0)

    // Calculate percentages (same logic as ResumenMensual)
    const porcentajePagado = totalSavings > 0 ? Math.round((paidSavings / totalSavings) * 100) : 0
    const porcentajeVencido = totalSavings > 0 ? Math.round((overdueSavings / totalSavings) * 100) : 0
    const tieneVencimientos = overdueSavings > 0

    // Generate responsive temporal marks
    const temporalMarks = generateResponsiveTemporalMarks()

    // Calculate current month savings data
    const currentMonthTransactions = transactions.filter(t => 
      t.month === currentMonth && t.year === currentYear
    )
    
    const currentMonthSavings = currentMonthTransactions.filter(t => 
      t.type === 'expense' && t.category === 'Ahorro'
    ).reduce((sum, t) => sum + t.value, 0)
    
    const currentMonthIncome = currentMonthTransactions.filter(t => 
      t.type === 'income'
    ).reduce((sum, t) => sum + t.value, 0)
    
    const savingsPercentageOfIncome = currentMonthIncome > 0 
      ? (currentMonthSavings / currentMonthIncome) * 100 
      : 0

    // If no savings, show motivational message
    if (totalSavings === 0) {
      return (
        <div className="rounded-xl bg-white shadow-soft p-4">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
              Resumen de ahorro
            </h3>
            <p className="text-xs text-gray-500 font-sans">
              Tu progreso general con el dinero que has decidido guardar
            </p>
          </div>
          
          <div className="text-center px-4 py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 font-sans mb-4">
              Aún no has registrado ningún ahorro.<br />
              Empieza hoy a construir tu futuro financiero.
            </p>
            <p className="text-xs text-green-600 font-sans">
              💡 Tip: Incluso $10.000 al mes pueden hacer la diferencia
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-xl bg-white shadow-soft p-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
            Resumen de ahorro
          </h3>
          <p className="text-xs text-gray-500 font-sans">
            Tu progreso general con el dinero que has decidido guardar
          </p>
        </div>

        {/* Barra de progreso de ahorros con marcas temporales */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-dark font-sans">Progreso de ahorro</span>
            <span className="text-xs text-gray-500 font-sans">
              Total a ahorrar: {formatCurrency(totalSavings)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-sans">
              Guardado: {porcentajePagado}% ({formatCurrency(paidSavings)})
            </span>
            <span className="text-xs text-gray-500 font-sans">
              {temporalMarks.length > 0 && (
                <>Desde {formatMonthYear(temporalMarks[0])}</>
              )}
            </span>
          </div>
          
          <div className="relative min-h-[40px]">
            {/* Progress bar container */}
            <div className="relative w-full h-3 bg-[#f0f0ec] rounded-full overflow-hidden">
              {/* Pagado (verde) */}
              <div 
                className="absolute left-0 top-0 h-3 bg-green-primary transition-all duration-300"
                style={{ width: `${porcentajePagado}%` }}
              ></div>
              
              {/* Ahorro vencido (rojo), si aplica */}
              {tieneVencimientos && porcentajeVencido > 0 && (
                <div 
                  className="absolute top-0 h-3 bg-error-bg transition-all duration-300"
                  style={{ 
                    left: `${porcentajePagado}%`, 
                    width: `${porcentajeVencido}%` 
                  }}
                ></div>
              )}
              
              {/* Badge flotante con porcentaje */}
              {porcentajePagado > 0 && (
                <div 
                  className="absolute -top-6 transform -translate-x-1/2 text-xs px-2 py-0.5 bg-green-primary text-white rounded-full shadow-sm font-sans"
                  style={{ left: `${Math.min(Math.max(porcentajePagado, 10), 90)}%` }}
                >
                  {porcentajePagado}%
                </div>
              )}
            </div>

            {/* Responsive temporal marks with flex distribution */}
            {temporalMarks.length > 0 && (
              <div className="relative mt-1">
                <div className="flex justify-between items-end px-4">
                  {temporalMarks.map((mark, index) => {
                    const isFirst = index === 0
                    const isLast = index === temporalMarks.length - 1
                    
                    return (
                      <div 
                        key={index}
                        className="flex flex-col items-center z-10"
                      >
                        <div className="w-[1px] h-[14px] bg-[#DADADA]"></div>
                        <span className={`text-[10px] text-[#A0A0A0] mt-1 font-sans leading-none max-w-[50px] truncate ${
                          isFirst ? 'text-left' : isLast ? 'text-right' : 'text-center'
                        }`}>
                          {formatMonthYear(mark)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Indicador de ahorro vencido */}
          {tieneVencimientos && (
            <p className="text-xs text-error-red mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3 h-3" /> 
              Falta por guardar ({formatCurrency(overdueSavings)})
            </p>
          )}
        </div>

        {/* Current month info */}
        {currentMonthSavings > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-sans">
              Este mes has ahorrado {formatCurrency(currentMonthSavings)} 
              {currentMonthIncome > 0 && (
                <span className="text-green-600 font-medium">
                  {' '}({savingsPercentageOfIncome.toFixed(1)}% de tus ingresos)
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-transparent">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark">Mis ahorros</h2>
          <p className="text-sm text-green-dark">Revisa y organiza aquí tus transacciones de ahorro</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Resumen de ahorro */}
          <ResumenAhorro />
          
          {/* Tabla de transacciones de ahorro */}
          <TablaAhorros />
        </div>
      </div>
    </div>
  )
} 