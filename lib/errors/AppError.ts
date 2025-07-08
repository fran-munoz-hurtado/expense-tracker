import { ERROR_CODES, HTTP_STATUS_CODES, type ErrorCode } from '../config/constants'

/**
 * Custom application error class with structured error handling
 * Provides consistent error responses across the application
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly timestamp: Date
  public readonly context?: Record<string, any>
  public readonly originalError?: Error

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    statusCode: number = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message)
    
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.timestamp = new Date()
    this.context = context
    this.originalError = originalError

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp.toISOString(),
        ...(this.context && { context: this.context }),
        ...(process.env.NODE_ENV === 'development' && this.originalError && {
          originalError: {
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        })
      }
    }
  }

  /**
   * Create authentication error
   */
  static authentication(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      HTTP_STATUS_CODES.UNAUTHORIZED,
      true,
      context
    )
  }

  /**
   * Create authorization error
   */
  static authorization(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
      HTTP_STATUS_CODES.FORBIDDEN,
      true,
      context
    )
  }

  /**
   * Create validation error
   */
  static validation(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      HTTP_STATUS_CODES.BAD_REQUEST,
      true,
      context
    )
  }

  /**
   * Create not found error
   */
  static notFound(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.DB_RECORD_NOT_FOUND,
      HTTP_STATUS_CODES.NOT_FOUND,
      true,
      context
    )
  }

  /**
   * Create conflict error
   */
  static conflict(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.DB_DUPLICATE_RECORD,
      HTTP_STATUS_CODES.CONFLICT,
      true,
      context
    )
  }

  /**
   * Create rate limit error
   */
  static rateLimit(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.BUSINESS_RATE_LIMIT_EXCEEDED,
      HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
      true,
      context
    )
  }

  /**
   * Create database error
   */
  static database(message: string, originalError?: Error, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.DB_QUERY_ERROR,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      true,
      context,
      originalError
    )
  }

  /**
   * Create upload error
   */
  static upload(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.UPLOAD_FAILED,
      HTTP_STATUS_CODES.BAD_REQUEST,
      true,
      context
    )
  }

  /**
   * Create business logic error
   */
  static business(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.BUSINESS_INVALID_OPERATION,
      HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
      true,
      context
    )
  }

  /**
   * Create internal server error
   */
  static internal(message: string, originalError?: Error, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      false, // Not operational
      context,
      originalError
    )
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Handle and log errors appropriately
   */
  static handle(error: Error | AppError, context?: Record<string, any>): void {
    if (error instanceof AppError) {
      // Log operational errors at info level
      if (error.isOperational) {
        console.info('Operational error:', {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          context: { ...context, ...error.context },
          timestamp: error.timestamp,
        })
      } else {
        // Log non-operational errors at error level
        console.error('Non-operational error:', {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          context: { ...context, ...error.context },
          timestamp: error.timestamp,
          stack: error.stack,
          originalError: error.originalError,
        })
      }
    } else {
      // Handle unexpected errors
      console.error('Unexpected error:', {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date(),
      })
    }
  }

  /**
   * Convert any error to AppError
   */
  static normalize(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return AppError.internal(
        error.message,
        error
      )
    }

    return AppError.internal(
      'An unknown error occurred',
      undefined,
      { originalError: error }
    )
  }

  /**
   * Check if error is operational
   */
  static isOperational(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational
    }
    return false
  }

  /**
   * Create error response for API
   */
  static createErrorResponse(error: Error | AppError): any {
    const normalizedError = this.normalize(error)
    return normalizedError.toJSON()
  }
}

/**
 * Async error wrapper for better error handling
 */
export const asyncHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const appError = ErrorHandler.normalize(error)
      ErrorHandler.handle(appError)
      throw appError
    }
  }
}

/**
 * Validation error builder
 */
export class ValidationError extends AppError {
  public readonly fields: Record<string, string[]>

  constructor(message: string, fields: Record<string, string[]>, context?: Record<string, any>) {
    super(
      message,
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
      true,
      context
    )
    this.fields = fields
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp.toISOString(),
        fields: this.fields,
        ...(this.context && { context: this.context }),
      }
    }
  }
} 