import { ValidationError } from '../errors/AppError'
import { APP_CONFIG, TRANSACTION_TYPES, TRANSACTION_STATUSES, CATEGORIES, SOURCE_TYPES, USER_STATUSES } from '../config/constants'

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
}

/**
 * Base validator class with common validation methods
 */
export class BaseValidator {
  /**
   * Validate required fields
   */
  static required(value: any, fieldName: string): string | null {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`
    }
    return null
  }

  /**
   * Validate string length
   */
  static stringLength(value: string, fieldName: string, min: number, max: number): string | null {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`
    }
    
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters long`
    }
    
    if (value.length > max) {
      return `${fieldName} must be no more than ${max} characters long`
    }
    
    return null
  }

  /**
   * Validate email format
   */
  static email(value: string, fieldName: string): string | null {
    if (!value) return null // Allow empty if not required
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return `${fieldName} must be a valid email address`
    }
    
    return null
  }

  /**
   * Validate numeric range
   */
  static numericRange(value: number, fieldName: string, min: number, max: number): string | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName} must be a valid number`
    }
    
    if (value < min) {
      return `${fieldName} must be at least ${min}`
    }
    
    if (value > max) {
      return `${fieldName} must be no more than ${max}`
    }
    
    return null
  }

  /**
   * Validate enum values
   */
  static enum(value: any, fieldName: string, allowedValues: readonly string[]): string | null {
    if (!allowedValues.includes(value)) {
      return `${fieldName} must be one of: ${allowedValues.join(', ')}`
    }
    
    return null
  }

  /**
   * Validate date format and range
   */
  static date(value: string, fieldName: string, minDate?: Date, maxDate?: Date): string | null {
    if (!value) return null // Allow empty if not required
    
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return `${fieldName} must be a valid date`
    }
    
    if (minDate && date < minDate) {
      return `${fieldName} must be after ${minDate.toISOString().split('T')[0]}`
    }
    
    if (maxDate && date > maxDate) {
      return `${fieldName} must be before ${maxDate.toISOString().split('T')[0]}`
    }
    
    return null
  }

  /**
   * Validate positive number
   */
  static positiveNumber(value: number, fieldName: string): string | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName} must be a valid number`
    }
    
    if (value <= 0) {
      return `${fieldName} must be a positive number`
    }
    
    return null
  }

  /**
   * Validate array length
   */
  static arrayLength(value: any[], fieldName: string, min: number, max: number): string | null {
    if (!Array.isArray(value)) {
      return `${fieldName} must be an array`
    }
    
    if (value.length < min) {
      return `${fieldName} must have at least ${min} items`
    }
    
    if (value.length > max) {
      return `${fieldName} must have no more than ${max} items`
    }
    
    return null
  }

  /**
   * Validate file size
   */
  static fileSize(file: File, fieldName: string, maxSize: number): string | null {
    if (!file) return null
    
    if (file.size > maxSize) {
      return `${fieldName} must be smaller than ${Math.round(maxSize / 1024 / 1024)}MB`
    }
    
    return null
  }

  /**
   * Validate file type
   */
  static fileType(file: File, fieldName: string, allowedTypes: readonly string[]): string | null {
    if (!file) return null
    
    if (!allowedTypes.includes(file.type)) {
      return `${fieldName} must be one of: ${allowedTypes.join(', ')}`
    }
    
    return null
  }
}

/**
 * User validation rules
 */
export class UserValidator extends BaseValidator {
  /**
   * Validate user registration data
   */
  static validateRegistration(data: any): ValidationResult {
    const errors: Record<string, string[]> = {}

    // First name validation
    const firstNameError = this.required(data.first_name, 'First name') ||
      this.stringLength(data.first_name, 'First name', 1, 50)
    if (firstNameError) {
      errors.first_name = [firstNameError]
    }

    // Last name validation
    const lastNameError = this.required(data.last_name, 'Last name') ||
      this.stringLength(data.last_name, 'Last name', 1, 50)
    if (lastNameError) {
      errors.last_name = [lastNameError]
    }

    // Username validation
    const usernameError = this.required(data.username, 'Username') ||
      this.stringLength(data.username, 'Username', 3, 30)
    if (usernameError) {
      errors.username = [usernameError]
    }

    // Email validation
    const emailError = this.required(data.email, 'Email') ||
      this.email(data.email, 'Email')
    if (emailError) {
      errors.email = [emailError]
    }

    // Password validation
    const passwordError = this.required(data.password, 'Password') ||
      this.stringLength(data.password, 'Password', APP_CONFIG.SECURITY.PASSWORD_MIN_LENGTH, APP_CONFIG.SECURITY.PASSWORD_MAX_LENGTH)
    if (passwordError) {
      errors.password = [passwordError]
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Validate user update data
   */
  static validateUpdate(data: any): ValidationResult {
    const errors: Record<string, string[]> = {}

    // First name validation (optional in updates)
    if (data.first_name !== undefined) {
      const firstNameError = this.stringLength(data.first_name, 'First name', 1, 50)
      if (firstNameError) {
        errors.first_name = [firstNameError]
      }
    }

    // Last name validation (optional in updates)
    if (data.last_name !== undefined) {
      const lastNameError = this.stringLength(data.last_name, 'Last name', 1, 50)
      if (lastNameError) {
        errors.last_name = [lastNameError]
      }
    }

    // Email validation (optional in updates)
    if (data.email !== undefined) {
      const emailError = this.email(data.email, 'Email')
      if (emailError) {
        errors.email = [emailError]
      }
    }

    // Status validation (optional in updates)
    if (data.status !== undefined) {
      const statusError = this.enum(data.status, 'Status', Object.values(USER_STATUSES))
      if (statusError) {
        errors.status = [statusError]
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

/**
 * Transaction validation rules
 */
export class TransactionValidator extends BaseValidator {
  /**
   * Validate transaction creation data
   */
  static validateCreation(data: any): ValidationResult {
    const errors: Record<string, string[]> = {}

    // User ID validation
    const userIdError = this.required(data.user_id, 'User ID') ||
      this.stringLength(data.user_id, 'User ID', 1, 50) // UUID validation
    if (userIdError) {
      errors.user_id = [userIdError]
    }

    // Year validation
    const yearError = this.required(data.year, 'Year') ||
      this.numericRange(data.year, 'Year', 1900, 2100)
    if (yearError) {
      errors.year = [yearError]
    }

    // Month validation
    const monthError = this.required(data.month, 'Month') ||
      this.numericRange(data.month, 'Month', 1, 12)
    if (monthError) {
      errors.month = [monthError]
    }

    // Description validation
    const descriptionError = this.required(data.description, 'Description') ||
      this.stringLength(data.description, 'Description', 1, 255)
    if (descriptionError) {
      errors.description = [descriptionError]
    }

    // Source ID validation
    const sourceIdError = this.required(data.source_id, 'Source ID') ||
      this.positiveNumber(data.source_id, 'Source ID')
    if (sourceIdError) {
      errors.source_id = [sourceIdError]
    }

    // Source type validation
    const sourceTypeError = this.required(data.source_type, 'Source type') ||
      this.enum(data.source_type, 'Source type', Object.values(SOURCE_TYPES))
    if (sourceTypeError) {
      errors.source_type = [sourceTypeError]
    }

    // Value validation
    const valueError = this.required(data.value, 'Value') ||
      this.positiveNumber(data.value, 'Value')
    if (valueError) {
      errors.value = [valueError]
    }

    // Status validation (optional)
    if (data.status !== undefined) {
      const statusError = this.enum(data.status, 'Status', Object.values(TRANSACTION_STATUSES))
      if (statusError) {
        errors.status = [statusError]
      }
    }

    // Type validation (optional)
    if (data.type !== undefined) {
      const typeError = this.enum(data.type, 'Type', Object.values(TRANSACTION_TYPES))
      if (typeError) {
        errors.type = [typeError]
      }
    }

    // Category validation (optional)
    if (data.category !== undefined) {
      const categoryError = this.stringLength(data.category, 'Category', 1, 255)
      if (categoryError) {
        errors.category = [categoryError]
      }
    }

    // Deadline validation (optional)
    if (data.deadline !== undefined && data.deadline !== null) {
      const deadlineError = this.date(data.deadline, 'Deadline')
      if (deadlineError) {
        errors.deadline = [deadlineError]
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Validate transaction update data
   */
  static validateUpdate(data: any): ValidationResult {
    const errors: Record<string, string[]> = {}

    // Description validation (optional in updates)
    if (data.description !== undefined) {
      const descriptionError = this.stringLength(data.description, 'Description', 1, 255)
      if (descriptionError) {
        errors.description = [descriptionError]
      }
    }

    // Value validation (optional in updates)
    if (data.value !== undefined) {
      const valueError = this.positiveNumber(data.value, 'Value')
      if (valueError) {
        errors.value = [valueError]
      }
    }

    // Status validation (optional in updates)
    if (data.status !== undefined) {
      const statusError = this.enum(data.status, 'Status', Object.values(TRANSACTION_STATUSES))
      if (statusError) {
        errors.status = [statusError]
      }
    }

    // Type validation (optional in updates)
    if (data.type !== undefined) {
      const typeError = this.enum(data.type, 'Type', Object.values(TRANSACTION_TYPES))
      if (typeError) {
        errors.type = [typeError]
      }
    }

    // Category validation (optional in updates)
    if (data.category !== undefined) {
      const categoryError = this.stringLength(data.category, 'Category', 1, 255)
      if (categoryError) {
        errors.category = [categoryError]
      }
    }

    // Deadline validation (optional in updates)
    if (data.deadline !== undefined) {
      const deadlineError = this.date(data.deadline, 'Deadline')
      if (deadlineError) {
        errors.deadline = [deadlineError]
      }
    }

    // Notes validation (optional, max 500 chars)
    if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
      const notesError = this.stringLength(data.notes, 'Notes', 0, 500)
      if (notesError) {
        errors.notes = [notesError]
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

/**
 * Expense validation rules
 */
export class ExpenseValidator extends BaseValidator {
  /**
   * Validate recurrent expense creation data
   */
  static validateRecurrentCreation(data: any): ValidationResult {
    const errors: Record<string, string[]> = {}

    // User ID validation
    const userIdError = this.required(data.user_id, 'User ID') ||
      this.stringLength(data.user_id, 'User ID', 1, 50) // UUID validation
    if (userIdError) {
      errors.user_id = [userIdError]
    }

    // Description validation
    const descriptionError = this.required(data.description, 'Description') ||
      this.stringLength(data.description, 'Description', 1, 255)
    if (descriptionError) {
      errors.description = [descriptionError]
    }

    // Month range validation
    const monthFromError = this.required(data.month_from, 'Month from') ||
      this.numericRange(data.month_from, 'Month from', 1, 12)
    if (monthFromError) {
      errors.month_from = [monthFromError]
    }

    const monthToError = this.required(data.month_to, 'Month to') ||
      this.numericRange(data.month_to, 'Month to', 1, 12)
    if (monthToError) {
      errors.month_to = [monthToError]
    }

    // Year range validation
    const yearFromError = this.required(data.year_from, 'Year from') ||
      this.numericRange(data.year_from, 'Year from', 1900, 2100)
    if (yearFromError) {
      errors.year_from = [yearFromError]
    }

    const yearToError = this.required(data.year_to, 'Year to') ||
      this.numericRange(data.year_to, 'Year to', 1900, 2100)
    if (yearToError) {
      errors.year_to = [yearToError]
    }

    // Value validation
    const valueError = this.required(data.value, 'Value') ||
      this.positiveNumber(data.value, 'Value')
    if (valueError) {
      errors.value = [valueError]
    }

    // Payment day deadline validation (optional)
    if (data.payment_day_deadline !== undefined && data.payment_day_deadline !== null) {
      const deadlineError = this.numericRange(data.payment_day_deadline, 'Payment day deadline', 1, 31)
      if (deadlineError) {
        errors.payment_day_deadline = [deadlineError]
      }
    }

    // Type validation (optional)
    if (data.type !== undefined) {
      const typeError = this.enum(data.type, 'Type', Object.values(TRANSACTION_TYPES))
      if (typeError) {
        errors.type = [typeError]
      }
    }

    // Category validation (optional)
    if (data.category !== undefined) {
      const categoryError = this.stringLength(data.category, 'Category', 1, 255)
      if (categoryError) {
        errors.category = [categoryError]
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Validate non-recurrent expense creation data
   */
  static validateNonRecurrentCreation(data: any): ValidationResult {
    const errors: Record<string, string[]> = {}

    // User ID validation
    const userIdError = this.required(data.user_id, 'User ID') ||
      this.stringLength(data.user_id, 'User ID', 1, 50) // UUID validation
    if (userIdError) {
      errors.user_id = [userIdError]
    }

    // Amount validation
    const valueError = this.required(data.value, 'Value') ||
      this.positiveNumber(data.value, 'Value')
    if (valueError) {
      errors.value = [valueError]
    }

    // Description validation
    const descriptionError = this.required(data.description, 'Description') ||
      this.stringLength(data.description, 'Description', 1, 255)
    if (descriptionError) {
      errors.description = [descriptionError]
    }

    // Year validation
    const yearError = this.required(data.year, 'Year') ||
      this.positiveNumber(data.year, 'Year')
    if (yearError) {
      errors.year = [yearError]
    }

    // Month validation
    const monthError = this.required(data.month, 'Month') ||
      this.positiveNumber(data.month, 'Month')
    if (monthError) {
      errors.month = [monthError]
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

/**
 * File upload validation rules
 */
export class FileValidator extends BaseValidator {
  /**
   * Validate file upload
   */
  static validateUpload(file: File, fieldName: string = 'File'): ValidationResult {
    const errors: Record<string, string[]> = {}

    // File size validation
    const sizeError = this.fileSize(file, fieldName, APP_CONFIG.UPLOAD.MAX_FILE_SIZE)
    if (sizeError) {
      errors.size = [sizeError]
    }

    // File type validation
    const typeError = this.fileType(file, fieldName, APP_CONFIG.UPLOAD.ALLOWED_TYPES)
    if (typeError) {
      errors.type = [typeError]
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

/**
 * Validation helper functions
 */
export class ValidationHelper {
  /**
   * Validate and throw validation error if invalid
   */
  static validateAndThrow(result: ValidationResult, message: string = 'Validation failed'): void {
    if (!result.isValid) {
      throw new ValidationError(message, result.errors)
    }
  }

  /**
   * Sanitize input data (remove undefined values)
   */
  static sanitize<T extends Record<string, any>>(data: T): Partial<T> {
    const sanitized: Partial<T> = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        sanitized[key as keyof T] = value
      }
    }
    
    return sanitized
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, pageSize?: number): ValidationResult {
    const errors: Record<string, string[]> = {}

    if (page !== undefined) {
      const pageError = BaseValidator.positiveNumber(page, 'Page')
      if (pageError) {
        errors.page = [pageError]
      }
    }

    if (pageSize !== undefined) {
      const pageSizeError = BaseValidator.numericRange(
        pageSize, 
        'Page size', 
        1, 
        APP_CONFIG.PAGINATION.MAX_PAGE_SIZE
      )
      if (pageSizeError) {
        errors.pageSize = [pageSizeError]
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
} 