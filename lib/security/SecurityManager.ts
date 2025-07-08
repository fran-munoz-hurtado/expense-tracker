import { APP_CONFIG } from '../config/constants'
import { globalRateLimiters } from './RateLimiter'

/**
 * Security event types
 */
export type SecurityEventType = 
  | 'authentication_failure'
  | 'authorization_violation'
  | 'data_exposure'
  | 'injection_attempt'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'xss_attempt'
  | 'csrf_violation'
  | 'privilege_escalation'
  | 'data_tampering'

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: SecurityEventType
  userId?: number
  ipAddress?: string
  userAgent?: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metadata?: Record<string, any>
  stackTrace?: string
}

/**
 * Input validation rules
 */
export interface ValidationRule {
  type: 'string' | 'number' | 'email' | 'url' | 'regex' | 'custom'
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  customValidator?: (value: any) => boolean
  sanitize?: boolean
}

/**
 * Comprehensive Security Manager
 * Handles all security aspects of the application
 */
export class SecurityManager {
  private static instance: SecurityManager
  private securityEvents: SecurityEvent[] = []
  private blockedIPs = new Set<string>()
  private blockedUsers = new Set<number>()
  private suspiciousPatterns = new Map<string, number>()
  private readonly maxEvents = 10000
  private readonly cleanupInterval = 24 * 60 * 60 * 1000 // 24 hours

  private constructor() {
    this.startCleanupTimer()
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager()
    }
    return SecurityManager.instance
  }

  /**
   * Input sanitization and validation
   */
  sanitizeInput(input: string, rules: ValidationRule[]): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    let sanitized = input

    // Basic XSS prevention
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')

    // SQL Injection prevention
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\b\s+['"]\w+['"]\s*=\s*['"]\w+['"])/gi,
      /(--|\/\*|\*\/|;)/g
    ]

    sqlPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        this.recordSecurityEvent('injection_attempt', {
          input: input,
          pattern: pattern.source,
          sanitized: sanitized
        })
        throw new Error('Invalid input detected')
      }
    })

    // Apply validation rules
    rules.forEach(rule => {
      if (rule.required && !sanitized.trim()) {
        throw new Error('Required field is empty')
      }

      if (rule.minLength && sanitized.length < rule.minLength) {
        throw new Error(`Input too short. Minimum length: ${rule.minLength}`)
      }

      if (rule.maxLength && sanitized.length > rule.maxLength) {
        throw new Error(`Input too long. Maximum length: ${rule.maxLength}`)
      }

      if (rule.pattern && !rule.pattern.test(sanitized)) {
        throw new Error('Input format is invalid')
      }

      if (rule.customValidator && !rule.customValidator(sanitized)) {
        throw new Error('Input validation failed')
      }
    })

    return sanitized
  }

  /**
   * Validate and sanitize user data
   */
  validateUserData(userData: any): any {
    const validationRules = {
      first_name: [
        { type: 'string' as const, required: true, minLength: 1, maxLength: 50 },
        { type: 'regex' as const, pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/ }
      ],
      last_name: [
        { type: 'string' as const, required: true, minLength: 1, maxLength: 50 },
        { type: 'regex' as const, pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/ }
      ],
      username: [
        { type: 'string' as const, required: true, minLength: 3, maxLength: 30 },
        { type: 'regex' as const, pattern: /^[a-zA-Z0-9_]+$/ }
      ],
      email: [
        { type: 'string' as const, required: true },
        { type: 'email' as const }
      ],
      password: [
        { type: 'string' as const, required: true, minLength: 8, maxLength: 128 },
        { 
          type: 'custom' as const, 
          customValidator: (value: string) => {
            // Password strength validation
            const hasUpperCase = /[A-Z]/.test(value)
            const hasLowerCase = /[a-z]/.test(value)
            const hasNumbers = /\d/.test(value)
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value)
            return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
          }
        }
      ]
    }

    const sanitizedData: any = {}

    for (const [field, rules] of Object.entries(validationRules)) {
      if (userData[field] !== undefined) {
        try {
          sanitizedData[field] = this.sanitizeInput(String(userData[field]), rules)
        } catch (error) {
          this.recordSecurityEvent('data_tampering', {
            field,
            value: userData[field],
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          throw new Error(`Invalid ${field}: ${error instanceof Error ? error.message : 'Validation failed'}`)
        }
      }
    }

    return sanitizedData
  }

  /**
   * Validate and sanitize transaction data
   */
  validateTransactionData(transactionData: any): any {
    const validationRules = {
      description: [
        { type: 'string' as const, required: true, minLength: 1, maxLength: 200 },
        { type: 'regex' as const, pattern: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.,!?()]+$/ }
      ],
      value: [
        { 
          type: 'custom' as const, 
          customValidator: (value: any) => {
            const num = Number(value)
            return !isNaN(num) && num >= 0 && num <= 999999999.99
          }
        }
      ],
      year: [
        { 
          type: 'custom' as const, 
          customValidator: (value: any) => {
            const year = Number(value)
            return !isNaN(year) && year >= 1900 && year <= 2100
          }
        }
      ],
      month: [
        { 
          type: 'custom' as const, 
          customValidator: (value: any) => {
            const month = Number(value)
            return !isNaN(month) && month >= 1 && month <= 12
          }
        }
      ]
    }

    const sanitizedData: any = {}

    for (const [field, rules] of Object.entries(validationRules)) {
      if (transactionData[field] !== undefined) {
        try {
          if (field === 'value' || field === 'year' || field === 'month') {
            sanitizedData[field] = Number(transactionData[field])
            if (!rules[0].customValidator!(sanitizedData[field])) {
              throw new Error(`Invalid ${field} value`)
            }
          } else {
            sanitizedData[field] = this.sanitizeInput(String(transactionData[field]), rules)
          }
        } catch (error) {
          this.recordSecurityEvent('data_tampering', {
            field,
            value: transactionData[field],
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          throw new Error(`Invalid ${field}: ${error instanceof Error ? error.message : 'Validation failed'}`)
        }
      }
    }

    return sanitizedData
  }

  /**
   * Authentication security checks
   */
  validateAuthentication(username: string, password: string, ipAddress?: string): void {
    // Check for brute force attempts
    const authKey = `auth_${username}_${ipAddress || 'unknown'}`
    const attempts = this.suspiciousPatterns.get(authKey) || 0

    if (attempts >= 5) {
      this.recordSecurityEvent('authentication_failure', {
        username,
        ipAddress,
        attempts,
        reason: 'Too many failed attempts'
      })
      
      if (ipAddress) {
        this.blockIP(ipAddress, 15 * 60 * 1000) // 15 minutes
      }
      
      throw new Error('Too many failed login attempts. Please try again later.')
    }

    // Validate input
    this.sanitizeInput(username, [
      { type: 'string' as const, required: true, minLength: 3, maxLength: 30 },
      { type: 'regex' as const, pattern: /^[a-zA-Z0-9_]+$/ }
    ])

    this.sanitizeInput(password, [
      { type: 'string' as const, required: true, minLength: 8, maxLength: 128 }
    ])
  }

  /**
   * Authorization checks
   */
  validateAuthorization(userId: number, resourceUserId: number, action: string): void {
    if (userId !== resourceUserId) {
      this.recordSecurityEvent('authorization_violation', {
        userId,
        resourceUserId,
        action,
        severity: 'high'
      })
      throw new Error('Unauthorized access attempt')
    }
  }

  /**
   * Rate limiting with security monitoring
   */
  checkRateLimit(identifier: string, operation: string, ipAddress?: string): boolean {
    const config = globalRateLimiters.userAction
    const result = config.isAllowed(identifier, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    })

    if (!result.allowed) {
      this.recordSecurityEvent('rate_limit_exceeded', {
        identifier,
        operation,
        ipAddress,
        retryAfter: result.retryAfter
      })

      if (ipAddress) {
        this.blockIP(ipAddress, 5 * 60 * 1000) // 5 minutes
      }
    }

    return result.allowed
  }

  /**
   * Block IP address
   */
  blockIP(ipAddress: string, durationMs: number): void {
    this.blockedIPs.add(ipAddress)
    
    this.recordSecurityEvent('suspicious_activity', {
      ipAddress,
      action: 'blocked',
      duration: durationMs,
      severity: 'medium'
    })

    setTimeout(() => {
      this.blockedIPs.delete(ipAddress)
    }, durationMs)
  }

  /**
   * Block user
   */
  blockUser(userId: number, durationMs: number): void {
    this.blockedUsers.add(userId)
    
    this.recordSecurityEvent('suspicious_activity', {
      userId,
      action: 'blocked',
      duration: durationMs,
      severity: 'high'
    })

    setTimeout(() => {
      this.blockedUsers.delete(userId)
    }, durationMs)
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress)
  }

  /**
   * Check if user is blocked
   */
  isUserBlocked(userId: number): boolean {
    return this.blockedUsers.has(userId)
  }

  /**
   * Record security event
   */
  recordSecurityEvent(type: SecurityEventType, metadata?: Record<string, any>): void {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      severity: this.getEventSeverity(type),
      description: this.getEventDescription(type),
      metadata,
      stackTrace: new Error().stack
    }

    this.securityEvents.push(event)

    // Keep only recent events
    if (this.securityEvents.length > this.maxEvents) {
      this.securityEvents = this.securityEvents.slice(-this.maxEvents)
    }

    // Log critical events
    if (event.severity === 'critical') {
      console.error('🚨 CRITICAL SECURITY EVENT:', event)
    } else if (event.severity === 'high') {
      console.warn('⚠️ HIGH SECURITY EVENT:', event)
    }
  }

  /**
   * Get event severity
   */
  private getEventSeverity(type: SecurityEventType): SecurityEvent['severity'] {
    const severityMap: Record<SecurityEventType, SecurityEvent['severity']> = {
      authentication_failure: 'medium',
      authorization_violation: 'high',
      data_exposure: 'critical',
      injection_attempt: 'high',
      rate_limit_exceeded: 'medium',
      suspicious_activity: 'medium',
      xss_attempt: 'high',
      csrf_violation: 'high',
      privilege_escalation: 'critical',
      data_tampering: 'high'
    }

    return severityMap[type]
  }

  /**
   * Get event description
   */
  private getEventDescription(type: SecurityEventType): string {
    const descriptions: Record<SecurityEventType, string> = {
      authentication_failure: 'Authentication attempt failed',
      authorization_violation: 'Unauthorized access attempt',
      data_exposure: 'Sensitive data exposure detected',
      injection_attempt: 'Injection attack attempt detected',
      rate_limit_exceeded: 'Rate limit exceeded',
      suspicious_activity: 'Suspicious activity detected',
      xss_attempt: 'XSS attack attempt detected',
      csrf_violation: 'CSRF violation detected',
      privilege_escalation: 'Privilege escalation attempt',
      data_tampering: 'Data tampering attempt detected'
    }

    return descriptions[type]
  }

  /**
   * Get security events
   */
  getSecurityEvents(timeRange?: { start: number; end: number }): SecurityEvent[] {
    if (!timeRange) {
      return [...this.securityEvents]
    }

    return this.securityEvents.filter(
      event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    )
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number
    criticalEvents: number
    highEvents: number
    mediumEvents: number
    lowEvents: number
    blockedIPs: number
    blockedUsers: number
  } {
    const events = this.securityEvents
    const now = Date.now()
    const last24Hours = events.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000)

    return {
      totalEvents: events.length,
      criticalEvents: last24Hours.filter(e => e.severity === 'critical').length,
      highEvents: last24Hours.filter(e => e.severity === 'high').length,
      mediumEvents: last24Hours.filter(e => e.severity === 'medium').length,
      lowEvents: last24Hours.filter(e => e.severity === 'low').length,
      blockedIPs: this.blockedIPs.size,
      blockedUsers: this.blockedUsers.size
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldEvents()
    }, this.cleanupInterval)
  }

  /**
   * Cleanup old events
   */
  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - this.cleanupInterval
    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoffTime)
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance() 