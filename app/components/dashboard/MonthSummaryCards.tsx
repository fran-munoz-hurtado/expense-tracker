'use client'

import { memo } from 'react'
import { PiggyBank, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react'

interface MonthSummaryCardsProps {
  monthLabel: string
  year: number
  incomeAmount: number
  expenseAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
  cuantoQueda: number
  isLoading: boolean
  formatCurrency: (value: number) => string
}

function MonthSummaryCardsInner({
  monthLabel,
  year,
  incomeAmount,
  expenseAmount,
  paidAmount,
  pendingAmount,
  overdueAmount,
  cuantoQueda,
  isLoading,
  formatCurrency,
}: MonthSummaryCardsProps) {
  const faltaPagar = pendingAmount
  const tieneVencimientos = overdueAmount > 0
  const displayValue = (v: number) => isLoading ? '—' : formatCurrency(v)

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 w-full">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
          Para el mes de {monthLabel} {year}
        </h3>
        <p className="text-xs text-gray-500 font-sans">
          Estado financiero del mes en curso
        </p>
      </div>
      <div className="hidden sm:grid grid-cols-3 gap-4">
        <div className="bg-[#f8f9f9] border border-[#e0e0e0] rounded-md px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-[#777] font-sans mb-1">
            <PiggyBank className="w-4 h-4 text-gray-400" />
            <span>Ingresos</span>
          </div>
          <p className="text-lg font-medium text-gray-800 font-sans">
            {displayValue(incomeAmount)}
          </p>
        </div>
        <div className="bg-[#f8f9f9] border border-[#e0e0e0] rounded-md px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-[#777] font-sans mb-1">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span>Gastos Totales</span>
          </div>
          <p className="text-lg font-medium text-gray-800 font-sans">
            {displayValue(expenseAmount)}
          </p>
        </div>
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
                Falta pagar {displayValue(faltaPagar)}
              </span>
            ) : (
              <span className="bg-green-primary text-white px-2 py-1 rounded-md text-sm font-sans">
                Pagado {displayValue(paidAmount)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="sm:hidden space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center gap-1 text-xs text-gray-600 font-sans mb-1">
              <PiggyBank className="w-3 h-3 text-gray-400" />
              <span>Ingresos</span>
            </div>
            <p className="text-base font-semibold text-gray-800 font-sans truncate">
              {displayValue(incomeAmount)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center gap-1 text-xs text-gray-600 font-sans mb-1">
              <CreditCard className="w-3 h-3 text-gray-400" />
              <span>Gastos Totales</span>
            </div>
            <p className="text-base font-semibold text-gray-800 font-sans truncate">
              {displayValue(expenseAmount)}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-600 font-sans">
              {faltaPagar > 0 ? (
                <AlertTriangle className="w-3 h-3 text-gray-400" />
              ) : (
                <CheckCircle className="w-3 h-3 text-gray-400" />
              )}
              <span>Estado de pagos</span>
            </div>
            <div>
              {faltaPagar > 0 ? (
                <span className="bg-warning-yellow text-white px-2 py-1 rounded-md text-xs font-sans">
                  Falta pagar {displayValue(faltaPagar)}
                </span>
              ) : (
                <span className="bg-green-primary text-white px-2 py-1 rounded-md text-xs font-sans">
                  Pagado {displayValue(paidAmount)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end mt-4">
        <div className="flex items-center space-x-2">
          {cuantoQueda >= 0 && (
            <>
              <CheckCircle className="w-3 h-3 text-green-primary" />
              <span className="text-green-primary bg-green-light px-2 py-1 rounded-md text-xs font-sans">
                Te quedan {displayValue(cuantoQueda)}
              </span>
            </>
          )}
        </div>
      </div>
      {tieneVencimientos && (
        <p className="text-xs text-error-red mt-2 flex items-center gap-1 font-sans">
          <AlertTriangle className="w-3 h-3" />
          Tienes pagos en mora ({displayValue(overdueAmount)})
        </p>
      )}
    </div>
  )
}

export const MonthSummaryCards = memo(MonthSummaryCardsInner)
