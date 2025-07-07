'use client'

import { useState, useEffect } from 'react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User } from '@/lib/supabase'
import { texts } from '@/lib/translations'

interface DebugTestProps {
  user: User
}

export default function DebugTest({ user }: DebugTestProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function fetchAllData() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Fetch all data for the current user
      const [transactionsResult, recurrentResult, nonRecurrentResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('recurrent_expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('non_recurrent_expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ])

      if (transactionsResult.error) throw transactionsResult.error
      if (recurrentResult.error) throw recurrentResult.error
      if (nonRecurrentResult.error) throw nonRecurrentResult.error

      setTransactions(transactionsResult.data || [])
      setRecurrentExpenses(recurrentResult.data || [])
      setNonRecurrentExpenses(nonRecurrentResult.data || [])
      
      setSuccess(`Cargados ${transactionsResult.data?.length || 0} movimientos, ${recurrentResult.data?.length || 0} gastos recurrentes, ${nonRecurrentResult.data?.length || 0} gastos no recurrentes`)
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  async function deleteAllData() {
    if (!confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esto no se puede deshacer.')) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Delete all data for the current user
      const [transactionsResult, recurrentResult, nonRecurrentResult] = await Promise.all([
        supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id),
        supabase
          .from('recurrent_expenses')
          .delete()
          .eq('user_id', user.id),
        supabase
          .from('non_recurrent_expenses')
          .delete()
          .eq('user_id', user.id)
      ])

      if (transactionsResult.error) throw transactionsResult.error
      if (recurrentResult.error) throw recurrentResult.error
      if (nonRecurrentResult.error) throw nonRecurrentResult.error

      setTransactions([])
      setRecurrentExpenses([])
      setNonRecurrentExpenses([])
      
      setSuccess('Todos los datos eliminados exitosamente')
    } catch (err: any) {
      setError(err.message || 'Error al eliminar datos')
    } finally {
      setLoading(false)
    }
  }

  async function testDatabaseConnection() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Test basic connection by fetching user data
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setSuccess(`Conexión a la base de datos exitosa. Usuario: ${data.username}`)
    } catch (err: any) {
      setError(`Error de conexión a la base de datos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Depuración y Pruebas</h1>
        <p className="text-gray-600 mt-2">Herramientas de prueba y limpieza de base de datos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={testDatabaseConnection}
          disabled={loading}
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <h3 className="font-semibold text-blue-900">Probar Conexión</h3>
          <p className="text-sm text-blue-700 mt-1">Probar conectividad de base de datos</p>
        </button>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <h3 className="font-semibold text-green-900">Cargar Todos los Datos</h3>
          <p className="text-sm text-green-700 mt-1">Obtener todos los datos del usuario</p>
        </button>

        <button
          onClick={deleteAllData}
          disabled={loading}
          className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <h3 className="font-semibold text-red-900">Eliminar Todos los Datos</h3>
          <p className="text-sm text-red-700 mt-1">Limpiar todos los datos del usuario</p>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-medium text-red-800">{texts.errorOccurred}</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Éxito</h3>
          <p className="mt-1 text-sm text-green-700">{success}</p>
        </div>
      )}

      {loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{texts.loading}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{texts.transactions} ({transactions.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.map(transaction => (
              <div key={transaction.id} className="p-3 bg-gray-50 rounded border text-sm">
                <div className="font-medium">{transaction.description}</div>
                <div className="text-gray-600">
                  {transaction.month}/{transaction.year} - ${transaction.value} - {transaction.status}
                </div>
                <div className="text-xs text-gray-500">
                  Source: {transaction.source_type} (ID: {transaction.source_id})
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{texts.recurrent} ({recurrentExpenses.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recurrentExpenses.map(expense => (
              <div key={expense.id} className="p-3 bg-gray-50 rounded border text-sm">
                <div className="font-medium">{expense.description}</div>
                <div className="text-gray-600">
                  ${expense.value} - {expense.month_from}/{expense.year_from} to {expense.month_to}/{expense.year_to}
                </div>
                {expense.payment_day_deadline && (
                  <div className="text-xs text-gray-500">
                    Due day: {expense.payment_day_deadline}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{texts.nonRecurrent} ({nonRecurrentExpenses.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nonRecurrentExpenses.map(expense => (
              <div key={expense.id} className="p-3 bg-gray-50 rounded border text-sm">
                <div className="font-medium">{expense.description}</div>
                <div className="text-gray-600">
                  ${expense.value} - {expense.month}/{expense.year}
                </div>
                {expense.payment_deadline && (
                  <div className="text-xs text-gray-500">
                    Due: {expense.payment_deadline}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 