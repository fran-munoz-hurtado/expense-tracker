// Categories for expenses and income
export const CATEGORIES = {
  // Expense categories
  FOOD: 'food',
  TRANSPORT: 'transport',
  ENTERTAINMENT: 'entertainment',
  SHOPPING: 'shopping',
  HEALTH: 'health',
  EDUCATION: 'education',
  TRAVEL: 'travel',
  UTILITIES: 'utilities',
  RENT: 'rent',
  INSURANCE: 'insurance',
  SUBSCRIPTIONS: 'subscriptions',
  OTHER: 'other',
  
  // Income categories
  SALARY: 'salary',
  FREELANCE: 'freelance',
  INVESTMENT: 'investment',
  BUSINESS: 'business',
  GIFT: 'gift',
  REFUND: 'refund',
  OTHER_INCOME: 'other_income'
} as const

export type Category = typeof CATEGORIES[keyof typeof CATEGORIES]

// Transaction types
export const TRANSACTION_TYPES = {
  EXPENSE: 'expense',
  INCOME: 'income'
} as const

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]

// Transaction status
export const TRANSACTION_STATUS = {
  PAID: 'paid',
  PENDING: 'pending'
} as const

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS]

// Source types
export const SOURCE_TYPES = {
  RECURRENT: 'recurrent',
  NON_RECURRENT: 'non_recurrent'
} as const

export type SourceType = typeof SOURCE_TYPES[keyof typeof SOURCE_TYPES]

// Category labels for display
export const CATEGORY_LABELS: Record<Category, string> = {
  [CATEGORIES.FOOD]: 'Comida',
  [CATEGORIES.TRANSPORT]: 'Transporte',
  [CATEGORIES.ENTERTAINMENT]: 'Entretenimiento',
  [CATEGORIES.SHOPPING]: 'Compras',
  [CATEGORIES.HEALTH]: 'Salud',
  [CATEGORIES.EDUCATION]: 'Educación',
  [CATEGORIES.TRAVEL]: 'Viajes',
  [CATEGORIES.UTILITIES]: 'Servicios',
  [CATEGORIES.RENT]: 'Alquiler',
  [CATEGORIES.INSURANCE]: 'Seguros',
  [CATEGORIES.SUBSCRIPTIONS]: 'Suscripciones',
  [CATEGORIES.OTHER]: 'Otros',
  [CATEGORIES.SALARY]: 'Salario',
  [CATEGORIES.FREELANCE]: 'Freelance',
  [CATEGORIES.INVESTMENT]: 'Inversiones',
  [CATEGORIES.BUSINESS]: 'Negocios',
  [CATEGORIES.GIFT]: 'Regalos',
  [CATEGORIES.REFUND]: 'Reembolsos',
  [CATEGORIES.OTHER_INCOME]: 'Otros ingresos'
}

// Category colors for UI
export const CATEGORY_COLORS: Record<Category, string> = {
  [CATEGORIES.FOOD]: '#FF6B6B',
  [CATEGORIES.TRANSPORT]: '#4ECDC4',
  [CATEGORIES.ENTERTAINMENT]: '#45B7D1',
  [CATEGORIES.SHOPPING]: '#96CEB4',
  [CATEGORIES.HEALTH]: '#FFEAA7',
  [CATEGORIES.EDUCATION]: '#DDA0DD',
  [CATEGORIES.TRAVEL]: '#98D8C8',
  [CATEGORIES.UTILITIES]: '#F7DC6F',
  [CATEGORIES.RENT]: '#BB8FCE',
  [CATEGORIES.INSURANCE]: '#85C1E9',
  [CATEGORIES.SUBSCRIPTIONS]: '#F8C471',
  [CATEGORIES.OTHER]: '#BDC3C7',
  [CATEGORIES.SALARY]: '#2ECC71',
  [CATEGORIES.FREELANCE]: '#27AE60',
  [CATEGORIES.INVESTMENT]: '#1ABC9C',
  [CATEGORIES.BUSINESS]: '#16A085',
  [CATEGORIES.GIFT]: '#E74C3C',
  [CATEGORIES.REFUND]: '#E67E22',
  [CATEGORIES.OTHER_INCOME]: '#95A5A6'
}

// Default values for new transactions
export const DEFAULT_VALUES = {
  TYPE: TRANSACTION_TYPES.EXPENSE,
  CATEGORY: CATEGORIES.OTHER,
  ISGOAL: false,
  STATUS: TRANSACTION_STATUS.PENDING
} as const 