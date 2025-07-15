/**
 * Centralized icon configuration for the application
 * This file contains all icon definitions used throughout the app
 * Icons are organized by movement type and can be easily modified
 */

import { 
  Repeat, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Target,
  PiggyBank,
  Wallet,
  Calendar,
  Plus,
  Minus,
  LucideIcon
} from 'lucide-react'

// Movement type configuration
export const MOVEMENT_TYPES = {
  // Expense types
  RECURRENT_EXPENSE: {
    key: 'recurrent_expense',
    icon: Repeat,
    label: 'Gasto recurrente',
    description: 'Gastos que se repiten mensualmente',
    color: 'expense' as const,
    category: 'expense' as const,
    source_type: 'recurrent' as const,
    type: 'expense' as const,
  },
  SINGLE_EXPENSE: {
    key: 'single_expense',
    icon: FileText,
    label: 'Gasto único',
    description: 'Gastos que ocurren una sola vez',
    color: 'expense' as const,
    category: 'expense' as const,
    source_type: 'non_recurrent' as const,
    type: 'expense' as const,
  },
  
  // Income types
  RECURRENT_INCOME: {
    key: 'recurrent_income',
    icon: Repeat,
    label: 'Ingreso recurrente',
    description: 'Ingresos que se repiten mensualmente',
    color: 'income' as const,
    category: 'income' as const,
    source_type: 'recurrent' as const,
    type: 'income' as const,
  },
  SINGLE_INCOME: {
    key: 'single_income',
    icon: FileText,
    label: 'Ingreso único',
    description: 'Ingresos que ocurren una sola vez',
    color: 'income' as const,
    category: 'income' as const,
    source_type: 'non_recurrent' as const,
    type: 'income' as const,
  },
  
  // Goal types
  GOAL: {
    key: 'goal',
    icon: Target,
    label: 'Meta',
    description: 'Objetivos de ahorro o gasto',
    color: 'goal' as const,
    category: 'goal' as const,
    source_type: 'recurrent' as const,
    type: 'expense' as const,
  },
  
  // Savings types
  SAVINGS: {
    key: 'savings',
    icon: PiggyBank,
    label: 'Ahorro',
    description: 'Dinero guardado para el futuro',
    color: 'balance' as const,
    category: 'savings' as const,
    source_type: 'non_recurrent' as const,
    type: 'income' as const,
  },
} as const

// Status icons
export const STATUS_ICONS = {
  PAID: {
    icon: CheckCircle,
    color: 'green-600',
    bgColor: 'green-100',
    textColor: 'green-800',
  },
  PENDING: {
    icon: AlertCircle,
    color: 'yellow-600',
    bgColor: 'yellow-100',
    textColor: 'yellow-800',
  },
  OVERDUE: {
    icon: AlertCircle,
    color: 'red-600',
    bgColor: 'red-100',
    textColor: 'red-800',
  },
} as const

// Custom SVG icon configurations (props for creating SVG elements)
export const CUSTOM_ICONS = {
  // Goal/Target icon (custom SVG)
  GOAL_TARGET: {
    viewBox: "0 0 20 20",
    paths: [
      { type: 'circle', cx: '10', cy: '10', r: '8', stroke: '#713f12', strokeWidth: '2', fill: '#FEF9C3' },
      { type: 'circle', cx: '10', cy: '10', r: '4', stroke: '#713f12', strokeWidth: '2', fill: 'white' },
      { type: 'circle', cx: '10', cy: '10', r: '1.5', fill: '#713f12' },
    ]
  },
  
  // Savings pig icon (custom SVG)
  SAVINGS_PIG: {
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "2",
    fill: "none",
    paths: [
      { type: 'ellipse', cx: '12', cy: '14', rx: '7', ry: '4', fill: 'currentColor', fillOpacity: '0.1' },
      { type: 'circle', cx: '12', cy: '8', r: '4', fill: 'currentColor', fillOpacity: '0.1' },
      { type: 'ellipse', cx: '12', cy: '9', rx: '1.5', ry: '1', fill: 'currentColor', fillOpacity: '0.2' },
      { type: 'path', d: 'M9 6l-1-2 M15 6l1-2' },
      { type: 'path', d: 'M7 17v2 M17 17v2 M9 17v2 M15 17v2' },
      { type: 'rect', x: '11', y: '4', width: '2', height: '0.5', fill: 'currentColor' },
      { type: 'circle', cx: '16', cy: '6', r: '1.5', fill: 'currentColor', fillOpacity: '0.3' },
    ]
  },
  
  // Navigation/external link icon
  EXTERNAL_LINK: {
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "2",
    fill: "none",
    paths: [
      { type: 'path', d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' }
    ]
  },
} as const

// Types for TypeScript support
export type MovementType = keyof typeof MOVEMENT_TYPES
export type StatusType = keyof typeof STATUS_ICONS
export type CustomIconType = keyof typeof CUSTOM_ICONS

export type MovementTypeConfig = {
  key: string
  icon: LucideIcon
  label: string
  description: string
  color: string
  category: string
  source_type: 'recurrent' | 'non_recurrent'
  type: 'expense' | 'income'
}

// Helper functions
export function getMovementIcon(type: MovementType): LucideIcon {
  return MOVEMENT_TYPES[type].icon
}

export function getMovementConfig(type: MovementType): MovementTypeConfig {
  return MOVEMENT_TYPES[type]
}

export function getStatusIcon(status: StatusType): LucideIcon {
  return STATUS_ICONS[status].icon
}

export function getStatusConfig(status: StatusType) {
  return STATUS_ICONS[status]
}

// Helper function to get movement type from transaction data
export function getMovementTypeFromTransaction(transaction: {
  type: 'expense' | 'income'
  source_type: 'recurrent' | 'non_recurrent'
  isgoal?: boolean
}): MovementType {
  if (transaction.isgoal) {
    return 'GOAL'
  }
  
  if (transaction.type === 'expense') {
    return transaction.source_type === 'recurrent' ? 'RECURRENT_EXPENSE' : 'SINGLE_EXPENSE'
  } else {
    return transaction.source_type === 'recurrent' ? 'RECURRENT_INCOME' : 'SINGLE_INCOME'
  }
}

// Helper function to determine if transaction is a goal
export function isGoalTransaction(transaction: {
  source_type: 'recurrent' | 'non_recurrent'
  type: 'expense' | 'income'
  source_id: number
}, recurrentGoalMap: Record<number, boolean>): boolean {
  return transaction.source_type === 'recurrent' && 
         transaction.type === 'expense' && 
         recurrentGoalMap[transaction.source_id]
}

// All movement types as array for iteration
export const ALL_MOVEMENT_TYPES = Object.values(MOVEMENT_TYPES) as MovementTypeConfig[]

// Movement types grouped by category
export const MOVEMENT_TYPES_BY_CATEGORY = {
  expense: [MOVEMENT_TYPES.RECURRENT_EXPENSE, MOVEMENT_TYPES.SINGLE_EXPENSE],
  income: [MOVEMENT_TYPES.RECURRENT_INCOME, MOVEMENT_TYPES.SINGLE_INCOME],
  goal: [MOVEMENT_TYPES.GOAL],
  savings: [MOVEMENT_TYPES.SAVINGS],
} as const 