import { APP_CONFIG } from '../config/constants'

/**
 * Data protection interface
 */
export interface ProtectedData {
  encrypted: string
  iv: string
  algorithm: string
}

/**
 * Secure storage interface
 */
export interface SecureStorage {
  key: string
  value: string
  expiresAt?: number
  encrypted: boolean
}

/**
 * Data Protection Manager
 * Handles encryption, secure storage, and data sanitization
 */
export class DataProtection {
  private static instance: DataProtection
  private readonly algorithm = 'AES-GCM'
  private readonly keyLength = 256
  private readonly ivLength = 12
  private readonly tagLength = 16

  private constructor() {}

  static getInstance(): DataProtection {
    if (!DataProtection.instance) {
      DataProtection.instance = new DataProtection()
    }
    return DataProtection.instance
  }

  /**
   * Generate encryption key
   */
  private async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Generate initialization vector
   */
  private generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.ivLength))
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, key?: CryptoKey): Promise<ProtectedData> {
    try {
      const encryptionKey = key || await this.generateKey()
      const iv = this.generateIV()
      const encoder = new TextEncoder()
      const encodedData = encoder.encode(data)

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv as BufferSource,
          tagLength: this.tagLength
        },
        encryptionKey,
        encodedData
      )

      return {
        encrypted: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
        algorithm: this.algorithm
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt sensitive data')
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(protectedData: ProtectedData, key: CryptoKey): Promise<string> {
    try {
      const encryptedBuffer = this.base64ToArrayBuffer(protectedData.encrypted)
      const iv = this.base64ToArrayBuffer(protectedData.iv)

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv as BufferSource,
          tagLength: this.tagLength
        },
        key,
        encryptedBuffer
      )

      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt sensitive data')
    }
  }

  /**
   * Secure storage with encryption
   */
  async secureStore(key: string, value: any, expiresIn?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value)
      const encrypted = await this.encryptData(serializedValue)
      
      const secureData: SecureStorage = {
        key: this.hashKey(key),
        value: JSON.stringify(encrypted),
        expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
        encrypted: true
      }

      // Store in memory for sensitive data (not localStorage)
      if (this.isSensitiveData(key)) {
        this.storeInMemory(secureData)
      } else {
        // For non-sensitive data, use localStorage with encryption
        localStorage.setItem(secureData.key, JSON.stringify(secureData))
      }
    } catch (error) {
      console.error('Secure storage failed:', error)
      throw new Error('Failed to store data securely')
    }
  }

  /**
   * Retrieve data from secure storage
   */
  async secureRetrieve(key: string): Promise<any> {
    try {
      const hashedKey = this.hashKey(key)
      let secureData: SecureStorage | undefined

      if (this.isSensitiveData(key)) {
        secureData = this.retrieveFromMemory(hashedKey)
      } else {
        const stored = localStorage.getItem(hashedKey)
        if (!stored) return null
        secureData = JSON.parse(stored) as SecureStorage
      }

      if (!secureData || !secureData.encrypted) {
        return null
      }

      // Check expiration
      if (secureData.expiresAt && Date.now() > secureData.expiresAt) {
        this.secureRemove(key)
        return null
      }

      const encrypted = JSON.parse(secureData.value) as ProtectedData
      const decrypted = await this.decryptData(encrypted, await this.generateKey())
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Secure retrieval failed:', error)
      return null
    }
  }

  /**
   * Remove data from secure storage
   */
  secureRemove(key: string): void {
    const hashedKey = this.hashKey(key)
    
    if (this.isSensitiveData(key)) {
      this.removeFromMemory(hashedKey)
    } else {
      localStorage.removeItem(hashedKey)
    }
  }

  /**
   * Check if data is sensitive
   */
  private isSensitiveData(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'session',
      'credential'
    ]

    return sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    )
  }

  /**
   * Hash key for storage
   */
  private hashKey(key: string): string {
    // Simple hash for demo - in production use proper hashing
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `secure_${Math.abs(hash).toString(36)}`
  }

  /**
   * Memory storage for sensitive data
   */
  private memoryStorage = new Map<string, SecureStorage>()

  private storeInMemory(data: SecureStorage): void {
    this.memoryStorage.set(data.key, data)
  }

  private retrieveFromMemory(key: string): SecureStorage | undefined {
    return this.memoryStorage.get(key)
  }

  private removeFromMemory(key: string): void {
    this.memoryStorage.delete(key)
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'secret',
      'key',
      'auth',
      'session',
      'credential',
      'api_key',
      'private_key'
    ]

    const sanitized: Record<string, any> = Array.isArray(data) ? [] : {}

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeForLogging(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Sanitize user data for display
   */
  sanitizeUserData(user: any): any {
    if (!user || typeof user !== 'object') {
      return user
    }

    const sanitized: Record<string, any> = { ...user }
    
    // Remove sensitive fields
    delete sanitized.password_hash
    delete sanitized.password
    delete sanitized.token
    delete sanitized.secret

    // Mask email for display
    if (sanitized.email) {
      const [local, domain] = sanitized.email.split('@')
      if (local && domain) {
        const maskedLocal = local.length > 2 
          ? local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1)
          : local
        sanitized.email = `${maskedLocal}@${domain}`
      }
    }

    return sanitized
  }

  /**
   * Utility functions for array buffer conversion
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Clear all secure storage
   */
  clearAllSecureStorage(): void {
    this.memoryStorage.clear()
    
    // Clear encrypted localStorage items
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    memoryItems: number
    localStorageItems: number
    totalSize: number
  } {
    const memoryItems = this.memoryStorage.size
    const localStorageItems = Object.keys(localStorage)
      .filter(key => key.startsWith('secure_')).length

    let totalSize = 0
    this.memoryStorage.forEach(item => {
      totalSize += JSON.stringify(item).length
    })

    return {
      memoryItems,
      localStorageItems,
      totalSize
    }
  }
}

// Export singleton instance
export const dataProtection = DataProtection.getInstance() 