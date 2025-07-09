/**
 * Centralized color configuration for the application
 * This file contains all color definitions used throughout the app
 * Colors are organized by semantic meaning and can be easily modified
 */

export const APP_COLORS = {
  // Income-related colors (green/emerald theme)
  income: {
    primary: 'emerald-600',
    secondary: 'emerald-700', 
    light: 'emerald-50',
    medium: 'emerald-100',
    dark: 'emerald-900',
    border: 'emerald-200',
    text: 'emerald-700',
    bg: 'emerald-50',
    bgGradient: 'from-emerald-50 to-emerald-100',
    icon: 'emerald-700',
  },

  // Expense-related colors (red theme)
  expense: {
    primary: 'red-500',
    secondary: 'red-600',
    light: 'red-50',
    medium: 'red-100', 
    dark: 'red-900',
    border: 'red-200',
    text: 'red-700',
    bg: 'red-50',
    bgGradient: 'from-red-50 to-red-100',
    icon: 'red-700',
  },

  // Balance/CuantoQueda colors (blue theme)
  balance: {
    primary: 'blue-600',
    secondary: 'blue-700',
    light: 'blue-50',
    medium: 'blue-100',
    dark: 'blue-900', 
    border: 'blue-200',
    text: 'blue-700',
    bg: 'blue-50',
    bgGradient: 'from-blue-50 to-blue-100',
    icon: 'blue-700',
  },

  // Status colors
  status: {
    paid: {
      bg: 'green-100',
      text: 'green-800',
      border: 'green-200',
    },
    pending: {
      bg: 'yellow-100', 
      text: 'yellow-800',
      border: 'yellow-200',
    },
    overdue: {
      bg: 'red-100',
      text: 'red-800', 
      border: 'red-200',
    },
  },

  // Button colors
  button: {
    primary: {
      bg: 'blue-600',
      hover: 'blue-700',
      text: 'white',
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-600 to-blue-700',
    },
    secondary: {
      bg: 'gray-100',
      hover: 'gray-200',
      text: 'gray-700',
      border: 'gray-300',
    },
    success: {
      bg: 'green-600',
      hover: 'green-700',
      text: 'white',
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'from-green-600 to-green-700',
    },
  },

  // Icon colors
  icon: {
    income: 'green-600',
    expense: 'blue-600',
    balance: 'blue-600',
    success: 'green-600',
    warning: 'yellow-500',
    error: 'red-500',
    info: 'blue-600',
  },

  // Filter colors
  filter: {
    active: {
      bg: 'white',
      text: 'blue-600',
      border: 'blue-200',
    },
    inactive: {
      bg: 'transparent',
      text: 'gray-600',
      hover: 'gray-800',
      hoverBg: 'gray-100',
    },
  },

  // Modal colors
  modal: {
    success: {
      bg: 'green-100',
      text: 'green-800',
      border: 'green-200',
      icon: 'green-600',
    },
    warning: {
      bg: 'yellow-100',
      text: 'yellow-800', 
      border: 'yellow-200',
      icon: 'yellow-600',
    },
    info: {
      bg: 'blue-100',
      text: 'blue-800',
      border: 'blue-200',
      icon: 'blue-600',
    },
  },

  // Goal/Meta colors (special blue theme)
  goal: {
    primary: 'blue-600',
    secondary: 'blue-700',
    light: 'blue-50',
    border: 'blue-200',
    text: 'blue-700',
    icon: 'blue-600',
  },
} as const

/**
 * Helper function to get color classes
 * Usage: getColor('income', 'primary') -> 'emerald-600'
 */
export function getColor(category: keyof typeof APP_COLORS, variant: string): string {
  const categoryColors = APP_COLORS[category] as any
  return categoryColors[variant] || ''
}

/**
 * Helper function to get nested color classes
 * Usage: getNestedColor('filter', 'active', 'bg') -> 'white'
 */
export function getNestedColor(category: keyof typeof APP_COLORS, subcategory: string, variant: string): string {
  const categoryColors = APP_COLORS[category] as any
  const subcategoryColors = categoryColors[subcategory] as any
  return subcategoryColors?.[variant] || ''
}

/**
 * Helper function to get multiple color classes
 * Usage: getColors('income', ['primary', 'text']) -> ['emerald-600', 'emerald-700']
 */
export function getColors(category: keyof typeof APP_COLORS, variants: string[]): string[] {
  return variants.map(variant => getColor(category, variant))
}

/**
 * Helper function to get gradient classes
 * Usage: getGradient('income') -> 'from-emerald-50 to-emerald-100'
 */
export function getGradient(category: keyof typeof APP_COLORS): string {
  const categoryColors = APP_COLORS[category] as any
  return categoryColors.bgGradient || ''
}

/**
 * Helper function to get status colors
 * Usage: getStatusColors('paid') -> { bg: 'green-100', text: 'green-800' }
 */
export function getStatusColors(status: 'paid' | 'pending' | 'overdue') {
  return APP_COLORS.status[status]
} 