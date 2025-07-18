'use client'

import { useState, useEffect } from 'react'
import { Trophy, AlertTriangle } from 'lucide-react'
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
          
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
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

        {/* Barra de progreso de ahorros (idéntica a ResumenMensual) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-dark font-sans">Progreso de ahorro</span>
            <span className="text-xs text-gray-500 font-sans">
              Guardado: {porcentajePagado}% ({formatCurrency(paidSavings)})
            </span>
          </div>
          
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