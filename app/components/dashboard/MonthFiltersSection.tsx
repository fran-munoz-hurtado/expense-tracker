'use client'

import { memo } from 'react'
import { Plus } from 'lucide-react'
import { texts } from '@/lib/translations'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const AVAILABLE_YEARS = Array.from({ length: 16 }, (_, i) => 2025 + i)

interface MonthFiltersSectionProps {
  selectedMonth: number
  selectedYear: number
  onMonthYearChange: (year: number, month: number) => void
  onAddExpense?: () => void
}

function MonthFiltersSectionInner({ selectedMonth, selectedYear, onMonthYearChange, onAddExpense }: MonthFiltersSectionProps) {
  return (
    <div className="rounded-xl bg-white shadow-soft p-6 border-b border-gray-100">
      <div className="hidden sm:flex items-center justify-center">
        <div className="inline-flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 font-sans">Año</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => onMonthYearChange(Number(e.target.value), selectedMonth)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-primary focus:border-green-primary transition-all duration-200 appearance-none cursor-pointer hover:border-green-primary text-sm text-gray-dark font-sans min-w-[80px]"
              >
                {AVAILABLE_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="w-px h-6 bg-gray-300" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 font-sans">Mes</label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => onMonthYearChange(selectedYear, Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-primary focus:border-green-primary transition-all duration-200 appearance-none cursor-pointer hover:border-green-primary text-sm text-gray-dark font-sans min-w-[120px]"
              >
                {MONTHS.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="w-px h-6 bg-gray-300" />
          <button
            onClick={() => onMonthYearChange(new Date().getFullYear(), new Date().getMonth() + 1)}
            className="px-3 py-1.5 bg-green-primary text-white rounded-md text-sm font-medium hover:bg-green-dark transition-colors duration-200 font-sans"
          >
            Mes Actual
          </button>
          {onAddExpense && (
            <>
              <div className="w-px h-6 bg-gray-300" />
              <button
                onClick={onAddExpense}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-primary text-white rounded-md text-sm font-medium hover:bg-green-dark transition-colors duration-200 font-sans"
                aria-label={texts.addTransaction}
              >
                <Plus className="h-4 w-4" />
                {texts.addTransaction}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="sm:hidden flex flex-col w-full max-w-xs mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Año</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => onMonthYearChange(Number(e.target.value), selectedMonth)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-primary focus:border-green-primary transition-all duration-200 appearance-none cursor-pointer hover:border-green-primary text-sm text-gray-dark font-sans"
              >
                {AVAILABLE_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Mes</label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => onMonthYearChange(selectedYear, Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-green-primary focus:border-green-primary transition-all duration-200 appearance-none cursor-pointer hover:border-green-primary text-sm text-gray-dark font-sans"
              >
                {MONTHS.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => onMonthYearChange(new Date().getFullYear(), new Date().getMonth() + 1)}
          className="w-full px-4 py-2 bg-green-primary text-white rounded-md text-sm font-medium hover:bg-green-dark transition-colors duration-200 font-sans"
        >
          Mes Actual
        </button>
        {onAddExpense && (
          <button
            onClick={onAddExpense}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-primary text-white rounded-md text-sm font-medium hover:bg-green-dark transition-colors duration-200 font-sans"
            aria-label={texts.addTransaction}
          >
            <Plus className="h-4 w-4" />
            {texts.addTransaction}
          </button>
        )}
      </div>
    </div>
  )
}

export const MonthFiltersSection = memo(MonthFiltersSectionInner)
