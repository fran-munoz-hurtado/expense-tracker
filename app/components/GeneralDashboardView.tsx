import { useState, useEffect } from 'react'
import { supabase, type User } from '@/lib/supabase'
import { texts } from '@/lib/translations'
import { useRouter, useSearchParams } from 'next/navigation'

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Available years for selection - same as expense creation form
const availableYears = [2025]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
}

interface GeneralDashboardViewProps {
  onNavigateToMonth: (month: number, year: number) => void
  user: User
  navigationParams?: { month?: number; year?: number } | null
}

export default function GeneralDashboardView({ onNavigateToMonth, user, navigationParams }: GeneralDashboardViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [selectedYear, setSelectedYear] = useState(availableYears[0])
  const [monthlyData, setMonthlyData] = useState<{ 
    month: number, 
    recurrent: number, 
    nonRecurrent: number,
    recurrentPaid: number,
    nonRecurrentPaid: number
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sync with URL parameters
  useEffect(() => {
    const yearFromUrl = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    if (yearFromUrl && yearFromUrl !== selectedYear) {
      setSelectedYear(yearFromUrl)
    }
  }, [searchParams])

  // Remove the problematic useEffect that was causing navigation cycles
  // The parent component (app/page.tsx) now handles URL updates through the navigation service

  useEffect(() => {
    fetchMonthlyData()
  }, [selectedYear, user])

  async function fetchMonthlyData() {
    setLoading(true)
    setError(null)
    try {
      // Fetch all transactions for the selected year with status
      const { data, error } = await supabase
        .from('transactions')
        .select('month, source_type, value, status')
        .eq('user_id', user.id)
        .eq('year', selectedYear)

      if (error) throw error

      // Aggregate totals by month and type
      const result: { 
        [month: number]: { 
          recurrent: number, 
          nonRecurrent: number,
          recurrentPaid: number,
          nonRecurrentPaid: number
        } 
      } = {}
      
      for (let i = 1; i <= 12; i++) {
        result[i] = { 
          recurrent: 0, 
          nonRecurrent: 0,
          recurrentPaid: 0,
          nonRecurrentPaid: 0
        }
      }
      
      for (const row of data || []) {
        if (row.source_type === 'recurrent') {
          result[row.month].recurrent += row.value
          if (row.status === 'paid') {
            result[row.month].recurrentPaid += row.value
          }
        } else if (row.source_type === 'non_recurrent') {
          result[row.month].nonRecurrent += row.value
          if (row.status === 'paid') {
            result[row.month].nonRecurrentPaid += row.value
          }
        }
      }
      
      setMonthlyData(
        Object.entries(result).map(([month, vals]) => ({
          month: Number(month),
          recurrent: vals.recurrent,
          nonRecurrent: vals.nonRecurrent,
          recurrentPaid: vals.recurrentPaid,
          nonRecurrentPaid: vals.nonRecurrentPaid
        }))
      )
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  function getPercentageColor(percentage: number, month: number): string {
    if (percentage === 100) return 'text-green-600'
    
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    
    if (selectedYear === currentYear && month === currentMonth) {
      return 'text-blue-600'
    } else if (selectedYear > currentYear || (selectedYear === currentYear && month > currentMonth)) {
      return 'text-gray-400'
    } else {
      return 'text-red-600'
    }
  }

  function calculatePercentage(paid: number, total: number): number {
    if (total === 0) return 0
    return Math.round((paid / total) * 100)
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{texts.allExpenses}</h1>
        <p className="text-gray-600 mt-2">{texts.yearlySummary}</p>
      </div>
      <div className="mb-6 flex items-center gap-4">
        <label className="block text-sm font-medium text-gray-700 mr-2">{texts.date}</label>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.month}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.recurrent}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.nonRecurrent}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.totalBalance}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">{texts.loading}</td></tr>
            ) : (
              monthlyData.map(row => {
                const totalAmount = row.recurrent + row.nonRecurrent
                
                return (
                  <tr key={row.month}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => onNavigateToMonth(row.month, selectedYear)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {months[row.month - 1]}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-gray-900 font-semibold">{formatCurrency(row.recurrent)}</span>
                      <span className={`ml-2 text-xs ${getPercentageColor(calculatePercentage(row.recurrentPaid, row.recurrent), row.month)} font-semibold`}>
                        ({calculatePercentage(row.recurrentPaid, row.recurrent)}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-gray-900 font-semibold">{formatCurrency(row.nonRecurrent)}</span>
                      <span className={`ml-2 text-xs ${getPercentageColor(calculatePercentage(row.nonRecurrentPaid, row.nonRecurrent), row.month)} font-semibold`}>
                        ({calculatePercentage(row.nonRecurrentPaid, row.nonRecurrent)}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-gray-900 font-bold">{formatCurrency(totalAmount)}</span>
                      <span className={`ml-2 text-xs ${getPercentageColor(calculatePercentage(row.recurrentPaid + row.nonRecurrentPaid, totalAmount), row.month)} font-semibold`}>
                        ({calculatePercentage(row.recurrentPaid + row.nonRecurrentPaid, totalAmount)}%)
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">{texts.loading}</div>
        ) : (
          monthlyData.map(row => {
            const totalAmount = row.recurrent + row.nonRecurrent
            const recurrentPercentage = calculatePercentage(row.recurrentPaid, row.recurrent)
            const nonRecurrentPercentage = calculatePercentage(row.nonRecurrentPaid, row.nonRecurrent)
            const totalPercentage = calculatePercentage(row.recurrentPaid + row.nonRecurrentPaid, totalAmount)
            
            return (
              <div key={row.month} className="bg-white rounded-lg shadow-sm border p-4 mobile-card">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => onNavigateToMonth(row.month, selectedYear)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-lg"
                  >
                    {months[row.month - 1]}
                  </button>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
                    <div className={`text-sm ${getPercentageColor(totalPercentage, row.month)} font-semibold`}>
                      {totalPercentage}% {texts.paid}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{texts.recurrent}:</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatCurrency(row.recurrent)}</div>
                      <div className={`text-xs ${getPercentageColor(recurrentPercentage, row.month)}`}>
                        {recurrentPercentage}% {texts.paid}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{texts.nonRecurrent}:</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatCurrency(row.nonRecurrent)}</div>
                      <div className={`text-xs ${getPercentageColor(nonRecurrentPercentage, row.month)}`}>
                        {nonRecurrentPercentage}% {texts.paid}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
} 