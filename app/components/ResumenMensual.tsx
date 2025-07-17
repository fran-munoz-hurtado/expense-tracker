'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { type Transaction, type User } from '@/lib/supabase'
import { fetchUserTransactions } from '@/lib/dataUtils'
import { texts } from '@/lib/translations'

interface ResumenMensualProps {
  user: User
}

export default function ResumenMensual({ user }: ResumenMensualProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get current month and year
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Fetch transactions for current month
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const monthTransactions = await fetchUserTransactions(user, currentMonth, currentYear)
        setTransactions(monthTransactions)
      } catch (err) {
        console.error('Error fetching transactions:', err)
        setError('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, currentMonth, currentYear])

  // Calculate financial metrics
  const totalIngresos = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.value, 0)

  const totalGastos = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.value, 0)

  const totalPagado = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.value, 0)

  const faltaPagar = totalGastos - totalPagado
  const porcentajePagado = totalGastos > 0 ? Math.round((totalPagado / totalGastos) * 100) : 0
  const cuantoQueda = totalIngresos - totalGastos

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

  if (loading) {
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

  if (error) {
    return (
      <div className="rounded-xl bg-white shadow-soft p-4">
        <div className="text-center text-error-red font-sans">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Ingresos */}
        <div className="text-center">
          <p className="text-xs text-gray-dark font-sans mb-1">Ingresos</p>
          <p className="text-base font-medium text-[#5b87ba] font-sans">
            {formatCurrency(totalIngresos)}
          </p>
        </div>

        {/* Gastos Totales */}
        <div className="text-center">
          <p className="text-xs text-gray-dark font-sans mb-1">Gastos Totales</p>
          <p className="text-base font-medium text-error-red font-sans">
            {formatCurrency(totalGastos)}
          </p>
        </div>

        {/* Ya pagado */}
        <div className="text-center">
          <p className="text-xs text-gray-dark font-sans mb-1">Ya pagado</p>
          <p className="text-base font-medium text-green-primary font-sans">
            {formatCurrency(totalPagado)}
          </p>
        </div>

        {/* Falta pagar */}
        <div className="text-center">
          <p className="text-xs text-gray-dark font-sans mb-1">Falta pagar</p>
          <p className="text-base font-medium text-warning-yellow font-sans">
            {formatCurrency(faltaPagar)}
          </p>
        </div>
      </div>

      {/* Fila inferior: Indicadores generales */}
      <div className="space-y-3">
        {/* Barra de progreso de pagos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-dark font-sans">Progreso de pagos</span>
            <span className="text-xs text-gray-500 font-sans">
              Pagado: {porcentajePagado}%
            </span>
          </div>
          
          <div className="relative w-full h-3 bg-[#f0f0ec] rounded-full">
            <div 
              className="absolute left-0 h-3 bg-green-primary rounded-full transition-all duration-300"
              style={{ width: `${porcentajePagado}%` }}
            ></div>
            
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
        </div>

        {/* Estado de balance */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-dark font-sans">Balance del mes</span>
          
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