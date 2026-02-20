import { supabase } from '@/lib/supabase'
import type { User, AuthError } from '@supabase/supabase-js'

export interface SupabaseAuthResult {
  success: boolean
  user?: User
  error?: string
  needsConfirmation?: boolean
}

export interface SupabaseSignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  username: string
}

export interface SupabaseLoginData {
  email: string
  password: string
}

/**
 * Handle user registration with Supabase Auth
 */
export async function handleSupabaseSignUp(data: SupabaseSignUpData): Promise<SupabaseAuthResult> {
  try {
    console.log('🔄 Starting Supabase Auth registration...')
    
    // Step 1: Validate required fields
    if (!data.email || !data.password || !data.firstName || !data.lastName || !data.username) {
      return { success: false, error: 'Todos los campos son obligatorios' }
    }

    // Step 2: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return { success: false, error: 'Por favor, ingresa un email válido' }
    }

    // Step 3: Validate username format (alphanumeric, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(data.username)) {
      return { success: false, error: 'El nombre de usuario debe tener entre 3-30 caracteres (solo letras, números y _)' }
    }

    // Step 4: Check for duplicate email/username in public.users
    const { data: existingUser, error: duplicateError } = await supabase
      .from('users')
      .select('email, username')
      .or(`email.eq.${data.email},username.eq.${data.username}`)
      .maybeSingle()

    if (duplicateError) {
      console.error('❌ Error checking duplicates:', duplicateError)
      return { success: false, error: 'Error al validar los datos. Inténtalo de nuevo.' }
    }

    if (existingUser) {
      if (existingUser.email === data.email) {
        return { success: false, error: 'Este email ya está registrado' }
      }
      if (existingUser.username === data.username) {
        return { success: false, error: 'Este nombre de usuario ya está en uso' }
      }
    }

    // Step 5: Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          username: data.username
        }
      }
    })

    if (authError) {
      console.error('❌ Supabase Auth registration error:', authError)
      
      // Handle common errors
      if (authError.message.includes('User already registered') || authError.message.includes('already been registered')) {
        return { success: false, error: 'Este correo electrónico ya está registrado' }
      }
      
      if (authError.message.includes('Password should be at least')) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
      }
      
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'No se pudo crear el usuario' }
    }

    console.log('✅ Supabase Auth user created:', authData.user.id)

    // Step 6: Insert user data into public.users table with all required fields
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        username: data.username,
        email: data.email,
        status: 'active',
        role: 'user',
        subscription_tier: 'free',
        is_on_trial: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('❌ Error inserting user data:', dbError)
      
      // Clean up: Try to delete the auth user if public.users insertion failed
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
        console.log('🧹 Cleaned up auth user after database error')
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup auth user:', cleanupError)
      }
      
      return { success: false, error: 'Error al crear la cuenta. Inténtalo de nuevo.' }
    }

    console.log('✅ User data inserted successfully in public.users')

    // Check if email confirmation is needed
    const needsConfirmation = !authData.user.email_confirmed_at

    return {
      success: true,
      user: authData.user,
      needsConfirmation
    }

  } catch (error) {
    console.error('❌ Unexpected error during registration:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error inesperado durante el registro' 
    }
  }
}

/**
 * Handle user login with Supabase Auth
 */
export async function handleSupabaseLogin(data: SupabaseLoginData): Promise<SupabaseAuthResult> {
  try {
    console.log('🔄 Starting Supabase Auth login...')
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })

    if (authError) {
      console.error('❌ Supabase Auth login error:', authError)
      
      // Handle common errors
      if (authError.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Correo electrónico o contraseña incorrectos' }
      }
      
      if (authError.message.includes('Email not confirmed')) {
        return { success: false, error: 'Por favor confirma tu correo electrónico antes de iniciar sesión' }
      }
      
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'No se pudo iniciar sesión' }
    }

    console.log('✅ Supabase Auth login successful:', authData.user.id)

    return {
      success: true,
      user: authData.user
    }

  } catch (error) {
    console.error('❌ Unexpected error during login:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error inesperado durante el inicio de sesión' 
    }
  }
}

/**
 * Handle login with Google (OAuth)
 * Redirects to Google and then back to the app
 * @param fromSignup - si viene de /signup, se añade from=signup para guardar consentimiento en callback
 */
export async function handleSupabaseGoogleLogin(options?: { fromSignup?: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    const siteUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    let redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent('/mis-cuentas')}`
    if (options?.fromSignup) redirectTo += '&from=signup'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) {
      console.error('❌ Google sign-in error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('❌ Unexpected error during Google sign-in:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al iniciar sesión con Google'
    }
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentSupabaseUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('❌ Error getting current user:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('❌ Unexpected error getting current user:', error)
    return null
  }
}

/**
 * Sign out current user
 */
export async function handleSupabaseLogout(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ Error signing out:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ User signed out successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Unexpected error during logout:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error inesperado durante el cierre de sesión' 
    }
  }
}

/**
 * Guarda el consentimiento de Política de Tratamiento de Datos (signup con Google)
 */
export async function savePrivacyConsent(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('user_privacy_consents').upsert(
      { user_id: userId, accepted_privacy: true, accepted_at: new Date().toISOString(), policy_version: '1.0' },
      { onConflict: 'user_id' }
    )
    if (error) {
      console.error('❌ Error guardando consentimiento:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    console.error('❌ Error guardando consentimiento:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

/**
 * Get user data from our users table by Supabase Auth ID
 */
export async function getUserDataById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching user data:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('❌ Unexpected error fetching user data:', error)
    return null
  }
}

/**
 * Send password reset email to user
 */
export async function resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Sending password reset email...')
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    })

    if (error) {
      console.error('❌ Error sending password reset email:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Password reset email sent successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Unexpected error sending password reset email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error inesperado enviando el correo de recuperación' 
    }
  }
} 