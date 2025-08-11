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
    
    // Step 1: Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName
        }
      }
    })

    if (authError) {
      console.error('❌ Supabase Auth registration error:', authError)
      
      // Handle common errors
      if (authError.message.includes('User already registered')) {
        return { success: false, error: 'Este correo electrónico ya está registrado' }
      }
      
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'No se pudo crear el usuario' }
    }

    console.log('✅ Supabase Auth user created:', authData.user.id)

    // Step 2: Insert user data into our users table
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        username: authData.user.email, // Use email as username for now
        email: authData.user.email,
        password_hash: '', // Empty since Supabase Auth handles passwords
        status: 'active',
        created_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('❌ Error inserting user data:', dbError)
      // Note: User is created in Auth but not in our table - this needs to be handled
      return { success: false, error: 'Usuario creado pero error al guardar datos adicionales' }
    }

    console.log('✅ User data inserted successfully')

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