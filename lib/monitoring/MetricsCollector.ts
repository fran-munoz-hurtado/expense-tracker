import { APP_CONFIG } from '../config/constants'

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

/**
 * Metric interface
 */
interface Metric {
  name: string
  type: MetricType
  value: number
  timestamp: number
  tags?: Record<string, string>
  metadata?: Record<string, any>
}

/**
 * Performance metric interface
 */
interface PerformanceMetric {
  operation: string
  duration: number
  success: boolean
  timestamp: number
  error?: string
  metadata?: Record<string, any>
}

/**
 * Error metric interface
 */
interface ErrorMetric {
  errorCode: string
  message: string
  stack?: string
  timestamp: number
  context?: Record<string, any>
  userId?: number
  requestId?: string
}

/**
 * User activity metric interface
 */
interface UserActivityMetric {
  userId: number
  action: string
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Advanced metrics collector with performance monitoring and analytics
 */
export class MetricsCollector {
  private metrics: Metric[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private errorMetrics: ErrorMetric[] = []
  private userActivityMetrics: UserActivityMetric[] = []
  private readonly maxMetrics = 10000 // Prevent memory leaks
  private readonly flushInterval: number
  private flushTimer?: NodeJS.Timeout

  constructor(flushInterval: number = 60000) { // 1 minute default
    this.flushInterval = flushInterval
    this.startFlushTimer()
  }

  /**
   * Record a counter metric
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>, metadata?: Record<string, any>): void {
    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value,
      timestamp: Date.now(),
      tags,
      metadata,
    })
  }

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>, metadata?: Record<string, any>): void {
    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: Date.now(),
      tags,
      metadata,
    })
  }

  /**
   * Record a histogram metric
   */
  histogram(name: string, value: number, tags?: Record<string, string>, metadata?: Record<string, any>): void {
    this.recordMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: Date.now(),
      tags,
      metadata,
    })
  }

  /**
   * Record a timer metric
   */
  timer(name: string, duration: number, tags?: Record<string, string>, metadata?: Record<string, any>): void {
    this.recordMetric({
      name,
      type: MetricType.TIMER,
      value: duration,
      timestamp: Date.now(),
      tags,
      metadata,
    })
  }

  /**
   * Record performance metric
   */
  recordPerformance(operation: string, duration: number, success: boolean, error?: string, metadata?: Record<string, any>): void {
    this.performanceMetrics.push({
      operation,
      duration,
      success,
      timestamp: Date.now(),
      error,
      metadata,
    })

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Record error metric
   */
  recordError(errorCode: string, message: string, stack?: string, context?: Record<string, any>, userId?: number, requestId?: string): void {
    this.errorMetrics.push({
      errorCode,
      message,
      stack,
      timestamp: Date.now(),
      context,
      userId,
      requestId,
    })

    // Keep only recent errors
    if (this.errorMetrics.length > this.maxMetrics) {
      this.errorMetrics = this.errorMetrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Record user activity
   */
  recordUserActivity(userId: number, action: string, metadata?: Record<string, any>): void {
    this.userActivityMetrics.push({
      userId,
      action,
      timestamp: Date.now(),
      metadata,
    })

    // Keep only recent activities
    if (this.userActivityMetrics.length > this.maxMetrics) {
      this.userActivityMetrics = this.userActivityMetrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalMetrics: number
    totalPerformanceMetrics: number
    totalErrorMetrics: number
    totalUserActivities: number
    averagePerformance: number
    errorRate: number
    topOperations: Array<{ operation: string; count: number; avgDuration: number }>
    topErrors: Array<{ errorCode: string; count: number }>
    topUserActions: Array<{ action: string; count: number }>
  } {
    const totalMetrics = this.metrics.length
    const totalPerformanceMetrics = this.performanceMetrics.length
    const totalErrorMetrics = this.errorMetrics.length
    const totalUserActivities = this.userActivityMetrics.length

    // Calculate average performance
    const successfulOperations = this.performanceMetrics.filter(m => m.success)
    const averagePerformance = successfulOperations.length > 0
      ? successfulOperations.reduce((sum, m) => sum + m.duration, 0) / successfulOperations.length
      : 0

    // Calculate error rate
    const errorRate = totalPerformanceMetrics > 0
      ? this.performanceMetrics.filter(m => !m.success).length / totalPerformanceMetrics
      : 0

    // Top operations
    const operationStats = new Map<string, { count: number; totalDuration: number }>()
    this.performanceMetrics.forEach(m => {
      const stats = operationStats.get(m.operation) || { count: 0, totalDuration: 0 }
      stats.count++
      stats.totalDuration += m.duration
      operationStats.set(m.operation, stats)
    })

    const topOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top errors
    const errorStats = new Map<string, number>()
    this.errorMetrics.forEach(m => {
      const count = errorStats.get(m.errorCode) || 0
      errorStats.set(m.errorCode, count + 1)
    })

    const topErrors = Array.from(errorStats.entries())
      .map(([errorCode, count]) => ({ errorCode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top user actions
    const actionStats = new Map<string, number>()
    this.userActivityMetrics.forEach(m => {
      const count = actionStats.get(m.action) || 0
      actionStats.set(m.action, count + 1)
    })

    const topUserActions = Array.from(actionStats.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalMetrics,
      totalPerformanceMetrics,
      totalErrorMetrics,
      totalUserActivities,
      averagePerformance,
      errorRate,
      topOperations,
      topErrors,
      topUserActions,
    }
  }

  /**
   * Get metrics by time range
   */
  getMetricsByTimeRange(startTime: number, endTime: number): {
    metrics: Metric[]
    performanceMetrics: PerformanceMetric[]
    errorMetrics: ErrorMetric[]
    userActivityMetrics: UserActivityMetric[]
  } {
    return {
      metrics: this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime),
      performanceMetrics: this.performanceMetrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime),
      errorMetrics: this.errorMetrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime),
      userActivityMetrics: this.userActivityMetrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime),
    }
  }

  /**
   * Get metrics by user
   */
  getMetricsByUser(userId: number): {
    performanceMetrics: PerformanceMetric[]
    errorMetrics: ErrorMetric[]
    userActivityMetrics: UserActivityMetric[]
  } {
    return {
      performanceMetrics: this.performanceMetrics.filter(m => m.metadata?.userId === userId),
      errorMetrics: this.errorMetrics.filter(m => m.userId === userId),
      userActivityMetrics: this.userActivityMetrics.filter(m => m.userId === userId),
    }
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoffTime = Date.now() - maxAge

    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime)
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoffTime)
    this.errorMetrics = this.errorMetrics.filter(m => m.timestamp >= cutoffTime)
    this.userActivityMetrics = this.userActivityMetrics.filter(m => m.timestamp >= cutoffTime)
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    metrics: Metric[]
    performanceMetrics: PerformanceMetric[]
    errorMetrics: ErrorMetric[]
    userActivityMetrics: UserActivityMetric[]
    summary: ReturnType<typeof this.getMetricsSummary>
  } {
    return {
      metrics: [...this.metrics],
      performanceMetrics: [...this.performanceMetrics],
      errorMetrics: [...this.errorMetrics],
      userActivityMetrics: [...this.userActivityMetrics],
      summary: this.getMetricsSummary(),
    }
  }

  /**
   * Record metric internally
   */
  private recordMetric(metric: Metric): void {
    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flushMetrics()
    }, this.flushInterval)
  }

  /**
   * Flush metrics to external systems (placeholder for future implementation)
   */
  private flushMetrics(): void {
    if (APP_CONFIG.MONITORING.ENABLE_USAGE_ANALYTICS) {
      const summary = this.getMetricsSummary()
      
      // Log summary for now (could be sent to external monitoring systems)
      console.info('Metrics Summary:', {
        timestamp: new Date().toISOString(),
        ...summary,
      })
    }
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }
  }

  /**
   * Destroy collector and cleanup resources
   */
  destroy(): void {
    this.stopFlushTimer()
    this.metrics = []
    this.performanceMetrics = []
    this.errorMetrics = []
    this.userActivityMetrics = []
  }
}

/**
 * Global metrics collector instance
 */
export const globalMetrics = new MetricsCollector()

/**
 * Performance monitoring decorator
 */
export function monitorPerformance(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const name = operationName || `${target.constructor.name}.${propertyName}`

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now()
      
      try {
        const result = method.apply(this, args)
        
        if (result instanceof Promise) {
          return result
            .then((resolvedResult) => {
              const duration = performance.now() - startTime
              globalMetrics.recordPerformance(name, duration, true)
              return resolvedResult
            })
            .catch((error) => {
              const duration = performance.now() - startTime
              globalMetrics.recordPerformance(name, duration, false, error.message)
              throw error
            })
        } else {
          const duration = performance.now() - startTime
          globalMetrics.recordPerformance(name, duration, true)
          return result
        }
      } catch (error) {
        const duration = performance.now() - startTime
        globalMetrics.recordPerformance(name, duration, false, error.message)
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Error monitoring decorator
 */
export function monitorErrors() {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = function (...args: any[]) {
      try {
        const result = method.apply(this, args)
        
        if (result instanceof Promise) {
          return result.catch((error) => {
            globalMetrics.recordError(
              error.code || 'UNKNOWN_ERROR',
              error.message,
              error.stack,
              { method: propertyName, className: target.constructor.name },
              args[0]?.id, // Assume first argument might be user
            )
            throw error
          })
        } else {
          return result
        }
      } catch (error) {
        globalMetrics.recordError(
          error.code || 'UNKNOWN_ERROR',
          error.message,
          error.stack,
          { method: propertyName, className: target.constructor.name },
          args[0]?.id, // Assume first argument might be user
        )
        throw error
      }
    }

    return descriptor
  }
}

/**
 * User activity monitoring decorator
 */
export function monitorUserActivity(actionName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const action = actionName || propertyName

    descriptor.value = function (...args: any[]) {
      const result = method.apply(this, args)
      
      // Try to extract user ID from arguments
      const userId = args.find(arg => arg?.id && typeof arg.id === 'number')?.id
      
      if (userId) {
        globalMetrics.recordUserActivity(userId, action, {
          method: propertyName,
          className: target.constructor.name,
        })
      }
      
      return result
    }

    return descriptor
  }
} 