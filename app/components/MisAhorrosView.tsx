'use client'

import { useState, useEffect } from 'react'
import { Trophy } from 'lucide-react'
import { type User, type Transaction } from '@/lib/supabase'
import { fetchUserTransactions } from '@/lib/dataUtils'

interface MisAhorrosViewProps {
  user: User
  navigationParams?: any
}

export default function MisAhorrosView({ user, navigationParams }: MisAhorrosViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get current month and year
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Fetch ALL transactions for historical savings data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch transactions for multiple months to get historical data
        const promises = []
        
        // Get last 12 months of data for historical savings
        for (let i = 0; i < 12; i++) {
          let month = currentMonth - i
          let year = currentYear
          
          if (month <= 0) {
            month += 12
            year -= 1
          }
          
          promises.push(fetchUserTransactions(user, month, year))
        }
        
        const results = await Promise.all(promises)
        const allTransactions = results.flat()
        
        setTransactions(allTransactions)
      } catch (err) {
        console.error('Error fetching transactions:', err)
        setError('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, currentMonth, currentYear])

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

  // ResumenAhorro component
  const ResumenAhorro = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center text-red-500">{error}</div>
        </div>
      )
    }

    // Filter savings transactions (historical)
    const savingsTransactions = transactions.filter(t => 
      t.type === 'expense' && t.category === 'Ahorro'
    )

    // Calculate savings stats (same logic as MonthlyProgressBar)
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

    // Calculate percentages
    const percentage = totalSavings > 0 ? Math.round((paidSavings / totalSavings) * 100) : 0
    const totalProgressPercentage = totalSavings > 0 ? Math.round(((paidSavings + overdueSavings) / totalSavings) * 100) : 0
    const hasOverdue = overdueSavings > 0

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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Trophy className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-dark">Resumen de ahorro</h3>
              <p className="text-sm text-green-dark">Tu progreso general con el dinero que has decidido guardar</p>
            </div>
          </div>
          
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Aún no has registrado ningún ahorro.<br />
              Empieza hoy a construir tu futuro financiero.
            </p>
            <p className="text-sm text-green-600">
              💡 Tip: Incluso $10.000 al mes pueden hacer la diferencia
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Trophy className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-dark">Resumen de ahorro</h3>
            <p className="text-sm text-green-dark">Tu progreso general con el dinero que has decidido guardar</p>
          </div>
        </div>

        {/* Progress Bar (same logic as MonthlyProgressBar) */}
        <div className="mb-4">
          <div className="relative">
            {/* Background bar */}
            <div className="w-full h-3 bg-beige rounded-mdplus overflow-hidden shadow-inner relative">
              {/* Progreso pagado (verde) */}
              {paidSavings > 0 && (
                <div
                  className={`absolute left-0 top-0 h-full bg-green-primary transition-all duration-1000 ease-out ${overdueSavings > 0 ? 'rounded-l-mdplus' : 'rounded-mdplus'}`}
                  style={{ width: `${totalSavings > 0 ? (paidSavings / totalSavings) * 100 : 0}%`, zIndex: 1 }}
                />
              )}
              {/* Progreso overdue (rojo) */}
              {overdueSavings > 0 && (
                <div
                  className={`absolute top-0 h-full bg-error-red transition-all duration-1000 ease-out ${paidSavings > 0 ? 'rounded-r-mdplus' : 'rounded-mdplus'}`}
                  style={{ left: `${totalSavings > 0 ? (paidSavings / totalSavings) * 100 : 0}%`, width: `${totalSavings > 0 ? (overdueSavings / totalSavings) * 100 : 0}%`, zIndex: 2 }}
                />
              )}
            </div>
            
            {/* Tooltip de progreso pagado */}
            <div
              className="absolute -top-8 transition-all duration-1000 ease-out"
              style={{
                left: `${totalSavings > 0 ? (paidSavings / totalSavings) * 100 : 0}%`,
                transform: 'translateX(-50%)',
                zIndex: 20
              }}
            >
              <div className="text-white text-xs px-2 py-1 rounded-mdplus shadow-soft font-medium bg-green-primary">
                <div>{percentage}%</div>
                <div className="text-xs opacity-90">{formatCurrency(paidSavings)}</div>
              </div>
              {/* Conditional pointer */}
              {((totalSavings > 0 ? (paidSavings / totalSavings) * 100 : 0) < 98) && (
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-green-dark mx-auto"></div>
              )}
            </div>
            
            {/* Overdue tooltip */}
            {hasOverdue && (
              <div
                className="absolute -top-8 transition-all duration-1000 ease-out"
                style={{
                  left: `${Math.min(totalProgressPercentage, 95)}%`,
                  transform: 'translateX(-50%)',
                  zIndex: 10
                }}
              >
                <div className="bg-error-red text-white text-xs px-2 py-1 rounded-mdplus shadow-soft font-medium">
                  <div>{totalProgressPercentage}%</div>
                  <div className="text-xs opacity-90">{formatCurrency(paidSavings + overdueSavings)}</div>
                </div>
                {totalProgressPercentage < 98 && (
                  <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-error-red mx-auto"></div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress text */}
        <div className="mb-4">
          <p className="text-sm text-gray-dark font-medium">
            Guardado: {percentage}% ({formatCurrency(paidSavings)} de {formatCurrency(totalSavings)})
          </p>
          
          {/* Overdue warning */}
          {hasOverdue && (
            <p className="text-sm text-error-red mt-1 font-medium">
              ⚠️ Falta por guardar {formatCurrency(overdueSavings)}
            </p>
          )}
        </div>

        {/* Current month info */}
        {currentMonthSavings > 0 && (
          <div className="bg-green-50 rounded-lg p-3 mt-4">
            <p className="text-sm text-gray-dark">
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
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark">Mis ahorros</h2>
          <p className="text-sm text-green-dark">Revisa y organiza aquí tus transacciones de ahorro</p>
        </div>

        {/* Resumen de ahorro */}
        <ResumenAhorro />
      </div>
    </div>
  )
} 