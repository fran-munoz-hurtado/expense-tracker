'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, PiggyBank, CreditCard } from 'lucide-react'
import { type Transaction, type User } from '@/lib/supabase'
import { useTransactionStore } from '@/lib/store/transactionStore'
import { useDataSyncEffect } from '@/lib/hooks/useDataSync'
import { texts } from '@/lib/translations'

interface ResumenMensualProps {
  user: User
}

export default function ResumenMensual({ user }: ResumenMensualProps) {
  // Zustand store
  const { transactions, isLoading, fetchTransactions } = useTransactionStore()

  // Get current month and year
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Initial data fetch using pure Zustand pattern
  useEffect(() => {
    if (user) {
      console.log('[zustand] ResumenMensual: fetchTransactions triggered for', currentMonth, currentYear)
      fetchTransactions({ userId: user.id, year: currentYear, month: currentMonth })
    }
  }, [user, currentYear, currentMonth, fetchTransactions])

  // Data sync effect using pure Zustand pattern
  useDataSyncEffect(() => {
    if (user) {
      console.log('[zustand] ResumenMensual: useDataSyncEffect triggered')
      fetchTransactions({ userId: user.id, year: currentYear, month: currentMonth })
    }
  }, [user, currentYear, currentMonth, fetchTransactions])

  // Filter transactions for current month from Zustand store
  const currentMonthTransactions = transactions.filter(t =>
    t.year === currentYear && t.month === currentMonth
  )

  // Development logging for Zustand transactions
  if (process.env.NODE_ENV === 'development' && !isLoading) {
    console.log('[zustand] ResumenMensual: loaded', currentMonthTransactions.length, 'transactions from Zustand')
  }

  // Calculate financial metrics using filtered transactions
  const totalIngresos = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.value, 0)

  const totalGastos = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.value, 0)

  const totalPagado = currentMonthTransactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.value, 0)

  const faltaPagar = totalGastos - totalPagado
  const porcentajePagado = totalGastos > 0 ? Math.round((totalPagado / totalGastos) * 100) : 0
  const cuantoQueda = totalIngresos - totalGastos

  // Helper function to compare dates without time
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

  // Calculate overdue payments
  const pagosVencidos = currentMonthTransactions.filter(t => 
    t.type === 'expense' && 
    t.status === 'pending' && 
    t.deadline && 
    isDateOverdue(t.deadline)
  )

  const montoVencido = pagosVencidos.reduce((sum, t) => sum + t.value, 0)
  const progresoEsperado = totalGastos > 0 ? Math.round(((totalPagado + montoVencido) / totalGastos) * 100) : 0
  const porcentajeVencido = totalGastos > 0 ? Math.round((montoVencido / totalGastos) * 100) : 0
  const tieneVencimientos = pagosVencidos.length > 0

  // Development logging for calculations
  if (process.env.NODE_ENV === 'development' && !isLoading) {
    console.log('[zustand] ResumenMensual: Calculated totalIngresos, totalGastos, totalPagado, cuantoQueda...', {
      totalIngresos,
      totalGastos, 
      totalPagado,
      cuantoQueda,
      porcentajePagado,
      tieneVencimientos
    })
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

  // Get month name
  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('es-ES', { month: 'long' })
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white shadow-soft p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-5 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white shadow-soft p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
          Resumen de {capitalizedMonth} {currentYear}
        </h3>
        <p className="text-xs text-gray-500 font-sans">
          Estado financiero del mes en curso
        </p>
      </div>

      {/* Fila superior: Resumen de montos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Ingresos */}
        <div className="bg-[#f8f9f9] border border-[#e0e0e0] rounded-md px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-[#777] font-sans mb-1">
            <PiggyBank className="w-4 h-4 text-gray-400" />
            <span>Ingresos</span>
          </div>
          <p className="text-lg font-medium text-gray-800 font-sans">
            {formatCurrency(totalIngresos)}
          </p>
        </div>

        {/* Gastos Totales */}
        <div className="bg-[#f8f9f9] border border-[#e0e0e0] rounded-md px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-[#777] font-sans mb-1">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span>Gastos Totales</span>
          </div>
          <p className="text-lg font-medium text-gray-800 font-sans">
            {formatCurrency(totalGastos)}
          </p>
        </div>

        {/* Estado de pagos */}
        <div className="bg-[#f8f9f9] border border-[#e0e0e0] rounded-md px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-[#777] font-sans mb-1">
            {faltaPagar > 0 ? (
              <AlertTriangle className="w-4 h-4 text-gray-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-gray-400" />
            )}
            <span>Estado de pagos</span>
          </div>
          <div className="flex items-center gap-2">
            {faltaPagar > 0 ? (
              <span className="bg-warning-yellow text-white px-2 py-1 rounded-md text-sm font-sans">
                Falta pagar {formatCurrency(faltaPagar)}
              </span>
            ) : (
              <span className="bg-green-primary text-white px-2 py-1 rounded-md text-sm font-sans">
                Pagado {formatCurrency(totalPagado)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fila inferior: Indicadores generales */}
      <div className="space-y-3">
        {/* Barra de progreso de pagos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-dark font-sans">Progreso de pagos</span>
            <span className="text-xs text-gray-500 font-sans">
              Pagado: {porcentajePagado}% ({formatCurrency(totalPagado)})
            </span>
          </div>
          
          <div className="relative w-full h-3 bg-[#f0f0ec] rounded-full overflow-hidden">
            {/* Pagado (verde) */}
            <div 
              className="absolute left-0 top-0 h-3 bg-green-primary transition-all duration-300"
              style={{ width: `${porcentajePagado}%` }}
            ></div>
            
            {/* Deuda vencida (rojo), si aplica */}
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

          {/* Indicador de mora */}
          {tieneVencimientos && (
            <p className="text-xs text-error-red mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3 h-3" /> 
              Tienes pagos en mora ({formatCurrency(montoVencido)})
            </p>
          )}
        </div>

        {/* Estado de balance */}
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-2">
            {cuantoQueda >= 0 ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-primary" />
                <span className="text-green-primary bg-green-light px-2 py-1 rounded-md text-xs font-sans">
                  Te quedan {formatCurrency(cuantoQueda)}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-error-red" />
                <span className="text-error-red bg-error-bg px-2 py-1 rounded-md text-xs font-sans">
                  Te pasaste por {formatCurrency(Math.abs(cuantoQueda))}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 