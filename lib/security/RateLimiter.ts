import { APP_CONFIG } from '../config/constants'

/**
 * Rate limit configuration interface
 */
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean // Skip counting successful requests
  skipFailedRequests?: boolean // Skip counting failed requests
  keyGenerator?: (identifier: string) => string // Custom key generator
  handler?: (identifier: string, limit: RateLimitConfig) => void // Custom handler
}

/**
 * Rate limit entry interface
 */
interface RateLimitEntry {
  count: number
  resetTime: number
  blockedUntil?: number
}

/**
 * Security event interface
 */
interface SecurityEvent {
  type: 'rate_limit_exceeded' | 'suspicious_activity' | 'blocked_ip' | 'failed_auth'
  identifier: string
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Advanced rate limiter with security features
 */
export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>()
  private blockedIdentifiers = new Set<string>()
  private securityEvents: SecurityEvent[] = []
  private readonly cleanupInterval: number
  private cleanupTimer?: NodeJS.Timeout

  constructor(cleanupInterval: number = 60000) { // 1 minute default
    this.cleanupInterval = cleanupInterval
    this.startCleanupTimer()
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string, config: RateLimitConfig): {
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  } {
    // Check if identifier is blocked
    if (this.blockedIdentifiers.has(identifier)) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: 0,
        retryAfter: this.getBlockedUntil(identifier),
      }
    }

    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset existing one
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      }
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      this.recordSecurityEvent('rate_limit_exceeded', identifier, {
        limit: config.maxRequests,
        window: config.windowMs,
        currentCount: entry.count,
      })

      // Implement progressive blocking
      const blockDuration = this.calculateBlockDuration(identifier, config)
      if (blockDuration > 0) {
        this.blockIdentifier(identifier, blockDuration)
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: entry.resetTime - now,
      }
    }

    // Increment count
    entry.count++
    this.limits.set(key, entry)

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }

  /**
   * Record a request (for tracking purposes)
   */
  recordRequest(identifier: string, success: boolean, config: RateLimitConfig): void {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier
    const entry = this.limits.get(key)

    if (entry) {
      // Update tracking based on config
      if (success && config.skipSuccessfulRequests) {
        // Don't count successful requests
        return
      }

      if (!success && config.skipFailedRequests) {
        // Don't count failed requests
        return
      }

      // Custom handler if provided
      if (config.handler) {
        config.handler(identifier, config)
      }
    }
  }

  /**
   * Block an identifier temporarily
   */
  blockIdentifier(identifier: string, durationMs: number): void {
    const blockedUntil = Date.now() + durationMs
    this.blockedIdentifiers.add(identifier)
    
    this.recordSecurityEvent('blocked_ip', identifier, {
      blockedUntil,
      duration: durationMs,
    })

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIdentifiers.delete(identifier)
    }, durationMs)
  }

  /**
   * Unblock an identifier
   */
  unblockIdentifier(identifier: string): void {
    this.blockedIdentifiers.delete(identifier)
  }

  /**
   * Check if identifier is blocked
   */
  isBlocked(identifier: string): boolean {
    return this.blockedIdentifiers.has(identifier)
  }

  /**
   * Get blocked until time
   */
  getBlockedUntil(identifier: string): number | undefined {
    // This is a simplified implementation
    // In a real system, you'd store the blocked until time
    return this.blockedIdentifiers.has(identifier) ? Date.now() + 300000 : undefined // 5 minutes
  }

  /**
   * Get rate limit status for an identifier
   */
  getStatus(identifier: string, config: RateLimitConfig): {
    current: number
    limit: number
    remaining: number
    resetTime: number
    isBlocked: boolean
  } {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier
    const entry = this.limits.get(key)
    const now = Date.now()

    if (!entry || now > entry.resetTime) {
      return {
        current: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
        isBlocked: this.isBlocked(identifier),
      }
    }

    return {
      current: entry.count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      isBlocked: this.isBlocked(identifier),
    }
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
   * Get blocked identifiers
   */
  getBlockedIdentifiers(): string[] {
    return Array.from(this.blockedIdentifiers)
  }

  /**
   * Clear rate limits for an identifier
   */
  clearLimits(identifier: string, config: RateLimitConfig): void {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier
    this.limits.delete(key)
  }

  /**
   * Clear all rate limits
   */
  clearAllLimits(): void {
    this.limits.clear()
  }

  /**
   * Clear old entries
   */
  clearOldEntries(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoffTime = Date.now() - maxAge

    // Clear old rate limit entries
    for (const [key, entry] of Array.from(this.limits.entries())) {
      if (entry.resetTime < cutoffTime) {
        this.limits.delete(key)
      }
    }

    // Clear old security events
    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoffTime)
  }

  /**
   * Calculate progressive block duration
   */
  private calculateBlockDuration(identifier: string, config: RateLimitConfig): number {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier
    const entry = this.limits.get(key)
    
    if (!entry) return 0

    // Progressive blocking: longer blocks for repeated violations
    const violations = Math.floor(entry.count / config.maxRequests)
    
    if (violations <= 1) return 0 // No blocking for first violation
    if (violations <= 3) return 5 * 60 * 1000 // 5 minutes
    if (violations <= 5) return 15 * 60 * 1000 // 15 minutes
    if (violations <= 10) return 60 * 60 * 1000 // 1 hour
    return 24 * 60 * 60 * 1000 // 24 hours
  }

  /**
   * Record security event
   */
  recordSecurityEvent(type: SecurityEvent['type'], identifier: string, metadata?: Record<string, any>): void {
    this.securityEvents.push({
      type,
      identifier,
      timestamp: Date.now(),
      metadata,
    })

    // Keep only recent events
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-10000)
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.clearOldEntries()
    }, this.cleanupInterval)
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Destroy rate limiter and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.limits.clear()
    this.blockedIdentifiers.clear()
    this.securityEvents = []
  }
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // API endpoints
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },
  
  // File uploads
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Database operations
  DATABASE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // User actions
  USER_ACTION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
} as const

/**
 * Global rate limiter instances
 */
export const globalRateLimiters = {
  api: new RateLimiter(),
  auth: new RateLimiter(),
  upload: new RateLimiter(),
  database: new RateLimiter(),
  userAction: new RateLimiter(),
}

/**
 * Rate limiting middleware decorator
 */
export function rateLimit(config: RateLimitConfig, identifierExtractor?: (args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const limiter = new RateLimiter()

    descriptor.value = function (...args: any[]) {
      const identifier = identifierExtractor ? identifierExtractor(args) : 'default'
      const result = limiter.isAllowed(identifier, config)

      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${Math.ceil(result.retryAfter! / 1000)} seconds.`)
      }

      const methodResult = method.apply(this, args)
      
      if (methodResult instanceof Promise) {
        return methodResult
          .then((resolvedResult) => {
            limiter.recordRequest(identifier, true, config)
            return resolvedResult
          })
          .catch((error) => {
            limiter.recordRequest(identifier, false, config)
            throw error
          })
      } else {
        limiter.recordRequest(identifier, true, config)
        return methodResult
      }
    }

    return descriptor
  }
}

/**
 * Security monitoring decorator
 */
export function monitorSecurity(eventType: SecurityEvent['type']) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = function (...args: any[]) {
      try {
        const result = method.apply(this, args)
        
        if (result instanceof Promise) {
          return result.catch((error) => {
            // Record security event for failed operations
            const identifier = args.find(arg => arg?.id || arg?.email || arg?.ip)?.id || 'unknown'
            globalRateLimiters.api.recordSecurityEvent(eventType, identifier, {
              method: propertyName,
              className: target.constructor.name,
              error: error.message,
            })
            throw error
          })
        } else {
          return result
        }
      } catch (error) {
        // Record security event for synchronous errors
        const identifier = args.find(arg => arg?.id || arg?.email || arg?.ip)?.id || 'unknown'
        globalRateLimiters.api.recordSecurityEvent(eventType, identifier, {
          method: propertyName,
          className: target.constructor.name,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }

    return descriptor
  }
} 