import { APP_CONFIG } from '../config/constants'

// Cache configuration
export const CACHE_CONFIG = {
  // Cache duration in milliseconds
  TRANSACTIONS_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  USER_DATA_CACHE_DURATION: 10 * 60 * 1000,   // 10 minutes
  STATS_CACHE_DURATION: 2 * 60 * 1000,        // 2 minutes
  ATTACHMENTS_CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
} as const

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// Cache class with multiple eviction policies
class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly maxSize: number
  private readonly defaultTTL: number
  private readonly evictionPolicy: 'LRU' | 'LFU' | 'FIFO'

  constructor(
    maxSize: number = 1000,
    defaultTTL: number = CACHE_CONFIG.TRANSACTIONS_CACHE_DURATION,
    evictionPolicy: 'LRU' | 'LFU' | 'FIFO' = 'LRU'
  ) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    this.evictionPolicy = evictionPolicy
  }

  set(key: string, value: T, ttl?: number): void {
    // Clean expired entries first
    this.cleanup()

    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evict()
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }

    this.cache.set(key, entry)
  }

  get<R = T>(key: string): R | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access time for LRU
    if (this.evictionPolicy === 'LRU') {
      entry.timestamp = Date.now()
    }

    return entry.data as unknown as R
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    this.cleanup()
    return this.cache.size
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private evict(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string | null = null

    switch (this.evictionPolicy) {
      case 'LRU':
        keyToEvict = this.findLRU()
        break
      case 'LFU':
        keyToEvict = this.findLFU()
        break
      case 'FIFO':
        keyToEvict = this.findFIFO()
        break
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
    }
  }

  private findLRU(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  private findLFU(): string | null {
    // For simplicity, we'll use LRU as LFU since we don't track frequency
    return this.findLRU()
  }

  private findFIFO(): string | null {
    // For simplicity, we'll use LRU as FIFO since we don't track insertion order
    return this.findLRU()
  }

  // Get cache statistics
  getStats() {
    this.cleanup()
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      evictionPolicy: this.evictionPolicy,
      defaultTTL: this.defaultTTL
    }
  }
}

// Global cache instances
export const globalCaches = {
  transactions: new Cache<any[]>(500, CACHE_CONFIG.TRANSACTIONS_CACHE_DURATION, 'LRU'),
  userData: new Cache<any>(200, CACHE_CONFIG.USER_DATA_CACHE_DURATION, 'LRU'),
  stats: new Cache<any>(100, CACHE_CONFIG.STATS_CACHE_DURATION, 'LRU'),
  attachments: new Cache<any>(300, CACHE_CONFIG.ATTACHMENTS_CACHE_DURATION, 'LRU')
}

// Cache manager for advanced operations
export class CacheManager {
  private static instance: CacheManager

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  // Clear all caches
  clearAll(): void {
    Object.values(globalCaches).forEach(cache => cache.clear())
  }

  // Clear cache by user ID
  clearUserCache(userId: number): void {
    const userPattern = new RegExp(`.*${userId}.*`)
    
    Object.values(globalCaches).forEach(cache => {
      // Note: This is a simplified approach. In a real implementation,
      // you'd need to track keys or implement a more sophisticated clearing mechanism
      cache.clear()
    })
  }

  // Get cache statistics
  getStats() {
    return {
      transactions: globalCaches.transactions.getStats(),
      userData: globalCaches.userData.getStats(),
      stats: globalCaches.stats.getStats(),
      attachments: globalCaches.attachments.getStats()
    }
  }

  // Preload data for better performance
  async preloadUserData(userId: number): Promise<void> {
    // This would preload common user data
    // Implementation depends on your specific needs
  }

  // Warm up cache with frequently accessed data
  async warmupCache(): Promise<void> {
    // This would load frequently accessed data into cache
    // Implementation depends on your specific needs
  }
}

// Export the singleton instance
export const cacheManager = CacheManager.getInstance() 