import { APP_CONFIG } from '../config/constants'
import { dataProtection } from './DataProtection'
import { securityManager } from './SecurityManager'

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  context?: string
  userId?: number
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  sanitizedMetadata?: Record<string, any>
}

/**
 * Secure Logger
 * Prevents sensitive data exposure and provides secure logging
 */
export class SecureLogger {
  private static instance: SecureLogger
  private logs: LogEntry[] = []
  private readonly maxLogs = 10000
  private readonly sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /session/i,
    /credential/i,
    /api_key/i,
    /private_key/i,
    /jwt/i,
    /bearer/i
  ]

  private constructor() {
    this.interceptConsoleMethods()
  }

  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger()
    }
    return SecureLogger.instance
  }

  /**
   * Intercept console methods to prevent sensitive data exposure
   */
  private interceptConsoleMethods(): void {
    if (typeof window === 'undefined') return

    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    }

    // Override console.log
    console.log = (...args: any[]) => {
      const sanitizedArgs = this.sanitizeConsoleArgs(args)
      if (sanitizedArgs.length > 0) {
        originalConsole.log(...sanitizedArgs)
      }
    }

    // Override console.error
    console.error = (...args: any[]) => {
      const sanitizedArgs = this.sanitizeConsoleArgs(args)
      if (sanitizedArgs.length > 0) {
        originalConsole.error(...sanitizedArgs)
      }
    }

    // Override console.warn
    console.warn = (...args: any[]) => {
      const sanitizedArgs = this.sanitizeConsoleArgs(args)
      if (sanitizedArgs.length > 0) {
        originalConsole.warn(...sanitizedArgs)
      }
    }

    // Override console.info
    console.info = (...args: any[]) => {
      const sanitizedArgs = this.sanitizeConsoleArgs(args)
      if (sanitizedArgs.length > 0) {
        originalConsole.info(...sanitizedArgs)
      }
    }

    // Override console.debug
    console.debug = (...args: any[]) => {
      const sanitizedArgs = this.sanitizeConsoleArgs(args)
      if (sanitizedArgs.length > 0) {
        originalConsole.debug(...sanitizedArgs)
      }
    }
  }

  /**
   * Sanitize console arguments to remove sensitive data
   */
  private sanitizeConsoleArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return this.sanitizeString(arg)
      } else if (typeof arg === 'object' && arg !== null) {
        return this.sanitizeObject(arg)
      }
      return arg
    })
  }

  /**
   * Sanitize string to remove sensitive patterns
   */
  private sanitizeString(str: string): string {
    let sanitized = str

    // Replace sensitive patterns
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    })

    // Replace potential sensitive values
    sanitized = sanitized.replace(/(["'])(password|token|secret|key|auth|session|credential|api_key|private_key|jwt|bearer)\1\s*:\s*["'][^"']*["']/gi, '$1$2$1: "[REDACTED]"')

    return sanitized
  }

  /**
   * Sanitize object to remove sensitive data
   */
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }

    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const isSensitive = this.sensitivePatterns.some(pattern => pattern.test(key))
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value)
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Log message with security checks
   */
  log(level: LogLevel, message: string, metadata?: Record<string, any>, context?: string): void {
    const sanitizedMetadata = metadata ? dataProtection.sanitizeForLogging(metadata) : undefined

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: this.sanitizeString(message),
      context,
      metadata,
      sanitizedMetadata
    }

    this.logs.push(logEntry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Log to console only in development
    if (APP_CONFIG.IS_DEVELOPMENT) {
      const consoleMethod = this.getConsoleMethod(level)
      const logMessage = this.formatLogMessage(logEntry)
      
      if (sanitizedMetadata) {
        consoleMethod(logMessage, sanitizedMetadata)
      } else {
        consoleMethod(logMessage)
      }
    }

    // Record security events for critical logs
    if (level === 'critical' || level === 'error') {
      securityManager.recordSecurityEvent('data_exposure', {
        level,
        message: logEntry.message,
        context
      })
    }
  }

  /**
   * Get console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug':
        return console.debug
      case 'info':
        return console.info
      case 'warn':
        return console.warn
      case 'error':
      case 'critical':
        return console.error
      default:
        return console.log
    }
  }

  /**
   * Format log message
   */
  private formatLogMessage(logEntry: LogEntry): string {
    const timestamp = new Date(logEntry.timestamp).toISOString()
    const levelUpper = logEntry.level.toUpperCase()
    const context = logEntry.context ? ` [${logEntry.context}]` : ''
    
    return `[${timestamp}] ${levelUpper}${context}: ${logEntry.message}`
  }

  /**
   * Debug logging
   */
  debug(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log('debug', message, metadata, context)
  }

  /**
   * Info logging
   */
  info(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log('info', message, metadata, context)
  }

  /**
   * Warning logging
   */
  warn(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log('warn', message, metadata, context)
  }

  /**
   * Error logging
   */
  error(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log('error', message, metadata, context)
  }

  /**
   * Critical logging
   */
  critical(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log('critical', message, metadata, context)
  }

  /**
   * Log user action securely
   */
  logUserAction(userId: number, action: string, metadata?: Record<string, any>): void {
    this.log('info', `User ${userId} performed action: ${action}`, metadata, 'USER_ACTION')
  }

  /**
   * Log authentication events
   */
  logAuthEvent(userId: number, event: string, success: boolean, metadata?: Record<string, any>): void {
    const level = success ? 'info' : 'warn'
    const message = `Authentication ${event} ${success ? 'succeeded' : 'failed'} for user ${userId}`
    
    this.log(level, message, metadata, 'AUTH')
  }

  /**
   * Log data access events
   */
  logDataAccess(userId: number, resource: string, action: string, metadata?: Record<string, any>): void {
    this.log('info', `User ${userId} accessed ${resource} with action: ${action}`, metadata, 'DATA_ACCESS')
  }

  /**
   * Get logs with filtering
   */
  getLogs(options?: {
    level?: LogLevel
    startTime?: number
    endTime?: number
    context?: string
    limit?: number
  }): LogEntry[] {
    let filteredLogs = [...this.logs]

    if (options?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level)
    }

    if (options?.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startTime!)
    }

    if (options?.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endTime!)
    }

    if (options?.context) {
      filteredLogs = filteredLogs.filter(log => log.context === options.context)
    }

    if (options?.limit) {
      filteredLogs = filteredLogs.slice(-options.limit)
    }

    return filteredLogs
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    total: number
    byLevel: Record<LogLevel, number>
    byContext: Record<string, number>
    recentErrors: number
  } {
    const now = Date.now()
    const last24Hours = now - 24 * 60 * 60 * 1000

    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0
    }

    const byContext: Record<string, number> = {}
    let recentErrors = 0

    this.logs.forEach(log => {
      byLevel[log.level]++
      
      if (log.context) {
        byContext[log.context] = (byContext[log.context] || 0) + 1
      }

      if ((log.level === 'error' || log.level === 'critical') && log.timestamp >= last24Hours) {
        recentErrors++
      }
    })

    return {
      total: this.logs.length,
      byLevel,
      byContext,
      recentErrors
    }
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Export logs (sanitized)
   */
  exportLogs(): LogEntry[] {
    return this.logs.map(log => ({
      ...log,
      metadata: log.sanitizedMetadata || log.metadata
    }))
  }
}

// Export singleton instance
export const secureLogger = SecureLogger.getInstance() 