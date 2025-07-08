import { supabase } from '../supabase'
import { securityManager } from './SecurityManager'
import { dataProtection } from './DataProtection'
import { secureLogger } from './SecureLogger'
import { APP_CONFIG } from '../config/constants'

/**
 * User authentication interface
 */
export interface AuthenticatedUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  last_login?: string
}

/**
 * Authentication result interface
 */
export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  token?: string
}

/**
 * Secure Authentication Manager
 * Handles user authentication with proper security measures
 */
export class SecureAuth {
  private static instance: SecureAuth
  private currentUser: AuthenticatedUser | null = null
  private sessionToken: string | null = null
  private readonly sessionTimeout = 24 * 60 * 60 * 1000 // 24 hours
  private sessionTimer?: NodeJS.Timeout

  private constructor() {
    this.initializeSession()
  }

  static getInstance(): SecureAuth {
    if (!SecureAuth.instance) {
      SecureAuth.instance = new SecureAuth()
    }
    return SecureAuth.instance
  }

  /**
   * Initialize session from secure storage
   */
  private async initializeSession(): Promise<void> {
    try {
      const sessionData = await dataProtection.secureRetrieve('auth_session')
      if (sessionData && sessionData.user && sessionData.token) {
        // Validate session hasn't expired
        if (sessionData.expiresAt && Date.now() < sessionData.expiresAt) {
          this.currentUser = sessionData.user
          this.sessionToken = sessionData.token
          this.startSessionTimer()
          
          secureLogger.info('Session restored from secure storage', {
            userId: this.currentUser?.id,
            username: this.currentUser?.username
          })
        } else {
          // Session expired, clear it
          await this.logout()
        }
      }
    } catch (error) {
      secureLogger.error('Failed to initialize session', { error })
      await this.logout()
    }
  }

  /**
   * Secure login with validation and rate limiting
   */
  async login(username: string, password: string, ipAddress?: string): Promise<AuthResult> {
    try {
      // Security validation
      securityManager.validateAuthentication(username, password, ipAddress)

      // Rate limiting check
      const rateLimitKey = `login_${username}_${ipAddress || 'unknown'}`
      if (!securityManager.checkRateLimit(rateLimitKey, 'login', ipAddress)) {
        throw new Error('Too many login attempts. Please try again later.')
      }

      // Validate input
      const sanitizedUsername = securityManager.sanitizeInput(username, [
        { type: 'string' as const, required: true, minLength: 3, maxLength: 30 },
        { type: 'regex' as const, pattern: /^[a-zA-Z0-9_]+$/ }
      ])

      const sanitizedPassword = securityManager.sanitizeInput(password, [
        { type: 'string' as const, required: true, minLength: 8, maxLength: 128 }
      ])

      // Hash password for comparison (in production, use proper hashing)
      const hashedPassword = await this.hashPassword(sanitizedPassword)

      // Query user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', sanitizedUsername)
        .eq('password_hash', hashedPassword)
        .eq('status', 'active')
        .single()

      if (error || !user) {
        // Record failed login attempt
        securityManager.recordSecurityEvent('authentication_failure', {
          username: sanitizedUsername,
          ipAddress,
          reason: 'Invalid credentials'
        })

        secureLogger.logAuthEvent(0, 'login', false, {
          username: sanitizedUsername,
          ipAddress,
          error: error?.message || 'User not found'
        })

        throw new Error('Usuario o contraseña incorrectos')
      }

      // Generate session token
      const sessionToken = this.generateSessionToken(user.id)

      // Store session securely
      const sessionData = {
        user: dataProtection.sanitizeUserData(user),
        token: sessionToken,
        expiresAt: Date.now() + this.sessionTimeout
      }

      await dataProtection.secureStore('auth_session', sessionData, this.sessionTimeout)

      // Update current user and token
      this.currentUser = sessionData.user as AuthenticatedUser
      this.sessionToken = sessionToken

      // Start session timer
      this.startSessionTimer()

      // Update last login
      await this.updateLastLogin(user.id)

      // Log successful login
      secureLogger.logAuthEvent(user.id, 'login', true, {
        username: user.username,
        ipAddress
      })

      return {
        success: true,
        user: this.currentUser,
        token: sessionToken
      }

    } catch (error) {
      secureLogger.error('Login failed', {
        username,
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }
    }
  }

  /**
   * Secure registration with validation
   */
  async register(userData: any, ipAddress?: string): Promise<AuthResult> {
    try {
      // Validate and sanitize user data
      const validatedData = securityManager.validateUserData(userData)

      // Rate limiting check
      const rateLimitKey = `register_${ipAddress || 'unknown'}`
      if (!securityManager.checkRateLimit(rateLimitKey, 'register', ipAddress)) {
        throw new Error('Too many registration attempts. Please try again later.')
      }

      // Check if username or email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .or(`username.eq.${validatedData.username},email.eq.${validatedData.email}`)
        .single()

      if (existingUser) {
        throw new Error('El nombre de usuario o correo electrónico ya existe')
      }

      // Hash password
      const hashedPassword = await this.hashPassword(validatedData.password)

      // Create user
      const newUserData = {
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        username: validatedData.username,
        email: validatedData.email,
        password_hash: hashedPassword,
        status: 'active' as const,
        created_at: new Date().toISOString()
      }

      const { data: user, error } = await supabase
        .from('users')
        .insert([newUserData])
        .select()
        .single()

      if (error) {
        throw new Error('Error al crear la cuenta')
      }

      // Generate session token
      const sessionToken = this.generateSessionToken(user.id)

      // Store session securely
      const sessionData = {
        user: dataProtection.sanitizeUserData(user),
        token: sessionToken,
        expiresAt: Date.now() + this.sessionTimeout
      }

      await dataProtection.secureStore('auth_session', sessionData, this.sessionTimeout)

      // Update current user and token
      this.currentUser = sessionData.user as AuthenticatedUser
      this.sessionToken = sessionToken

      // Start session timer
      this.startSessionTimer()

      // Log successful registration
      secureLogger.logAuthEvent(user.id, 'register', true, {
        username: user.username,
        email: user.email,
        ipAddress
      })

      return {
        success: true,
        user: this.currentUser,
        token: sessionToken
      }

    } catch (error) {
      secureLogger.error('Registration failed', {
        username: userData.username,
        email: userData.email,
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  }

  /**
   * Secure logout
   */
  async logout(): Promise<void> {
    try {
      if (this.currentUser) {
        secureLogger.logAuthEvent(this.currentUser.id, 'logout', true, {
          username: this.currentUser.username
        })
      }

      // Clear session
      this.currentUser = null
      this.sessionToken = null

      // Stop session timer
      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer)
        this.sessionTimer = undefined
      }

      // Clear secure storage
      await dataProtection.secureRemove('auth_session')

      secureLogger.info('User logged out successfully')
    } catch (error) {
      secureLogger.error('Logout failed', { error })
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthenticatedUser | null {
    return this.currentUser
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.sessionToken !== null
  }

  /**
   * Validate session token
   */
  validateSessionToken(token: string): boolean {
    return this.sessionToken === token && this.isAuthenticated()
  }

  /**
   * Hash password (in production, use bcrypt or similar)
   */
  private async hashPassword(password: string): Promise<string> {
    // For demo purposes - in production use proper hashing
    const encoder = new TextEncoder()
    const data = encoder.encode(password + APP_CONFIG.SECURITY.JWT_SECRET)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate session token
   */
  private generateSessionToken(userId: number): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    return `${userId}_${timestamp}_${random}`
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: number): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
    } catch (error) {
      secureLogger.error('Failed to update last login', { userId, error })
    }
  }

  /**
   * Start session timer
   */
  private startSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer)
    }

    this.sessionTimer = setTimeout(async () => {
      secureLogger.warn('Session expired, logging out user', {
        userId: this.currentUser?.id
      })
      await this.logout()
    }, this.sessionTimeout)
  }

  /**
   * Extend session
   */
  async extendSession(): Promise<void> {
    if (this.isAuthenticated() && this.currentUser) {
      const sessionData = {
        user: this.currentUser,
        token: this.sessionToken,
        expiresAt: Date.now() + this.sessionTimeout
      }

      await dataProtection.secureStore('auth_session', sessionData, this.sessionTimeout)
      this.startSessionTimer()

      secureLogger.info('Session extended', {
        userId: this.currentUser.id
      })
    }
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    isAuthenticated: boolean
    userId?: number
    username?: string
    sessionExpiresAt?: number
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      userId: this.currentUser?.id,
      username: this.currentUser?.username,
      sessionExpiresAt: this.sessionToken ? Date.now() + this.sessionTimeout : undefined
    }
  }
}

// Export singleton instance
export const secureAuth = SecureAuth.getInstance() 