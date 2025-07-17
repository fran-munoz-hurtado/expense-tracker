/**
 * Centralized color configuration for the application
 * This file contains all color definitions used throughout the app
 * Colors are organized by semantic meaning and can be easily modified
 */

export const APP_COLORS = {
  // Nuevo esquema de colores para el navbar
  navbar: {
    primary: '#006414',      // Verde oscuro principal
    secondary: '#005011',    // Verde más oscuro para hover
    light: '#4ade80',        // Verde claro para acentos
    medium: '#22c55e',       // Verde medio
    dark: '#15803d',         // Verde oscuro alternativo
    border: '#166534',       // Verde para bordes
    text: '#dcfce7',         // Verde muy claro para texto
    textSecondary: '#bbf7d0', // Verde claro para texto secundario
    bg: '#006414',           // Fondo principal
    bgGradient: 'from-green-600 to-green-800',
    icon: '#4ade80',         // Verde claro para iconos
    hover: '#005011',        // Verde más oscuro para hover
    accent: '#22c55e',       // Verde de acento
  },
  // Nuevo esquema de colores para el sidebar
  sidebar: {
    primary: '#009929',      // Verde principal para sidebar
    secondary: '#007a1f',    // Verde más oscuro para hover
    light: '#4ade80',        // Verde claro para acentos
    medium: '#22c55e',       // Verde medio
    dark: '#15803d',         // Verde oscuro alternativo
    border: '#166534',       // Verde para bordes
    text: '#ffffff',         // Texto blanco
    textSecondary: '#dcfce7', // Verde claro para texto secundario
    bg: '#009929',           // Fondo principal
    bgGradient: 'from-green-500 to-green-600',
    icon: '#ffffff',         // Blanco para iconos
    hover: '#007a1f',        // Verde más oscuro para hover
    accent: '#22c55e',       // Verde de acento
    activeBg: '#dcfce7',     // Fondo para elemento activo
    activeText: '#15803d',   // Texto para elemento activo
    activeBorder: '#22c55e', // Borde para elemento activo
  },
  income: {
    primary: 'blue-600',
    secondary: 'blue-700',
    light: 'blue-100', // Cambio de blue-50 a blue-100 para que sea más oscuro que el fondo bg-blue-50
    medium: 'blue-200',
    dark: 'blue-900',
    border: 'blue-200',
    text: 'blue-700',
    bg: 'blue-50',
    bgGradient: 'from-blue-50 to-blue-100',
    icon: 'blue-700',
  },
  expense: {
    primary: 'yellow-700',
    secondary: 'yellow-800',
    light: 'yellow-100',
    medium: 'yellow-200',
    dark: 'yellow-900',
    border: 'yellow-300',
    text: 'yellow-800',
    bg: 'yellow-100',
    bgGradient: 'from-yellow-100 to-yellow-200',
    icon: 'yellow-700',
  },
  balance: {
    primary: 'green-600',
    secondary: 'green-700',
    light: 'green-100', // Cambio de blue-50 a green-100 para que sea más oscuro que el fondo bg-green-50
    medium: 'green-200',
    dark: 'green-900',
    border: 'green-200',
    text: 'green-900',
    bg: 'white',
    bgGradient: 'bg-white',
    icon: 'green-700',
  },
  status: {
    paid: {
      bg: 'blue-100',
      text: 'blue-800',
      border: 'blue-200',
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
      bg: 'blue-600',
      hover: 'blue-700',
      text: 'white',
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-600 to-blue-700',
    },
  },
  icon: {
    income: 'blue-600',
    expense: 'red-500',
    balance: 'blue-600',
    success: 'blue-600',
    warning: 'yellow-400',
    error: 'red-500',
    info: 'sky-500',
  },
  filter: {
    active: {
      bg: 'white',
      text: 'blue-600',
      border: 'blue-200',
    },
    inactive: {
      bg: 'transparent',
      text: 'slate-500',
      hover: 'slate-700',
      hoverBg: 'slate-100',
    },
  },
  modal: {
    success: {
      bg: 'blue-100',
      text: 'blue-800',
      border: 'blue-200',
      icon: 'blue-600',
    },
    warning: {
      bg: 'yellow-100',
      text: 'yellow-800',
      border: 'yellow-200',
      icon: 'yellow-400',
    },
    info: {
      bg: 'blue-100',
      text: 'blue-800',
      border: 'blue-200',
      icon: 'blue-600',
    },
  },
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