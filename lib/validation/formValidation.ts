/**
 * Centralized form validation system for movement forms
 * Integrates existing validation logic with new enhancements
 */

import { MovementType } from '@/lib/config/icons'
import { CATEGORIES } from '@/lib/config/constants'

// Form configuration for each movement type
export const FORM_CONFIGS = {
  RECURRENT_EXPENSE: {
    formType: 'recurrent' as const,
    showCategorySelector: true,
    defaultCategory: null,
    isgoal: false,
    type: 'expense' as const,
  },
  SINGLE_EXPENSE: {
    formType: 'non_recurrent' as const,
    showCategorySelector: true,
    defaultCategory: null,
    isgoal: false,
    type: 'expense' as const,
  },
  RECURRENT_INCOME: {
    formType: 'recurrent' as const,
    showCategorySelector: false,
    defaultCategory: 'income',
    isgoal: false,
    type: 'income' as const,
  },
  SINGLE_INCOME: {
    formType: 'non_recurrent' as const,
    showCategorySelector: false,
    defaultCategory: 'income',
    isgoal: false,
    type: 'income' as const,
  },
  GOAL: {
    formType: 'recurrent' as const,
    showCategorySelector: true,
    defaultCategory: null,
    isgoal: true,
    type: 'expense' as const,
  },
  SAVINGS: {
    formType: 'recurrent' as const,
    showCategorySelector: false,
    defaultCategory: 'Ahorro',
    isgoal: false,
    type: 'expense' as const,
  },
} as const

// Validation rules
export const VALIDATION_RULES = {
  description: {
    minLength: 3,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.,!?()]+$/,
    required: true,
  },
  value: {
    min: 1000,
    max: 100000000,
    required: true,
    integersOnly: true,
  },
  years: {
    min: 2020,
    max: 2030,
    required: true,
  },
  months: {
    min: 1,
    max: 12,
    required: true,
  },
  paymentDay: {
    min: 1,
    max: 31,
    required: false,
    smartDayLogic: true,
  },
} as const

// Available years for dropdowns
export const AVAILABLE_YEARS = Array.from(
  { length: VALIDATION_RULES.years.max - VALIDATION_RULES.years.min + 1 },
  (_, i) => VALIDATION_RULES.years.min + i
)

// Available months for dropdowns
export const AVAILABLE_MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

// Validation error types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Form data interfaces
export interface RecurrentFormData {
  description: string
  month_from: number
  month_to: number
  year_from: number
  year_to: number
  value: number
  payment_day_deadline?: number
  category?: string
}

export interface NonRecurrentFormData {
  description: string
  year: number
  month: number
  value: number
  payment_deadline?: string
  category?: string
}

// Currency formatting functions (from existing code)
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
}

export const parseCurrency = (value: string): number => {
  if (!value || value.trim() === '') return 0
  // Remove all non-numeric characters except decimal point
  const cleanValue = value.replace(/[^0-9.]/g, '')
  return parseFloat(cleanValue) || 0
}

export const formatCurrencyForInput = (value: string): string => {
  if (!value || value.trim() === '') return ''
  
  // Allow user to type freely while writing
  // Only format when the value is "complete" (no trailing dots or incomplete numbers)
  if (value.endsWith('.') || value.endsWith(',')) {
    return value
  }
  
  // Remove all non-numeric characters except decimal point
  const cleanValue = value.replace(/[^0-9.]/g, '')
  if (!cleanValue) return ''
  
  const numValue = parseFloat(cleanValue)
  if (isNaN(numValue)) return value // Return original if can't parse
  
  // Only format with thousands separators for whole numbers
  if (cleanValue.includes('.')) {
    return cleanValue // Keep decimal input as-is while typing
  }
  
  // Format with thousands separators only for whole numbers
  return numValue.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

// New function to handle real-time input formatting
export const formatValueForDisplay = (inputValue: string, storedValue: number): string => {
  // If there's an active input value, use it
  if (inputValue !== undefined && inputValue !== null) {
    return inputValue
  }
  
  // If no input value but there's a stored value, format it
  if (storedValue && storedValue > 0) {
    return storedValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }
  
  return ''
}

// Smart day logic - get last valid day of month
export const getLastDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate()
}

export const getValidDayForMonth = (day: number, year: number, month: number): number => {
  const lastDay = getLastDayOfMonth(year, month)
  return Math.min(day, lastDay)
}

// Validation functions
export const validateDescription = (value: string): ValidationError | null => {
  const rules = VALIDATION_RULES.description
  
  if (rules.required && (!value || value.trim() === '')) {
    return {
      field: 'description',
      message: 'La descripción es requerida',
      code: 'REQUIRED'
    }
  }
  
  const trimmedValue = value.trim()
  
  if (trimmedValue.length < rules.minLength) {
    return {
      field: 'description',
      message: `La descripción debe tener al menos ${rules.minLength} caracteres`,
      code: 'MIN_LENGTH'
    }
  }
  
  if (trimmedValue.length > rules.maxLength) {
    return {
      field: 'description',
      message: `La descripción no puede tener más de ${rules.maxLength} caracteres`,
      code: 'MAX_LENGTH'
    }
  }
  
  if (!rules.pattern.test(trimmedValue)) {
    return {
      field: 'description',
      message: 'La descripción contiene caracteres no válidos',
      code: 'INVALID_PATTERN'
    }
  }
  
  return null
}

// Special validation for SAVINGS type - description not required
export const validateDescriptionForSavings = (value: string, isSavings: boolean): ValidationError | null => {
  // If it's SAVINGS type, description is not required
  if (isSavings) {
    return null
  }
  
  // For non-SAVINGS types, use normal validation
  return validateDescription(value)
}

export const validateValue = (value: number): ValidationError | null => {
  const rules = VALIDATION_RULES.value
  
  if (rules.required && (!value || value <= 0)) {
    return {
      field: 'value',
      message: 'El valor es requerido',
      code: 'REQUIRED'
    }
  }
  
  if (value < rules.min) {
    return {
      field: 'value',
      message: `El valor mínimo es ${formatCurrency(rules.min)}`,
      code: 'MIN_VALUE'
    }
  }
  
  if (value > rules.max) {
    return {
      field: 'value',
      message: `El valor máximo es ${formatCurrency(rules.max)}`,
      code: 'MAX_VALUE'
    }
  }
  
  if (rules.integersOnly && value !== Math.floor(value)) {
    return {
      field: 'value',
      message: 'El valor debe ser un número entero',
      code: 'INTEGERS_ONLY'
    }
  }
  
  return null
}

export const validateYear = (value: number): ValidationError | null => {
  const rules = VALIDATION_RULES.years
  
  if (rules.required && !value) {
    return {
      field: 'year',
      message: 'El año es requerido',
      code: 'REQUIRED'
    }
  }
  
  if (value < rules.min || value > rules.max) {
    return {
      field: 'year',
      message: `El año debe estar entre ${rules.min} y ${rules.max}`,
      code: 'OUT_OF_RANGE'
    }
  }
  
  return null
}

export const validateMonth = (value: number): ValidationError | null => {
  const rules = VALIDATION_RULES.months
  
  if (rules.required && !value) {
    return {
      field: 'month',
      message: 'El mes es requerido',
      code: 'REQUIRED'
    }
  }
  
  if (value < rules.min || value > rules.max) {
    return {
      field: 'month',
      message: 'El mes debe estar entre 1 y 12',
      code: 'OUT_OF_RANGE'
    }
  }
  
  return null
}

export const validatePaymentDay = (value: number | undefined, year?: number, month?: number): ValidationError | null => {
  const rules = VALIDATION_RULES.paymentDay
  
  if (!value) {
    return null // Payment day is optional
  }
  
  if (value < rules.min || value > rules.max) {
    return {
      field: 'payment_day_deadline',
      message: `El día de pago debe estar entre ${rules.min} y ${rules.max}`,
      code: 'OUT_OF_RANGE'
    }
  }
  
  // Smart day logic validation
  if (rules.smartDayLogic && year && month) {
    const lastDay = getLastDayOfMonth(year, month)
    if (value > lastDay) {
      return {
        field: 'payment_day_deadline',
        message: `El día ${value} no es válido para ${AVAILABLE_MONTHS[month - 1].label}. Se usará el día ${lastDay}`,
        code: 'SMART_DAY_ADJUSTMENT'
      }
    }
  }
  
  return null
}

export const validatePaymentDeadline = (value: string | undefined): ValidationError | null => {
  if (!value) {
    return null // Payment deadline is optional
  }
  
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return {
      field: 'payment_deadline',
      message: 'La fecha de vencimiento no es válida',
      code: 'INVALID_DATE'
    }
  }
  
  // Allow past dates for historical data migration
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  
  if (date < fiveYearsAgo) {
    return {
      field: 'payment_deadline',
      message: 'La fecha no puede ser mayor a 5 años atrás',
      code: 'TOO_OLD'
    }
  }
  
  return null
}

// Temporal range validation
export const validateTemporalRange = (
  yearFrom: number,
  monthFrom: number,
  yearTo: number,
  monthTo: number
): ValidationError | null => {
  // Convert to comparable format
  const fromDate = yearFrom * 12 + monthFrom
  const toDate = yearTo * 12 + monthTo
  
  if (fromDate > toDate) {
    return {
      field: 'temporal_range',
      message: 'La fecha de inicio debe ser anterior a la fecha de fin',
      code: 'INVALID_RANGE'
    }
  }
  
  // Limit to reasonable ranges (max 5 years)
  const maxRange = 5 * 12 // 5 years in months
  if (toDate - fromDate > maxRange) {
    return {
      field: 'temporal_range',
      message: 'El rango no puede ser mayor a 5 años',
      code: 'RANGE_TOO_LARGE'
    }
  }
  
  return null
}

export const validateCategory = (value: string | undefined, showCategorySelector: boolean): ValidationError | null => {
  if (!showCategorySelector) {
    return null // Category is handled automatically
  }
  
  // Category is mandatory
  if (!value || value.trim() === '') {
    return {
      field: 'category',
      message: 'La categoría es requerida',
      code: 'REQUIRED'
    }
  }
  
  // Simple string validation - no enum restrictions
  if (value.length < 1 || value.length > 255) {
    return {
      field: 'category',
      message: 'La categoría debe tener entre 1 y 255 caracteres',
      code: 'INVALID_LENGTH'
    }
  }
  
  return null
}

// Main validation functions
export const validateRecurrentForm = (data: RecurrentFormData, movementType?: MovementType): ValidationResult => {
  const errors: ValidationError[] = []
  
  // Validate each field
  const descriptionError = validateDescriptionForSavings(data.description, movementType === 'SAVINGS')
  if (descriptionError) errors.push(descriptionError)
  
  const valueError = validateValue(data.value)
  if (valueError) errors.push(valueError)
  
  const yearFromError = validateYear(data.year_from)
  if (yearFromError) errors.push({ ...yearFromError, field: 'year_from' })
  
  const yearToError = validateYear(data.year_to)
  if (yearToError) errors.push({ ...yearToError, field: 'year_to' })
  
  const monthFromError = validateMonth(data.month_from)
  if (monthFromError) errors.push({ ...monthFromError, field: 'month_from' })
  
  const monthToError = validateMonth(data.month_to)
  if (monthToError) errors.push({ ...monthToError, field: 'month_to' })
  
  const paymentDayError = validatePaymentDay(data.payment_day_deadline, data.year_from, data.month_from)
  if (paymentDayError) errors.push(paymentDayError)
  
  // Validate temporal range
  const temporalRangeError = validateTemporalRange(
    data.year_from,
    data.month_from,
    data.year_to,
    data.month_to
  )
  if (temporalRangeError) errors.push(temporalRangeError)
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Extended validation function for goals with installments support
export const validateRecurrentFormWithGoals = (
  data: RecurrentFormData, 
  isGoal: boolean, 
  goalInputMode: 'date_range' | 'installments' = 'date_range',
  installments?: number,
  movementType?: MovementType
): ValidationResult => {
  const errors: ValidationError[] = []
  
  // Validate each field
  const descriptionError = validateDescriptionForSavings(data.description, movementType === 'SAVINGS')
  if (descriptionError) errors.push(descriptionError)
  
  const valueError = validateValue(data.value)
  if (valueError) errors.push(valueError)
  
  const yearFromError = validateYear(data.year_from)
  if (yearFromError) errors.push({ ...yearFromError, field: 'year_from' })
  
  const monthFromError = validateMonth(data.month_from)
  if (monthFromError) errors.push({ ...monthFromError, field: 'month_from' })
  
  const paymentDayError = validatePaymentDay(data.payment_day_deadline, data.year_from, data.month_from)
  if (paymentDayError) errors.push(paymentDayError)
  
  // Goal-specific validation
  if (isGoal && goalInputMode === 'installments') {
    // Validate installments instead of end date
    if (installments !== undefined) {
      const installmentsError = validateInstallments(installments)
      if (installmentsError) errors.push(installmentsError)
    }
  } else {
    // Regular validation for end date
    const yearToError = validateYear(data.year_to)
    if (yearToError) errors.push({ ...yearToError, field: 'year_to' })
    
    const monthToError = validateMonth(data.month_to)
    if (monthToError) errors.push({ ...monthToError, field: 'month_to' })
    
    // Validate temporal range
    const temporalRangeError = validateTemporalRange(
      data.year_from,
      data.month_from,
      data.year_to,
      data.month_to
    )
    if (temporalRangeError) errors.push(temporalRangeError)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateNonRecurrentForm = (data: NonRecurrentFormData): ValidationResult => {
  const errors: ValidationError[] = []
  
  // Validate each field
  const descriptionError = validateDescription(data.description)
  if (descriptionError) errors.push(descriptionError)
  
  const valueError = validateValue(data.value)
  if (valueError) errors.push(valueError)
  
  const yearError = validateYear(data.year)
  if (yearError) errors.push(yearError)
  
  const monthError = validateMonth(data.month)
  if (monthError) errors.push(monthError)
  
  const paymentDeadlineError = validatePaymentDeadline(data.payment_deadline)
  if (paymentDeadlineError) errors.push(paymentDeadlineError)
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper function to get form config
export const getFormConfig = (movementType: MovementType) => {
  return FORM_CONFIGS[movementType]
}

// Helper function to get default form data
export const getDefaultRecurrentFormData = (movementType?: MovementType): RecurrentFormData => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Get default category based on movement type
  let defaultCategory: string | undefined
  if (movementType) {
    const config = getFormConfig(movementType)
    defaultCategory = config.showCategorySelector ? 'Sin categoría' : config.defaultCategory || undefined
  }
  
  return {
    description: '',
    month_from: currentMonth,
    month_to: currentMonth,
    year_from: currentYear,
    year_to: currentYear,
    value: 0,
    payment_day_deadline: undefined,
    category: defaultCategory,
  }
}

export const getDefaultNonRecurrentFormData = (movementType?: MovementType): NonRecurrentFormData => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Get default category based on movement type
  let defaultCategory: string | undefined
  if (movementType) {
    const config = getFormConfig(movementType)
    defaultCategory = config.showCategorySelector ? 'Sin categoría' : config.defaultCategory || undefined
  }
  
  return {
    description: '',
    year: currentYear,
    month: currentMonth,
    value: 0,
    payment_deadline: undefined,
    category: defaultCategory,
  }
}

// Goal-specific utilities for installment calculation
export const calculateEndDateFromInstallments = (
  startMonth: number,
  startYear: number,
  installments: number
): { endMonth: number; endYear: number } => {
  if (installments <= 0) {
    return { endMonth: startMonth, endYear: startYear }
  }
  
  // Calculate total months from start
  const totalMonths = startMonth + installments - 1
  
  // Calculate end year and month
  const endYear = startYear + Math.floor((totalMonths - 1) / 12)
  const endMonth = ((totalMonths - 1) % 12) + 1
  
  return { endMonth, endYear }
}

export const calculateInstallmentsFromDateRange = (
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number
): number => {
  // Convert to total months since year 0
  const startTotalMonths = startYear * 12 + startMonth
  const endTotalMonths = endYear * 12 + endMonth
  
  // Calculate difference
  const installments = endTotalMonths - startTotalMonths + 1
  
  return Math.max(1, installments)
}

export const validateInstallments = (value: number): ValidationError | null => {
  if (!value || value <= 0) {
    return {
      field: 'installments',
      message: 'El número de cuotas debe ser mayor a 0',
      code: 'REQUIRED'
    }
  }
  
  if (value > 240) {
    return {
      field: 'installments',
      message: 'El número de cuotas no puede ser mayor a 240 (20 años)',
      code: 'MAX_INSTALLMENTS'
    }
  }
  
  if (value !== Math.floor(value)) {
    return {
      field: 'installments',
      message: 'El número de cuotas debe ser un número entero',
      code: 'INTEGER_REQUIRED'
    }
  }
  
  return null
}

export const formatInstallmentPreview = (
  startMonth: number,
  startYear: number,
  installments: number
): string => {
  const { endMonth, endYear } = calculateEndDateFromInstallments(startMonth, startYear, installments)
  const endMonthName = AVAILABLE_MONTHS[endMonth - 1]?.label || 'Mes desconocido'
  
  if (installments === 1) {
    return `Meta de 1 cuota (${AVAILABLE_MONTHS[startMonth - 1]?.label} ${startYear})`
  }
  
  return `Meta de ${installments} cuotas (${AVAILABLE_MONTHS[startMonth - 1]?.label} ${startYear} - ${endMonthName} ${endYear})`
} 