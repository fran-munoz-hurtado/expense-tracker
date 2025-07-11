// Application Configuration Constants
// This file contains all configuration constants for the application
// Following the principle of configuration as code

export const APP_CONFIG = {
  // Application metadata
  NAME: 'Expense Tracker',
  VERSION: '1.0.0',
  DESCRIPTION: 'Advanced expense tracking application with multi-user support',
  
  // Environment configuration
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // API configuration
  API: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    BATCH_SIZE: 100,
    MAX_CONCURRENT_REQUESTS: 10,
  },
  
  // Database configuration
  DATABASE: {
    MAX_CONNECTIONS: 20,
    CONNECTION_TIMEOUT: 10000,
    QUERY_TIMEOUT: 30000,
    TRANSACTION_TIMEOUT: 60000,
  },
  
  // Cache configuration
  CACHE: {
    TRANSACTIONS_DURATION: 5 * 60 * 1000, // 5 minutes
    USER_DATA_DURATION: 10 * 60 * 1000,   // 10 minutes
    STATS_DURATION: 2 * 60 * 1000,        // 2 minutes
    ATTACHMENTS_DURATION: 15 * 60 * 1000, // 15 minutes
    MAX_SIZE: 1000, // Maximum cache entries
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  },
  
  // Security configuration
  SECURITY: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    JWT_EXPIRES_IN: '24h',
  },
  
  // File upload configuration
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    MAX_FILES_PER_TRANSACTION: 10,
    STORAGE_PATH: '/uploads',
  },
  
  // Pagination configuration
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE: 1,
  },
  
  // Real-time configuration
  REALTIME: {
    EVENTS_PER_SECOND: 10,
    MAX_CONNECTIONS_PER_USER: 5,
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
  },
  
  // Performance configuration
  PERFORMANCE: {
    DEBOUNCE_DELAY: 300, // 300ms
    THROTTLE_DELAY: 100, // 100ms
    LAZY_LOAD_THRESHOLD: 0.1, // 10% of viewport
    VIRTUAL_SCROLL_ITEM_HEIGHT: 60,
  },
  
  // Monitoring configuration
  MONITORING: {
    ENABLE_PERFORMANCE_TRACKING: true,
    ENABLE_ERROR_TRACKING: true,
    ENABLE_USAGE_ANALYTICS: true,
    SAMPLE_RATE: 0.1, // 10% of requests
  },
} as const

// Transaction types
export const TRANSACTION_TYPES = {
  EXPENSE: 'expense',
  INCOME: 'income',
} as const

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]

// Transaction statuses
export const TRANSACTION_STATUSES = {
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
} as const

export type TransactionStatus = typeof TRANSACTION_STATUSES[keyof typeof TRANSACTION_STATUSES]

// Categories with hierarchical structure
export const CATEGORIES = {
  // Income categories
  INCOME: {
    SALARY: 'salary',
    FREELANCE: 'freelance',
    INVESTMENT: 'investment',
    BUSINESS: 'business',
    OTHER_INCOME: 'other_income',
  },
  // Expense categories - 12 Spanish categories
  EXPENSE: {
    ALIMENTACION: 'Alimentación',
    AYUDAS_FAMILIARES: 'Ayudas familiares',
    COMPRAS_PERSONALES: 'Compras personales',
    CREDITOS_DEUDAS: 'Créditos y deudas',
    EDUCACION: 'Educación',
    ENTRETENIMIENTO_OCIO: 'Entretenimiento y ocio',
    GASTOS_VARIOS_IMPREVISTOS: 'Gastos varios o imprevistos',
    SALUD: 'Salud',
    SERVICIOS: 'Servicios',
    SUSCRIPCIONES_PAGOS_DIGITALES: 'Suscripciones y pagos digitales',
    TRANSPORTE: 'Transporte',
    VACACIONES_VIAJES: 'Vacaciones y viajes',
    OTHER_EXPENSE: 'Otro',
  },
} as const

export type Category = 
  | typeof CATEGORIES.INCOME[keyof typeof CATEGORIES.INCOME]
  | typeof CATEGORIES.EXPENSE[keyof typeof CATEGORIES.EXPENSE]

// Source types for transactions
export const SOURCE_TYPES = {
  RECURRENT: 'recurrent',
  NON_RECURRENT: 'non_recurrent',
} as const

export type SourceType = typeof SOURCE_TYPES[keyof typeof SOURCE_TYPES]

// User statuses
export const USER_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const

export type UserStatus = typeof USER_STATUSES[keyof typeof USER_STATUSES]

// Default values
export const DEFAULT_VALUES = {
  USER: {
    STATUS: USER_STATUSES.ACTIVE,
  },
  TRANSACTION: {
    STATUS: TRANSACTION_STATUSES.PENDING,
    TYPE: TRANSACTION_TYPES.EXPENSE,
    CATEGORY: CATEGORIES.EXPENSE.OTHER_EXPENSE,
    ISGOAL: false,
  },
  EXPENSE: {
    TYPE: TRANSACTION_TYPES.EXPENSE,
    CATEGORY: CATEGORIES.EXPENSE.OTHER_EXPENSE,
    ISGOAL: false,
  },
} as const

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  
  // Database errors
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_TRANSACTION_ERROR: 'DB_TRANSACTION_ERROR',
  DB_RECORD_NOT_FOUND: 'DB_RECORD_NOT_FOUND',
  DB_DUPLICATE_RECORD: 'DB_DUPLICATE_RECORD',
  
  // File upload errors
  UPLOAD_FILE_TOO_LARGE: 'UPLOAD_FILE_TOO_LARGE',
  UPLOAD_INVALID_TYPE: 'UPLOAD_INVALID_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Business logic errors
  BUSINESS_INSUFFICIENT_FUNDS: 'BUSINESS_INSUFFICIENT_FUNDS',
  BUSINESS_INVALID_OPERATION: 'BUSINESS_INVALID_OPERATION',
  BUSINESS_RATE_LIMIT_EXCEEDED: 'BUSINESS_RATE_LIMIT_EXCEEDED',
  
  // System errors
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
  SYSTEM_TIMEOUT: 'SYSTEM_TIMEOUT',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// HTTP status codes mapping
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Event types for real-time updates
export const EVENT_TYPES = {
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_UPDATED: 'transaction_updated',
  TRANSACTION_DELETED: 'transaction_deleted',
  EXPENSE_CREATED: 'expense_created',
  EXPENSE_UPDATED: 'expense_updated',
  EXPENSE_DELETED: 'expense_deleted',
  USER_UPDATED: 'user_updated',
  ATTACHMENT_UPLOADED: 'attachment_uploaded',
  ATTACHMENT_DELETED: 'attachment_deleted',
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

// Feature flags for gradual rollout
export const FEATURE_FLAGS = {
  ADVANCED_ANALYTICS: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
  REAL_TIME_NOTIFICATIONS: process.env.FEATURE_REAL_TIME_NOTIFICATIONS === 'true',
  MULTI_CURRENCY: process.env.FEATURE_MULTI_CURRENCY === 'true',
  EXPORT_FUNCTIONALITY: process.env.FEATURE_EXPORT_FUNCTIONALITY === 'true',
  BULK_OPERATIONS: process.env.FEATURE_BULK_OPERATIONS === 'true',
} as const 