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
  Trophy,
  LucideIcon
} from 'lucide-react'

// Movement type configuration
export const MOVEMENT_TYPES = {
  // Expense types
  RECURRENT_EXPENSE: {
    key: 'recurrent_expense',
    icon: Repeat,
    label: 'Obligación recurrente',
    description: 'Pagos que se repiten cada mes (arriendo, servicios, suscripciones)',
    color: 'expense' as const,
    category: 'expense' as const,
    source_type: 'recurrent' as const,
    type: 'expense' as const,
  },
  SINGLE_EXPENSE: {
    key: 'single_expense',
    icon: 'TICKET_TAG' as any, // Using custom icon
    label: 'Gasto único',
    description: 'Pago que ocurre una sola vez',
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
    description: 'Ingresos que se repiten cada mes',
    color: 'income' as const,
    category: 'income' as const,
    source_type: 'recurrent' as const,
    type: 'income' as const,
  },
  SINGLE_INCOME: {
    key: 'single_income',
    icon: 'TICKET_TAG' as any, // Using custom icon
    label: 'Ingreso único',
    description: 'Ingreso que ocurre una sola vez',
    color: 'income' as const,
    category: 'income' as const,
    source_type: 'non_recurrent' as const,
    type: 'income' as const,
  },
  
  // Goal types
  GOAL: {
    key: 'goal',
    icon: Target,
    label: 'Meta o compromiso temporal',
    description: 'Pagos con fecha de finalización (créditos, objetivos, proyectos)',
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
    description: 'Dinero que reservas para el futuro',
    color: 'balance' as const,
    category: 'savings' as const,
    source_type: 'non_recurrent' as const,
    type: 'expense' as const,
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
  // Goal/Target icon (custom SVG) - Simplified to 2 concentric circles
  GOAL_TARGET: {
    viewBox: "0 0 20 20",
    paths: [
      { type: 'circle', cx: '10', cy: '10', r: '8', stroke: 'currentColor', strokeWidth: '2.5', fill: '#fef3c7' },
      { type: 'circle', cx: '10', cy: '10', r: '3', stroke: 'currentColor', strokeWidth: '2.5', fill: '#fef3c7' },
    ]
  },
  
  // Savings trophy icon (custom SVG) - Elegant trophy with star
  SAVINGS_TROPHY: {
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "2",
    fill: "none",
    paths: [
      // Trophy cup structure
      { type: 'path', d: 'M6 9H4a2 2 0 00-2 2v1a2 2 0 002 2h2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M20 9h-2a2 2 0 00-2 2v1a2 2 0 002 2h2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M8 21l8 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 17l0 4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M6 5h12l-1 2H7l-1-2z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      // Small star in the center
      { type: 'path', d: 'M12 10l0.5 1.5h1.5l-1.2 0.9 0.5 1.5-1.3-0.9-1.3 0.9 0.5-1.5-1.2-0.9h1.5z', fill: 'currentColor', strokeWidth: '1' },
    ]
  },
  
  // Savings pig icon (custom SVG)
  SAVINGS_PIG: {
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "2",
    fill: "none",
    paths: [
      // Moneda - círculo exterior mucho más grande y centrado
      { type: 'circle', cx: '12', cy: '12', r: '10.25', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5' },
      
      // Trébol de 3 hojas más grande y sólido
      // Hoja izquierda
      { type: 'circle', cx: '8.5', cy: '11', r: '2.5', fill: 'currentColor', stroke: '#22c55e', strokeWidth: '1.2' },
      
      // Hoja derecha
      { type: 'circle', cx: '15.5', cy: '11', r: '2.5', fill: 'currentColor', stroke: '#22c55e', strokeWidth: '1.2' },
      
      // Hoja superior
      { type: 'circle', cx: '12', cy: '7.5', r: '2.5', fill: 'currentColor', stroke: '#22c55e', strokeWidth: '1.2' },
      
      // Tallo más corto
      { type: 'line', x1: '12', y1: '12.5', x2: '12', y2: '15', stroke: '#22c55e', strokeWidth: '1.8', strokeLinecap: 'round' },
    ]
  },
  
  // Ticket/Tag icon for single movements
  TICKET_TAG: {
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "2",
    fill: "none",
    paths: [
      // Etiqueta principal - forma de casa invertida simétrica con todas las esquinas suavizadas
      { type: 'path', d: 'M5 4 Q5 1 7 1 L17 1 Q19 1 19 4 L19 16 Q19 17 18 17 Q15 20 12 22 Q9 20 6 17 Q5 17 5 16 Z', fill: 'currentColor', stroke: 'currentColor', strokeWidth: '1.5' },
      
      // Agujero redondo en la parte superior
      { type: 'circle', cx: '12', cy: '5', r: '1.5', fill: 'white', stroke: 'white', strokeWidth: '0.5' },
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