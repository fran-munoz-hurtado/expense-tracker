// Dashboard Table Utilities
// Centraliza la lógica de obtención de totales, pagados, pendientes y porcentaje para cualquier tipo de columna
// Facilita el mantenimiento y la extensión de la tabla de Panorama General

import { Transaction } from '@/lib/supabase'

export type ColumnType = 'recurrent' | 'non_recurrent' | 'income' | 'total'

export interface ColumnStats {
  total: number
  paid: number
  pending: number
  overdue: number
}

/**
 * Obtiene los totales, pagados, pendientes y vencidos para un tipo de columna en un mes.
 * @param transactions - Transacciones del mes
 * @param type - Tipo de columna ('recurrent', 'non_recurrent', 'income', 'total')
 * @param isDateOverdue - Función para determinar si una fecha está vencida
 */
export function getMonthlyColumnStats(
  transactions: Transaction[],
  type: ColumnType,
  isDateOverdue: (deadline: string) => boolean
): ColumnStats {
  let filtered = transactions
  if (type === 'recurrent') filtered = transactions.filter(t => t.type === 'expense' && t.source_type === 'recurrent')
  else if (type === 'non_recurrent') filtered = transactions.filter(t => t.type === 'expense' && t.source_type === 'non_recurrent')
  else if (type === 'income') filtered = transactions.filter(t => t.type === 'income')
  // 'total' usa todas las transacciones del mes (gastos)
  
  const total = filtered.reduce((sum, t) => sum + t.value, 0)
  const paid = filtered.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
  const pending = filtered.filter(t => {
    if (t.status !== 'pending') return false
    if (!t.deadline) return true
    return !isDateOverdue(t.deadline)
  }).reduce((sum, t) => sum + t.value, 0)
  const overdue = filtered.filter(t => {
    if (t.status !== 'pending') return false
    if (!t.deadline) return false
    return isDateOverdue(t.deadline)
  }).reduce((sum, t) => sum + t.value, 0)

  return { total, paid, pending, overdue }
}

/**
 * Calcula el porcentaje pagado respecto al total.
 */
export function getPercentage(paid: number, total: number): number {
  if (total === 0) return 0
  return Math.round((paid / total) * 100)
} 