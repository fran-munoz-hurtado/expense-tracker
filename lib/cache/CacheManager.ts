import { APP_CONFIG } from '../config/constants'

/**
 * Cache entry interface
 */
interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

/**
 * Cache statistics interface
 */
interface CacheStats {
  totalEntries: number
  totalSize: number
  hitCount: number
  missCount: number
  hitRate: number
  averageAccessTime: number
  memoryUsage: number
}

/**
 * Cache eviction policies
 */
export enum EvictionPolicy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  FIFO = 'fifo', // First In, First Out
  TTL = 'ttl', // Time To Live
}

/**
 * Advanced cache manager with multiple eviction policies and memory management
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private readonly maxSize: number
  private readonly defaultTTL: number
  private readonly evictionPolicy: EvictionPolicy
  private readonly cleanupInterval: number
  private cleanupTimer?: NodeJS.Timeout
  private stats = {
    hitCount: 0,
    missCount: 0,
    totalAccessTime: 0,
    accessCount: 0,
  }

  constructor(
    maxSize: number = APP_CONFIG.CACHE.MAX_SIZE,
    defaultTTL: number = APP_CONFIG.CACHE.TRANSACTIONS_DURATION,
    evictionPolicy: EvictionPolicy = EvictionPolicy.LRU,
    cleanupInterval: number = APP_CONFIG.CACHE.CLEANUP_INTERVAL
  ) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    this.evictionPolicy = evictionPolicy
    this.cleanupInterval = cleanupInterval
    
    this.startCleanupTimer()
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const startTime = performance.now()
    
    try {
      // Check if we need to evict entries
      if (this.cache.size >= this.maxSize) {
        this.evictEntries()
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      this.cache.set(key, entry)
    } finally {
      this.updateStats(performance.now() - startTime)
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const startTime = performance.now()
    
    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        this.stats.missCount++
        return null
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        this.stats.missCount++
        return null
      }

      // Update access statistics
      entry.accessCount++
      entry.lastAccessed = Date.now()
      
      this.stats.hitCount++
      return entry.data as T
    } finally {
      this.updateStats(performance.now() - startTime)
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalEntries = this.cache.size
    const totalSize = this.calculateCacheSize()
    const hitRate = this.stats.hitCount + this.stats.missCount > 0 
      ? this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) 
      : 0
    const averageAccessTime = this.stats.accessCount > 0 
      ? this.stats.totalAccessTime / this.stats.accessCount 
      : 0

    return {
      totalEntries,
      totalSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
      averageAccessTime,
      memoryUsage: this.getMemoryUsage(),
    }
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get all values in the cache
   */
  values<T>(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.data as T)
  }

  /**
   * Get cache entries as key-value pairs
   */
  entries<T>(): [string, T][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.data as T])
  }

  /**
   * Set multiple values at once
   */
  setMultiple<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    for (const { key, data, ttl } of entries) {
      this.set(key, data, ttl)
    }
  }

  /**
   * Get multiple values at once
   */
  getMultiple<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {}
    
    for (const key of keys) {
      result[key] = this.get<T>(key)
    }
    
    return result
  }

  /**
   * Delete multiple keys at once
   */
  deleteMultiple(keys: string[]): number {
    let deletedCount = 0
    
    for (const key of keys) {
      if (this.delete(key)) {
        deletedCount++
      }
    }
    
    return deletedCount
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    let deletedCount = 0
    const keysToDelete: string[] = []

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
      deletedCount++
    }

    return deletedCount
  }

  /**
   * Warm up cache with data
   */
  warmUp<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    // Clear existing cache
    this.clear()
    
    // Add new entries
    this.setMultiple(entries)
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Evict entries based on the selected policy
   */
  private evictEntries(): void {
    const entriesToEvict = Math.ceil(this.maxSize * 0.1) // Evict 10% of entries
    
    switch (this.evictionPolicy) {
      case EvictionPolicy.LRU:
        this.evictLRU(entriesToEvict)
        break
      case EvictionPolicy.LFU:
        this.evictLFU(entriesToEvict)
        break
      case EvictionPolicy.FIFO:
        this.evictFIFO(entriesToEvict)
        break
      case EvictionPolicy.TTL:
        this.evictTTL(entriesToEvict)
        break
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count)
    
    for (const [key] of entries) {
      this.cache.delete(key)
    }
  }

  /**
   * Evict least frequently used entries
   */
  private evictLFU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)
      .slice(0, count)
    
    for (const [key] of entries) {
      this.cache.delete(key)
    }
  }

  /**
   * Evict first in, first out entries
   */
  private evictFIFO(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, count)
    
    for (const [key] of entries) {
      this.cache.delete(key)
    }
  }

  /**
   * Evict entries based on time to live
   */
  private evictTTL(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => (a.timestamp + a.ttl) - (b.timestamp + b.ttl))
      .slice(0, count)
    
    for (const [key] of entries) {
      this.cache.delete(key)
    }
  }

  /**
   * Calculate approximate cache size in bytes
   */
  private calculateCacheSize(): number {
    let size = 0
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      size += key.length * 2 // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2
      size += 48 // Approximate size of entry metadata
    }
    
    return size
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    return 0
  }

  /**
   * Update access statistics
   */
  private updateStats(accessTime: number): void {
    this.stats.totalAccessTime += accessTime
    this.stats.accessCount++
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hitCount: 0,
      missCount: 0,
      totalAccessTime: 0,
      accessCount: 0,
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
      this.clearExpired()
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
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.clear()
  }
}

/**
 * Cache factory for creating specialized cache instances
 */
export class CacheFactory {
  /**
   * Create a transactions cache
   */
  static createTransactionsCache(): CacheManager {
    return new CacheManager(
      APP_CONFIG.CACHE.MAX_SIZE,
      APP_CONFIG.CACHE.TRANSACTIONS_DURATION,
      EvictionPolicy.LRU
    )
  }

  /**
   * Create a user data cache
   */
  static createUserDataCache(): CacheManager {
    return new CacheManager(
      APP_CONFIG.CACHE.MAX_SIZE,
      APP_CONFIG.CACHE.USER_DATA_DURATION,
      EvictionPolicy.LRU
    )
  }

  /**
   * Create a stats cache
   */
  static createStatsCache(): CacheManager {
    return new CacheManager(
      APP_CONFIG.CACHE.MAX_SIZE,
      APP_CONFIG.CACHE.STATS_DURATION,
      EvictionPolicy.TTL
    )
  }

  /**
   * Create an attachments cache
   */
  static createAttachmentsCache(): CacheManager {
    return new CacheManager(
      APP_CONFIG.CACHE.MAX_SIZE,
      APP_CONFIG.CACHE.ATTACHMENTS_DURATION,
      EvictionPolicy.LRU
    )
  }
}

/**
 * Global cache instances
 */
export const globalCaches = {
  transactions: CacheFactory.createTransactionsCache(),
  userData: CacheFactory.createUserDataCache(),
  stats: CacheFactory.createStatsCache(),
  attachments: CacheFactory.createAttachmentsCache(),
}

/**
 * Cache decorator for automatic caching of function results
 */
export function cached<T extends any[], R>(
  cacheKey: string | ((...args: T) => string),
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const cache = globalCaches.transactions

    descriptor.value = function (...args: T): R {
      const key = typeof cacheKey === 'function' ? cacheKey(...args) : cacheKey
      const cachedResult = cache.get<R>(key)
      
      if (cachedResult !== null) {
        return cachedResult
      }

      const result = method.apply(this, args)
      
      if (result instanceof Promise) {
        return result.then((resolvedResult: R) => {
          cache.set(key, resolvedResult, ttl)
          return resolvedResult
        }) as R
      } else {
        cache.set(key, result, ttl)
        return result
      }
    }

    return descriptor
  }
} 