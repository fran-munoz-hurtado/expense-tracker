import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getUserDataById, handleSupabaseLogout } from '@/lib/services/supabaseAuth'

export interface SupabaseAuthState {
  user: User | null
  userData: any | null
  loading: boolean
  initialized: boolean
}

export function useSupabaseAuth() {
  const [authState, setAuthState] = useState<SupabaseAuthState>({
    user: null,
    userData: null,
    loading: true,
    initialized: false
  })

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
        }

        if (mounted) {
          if (session?.user) {
            // Get user data from our users table
            const userData = await getUserDataById(session.user.id)
            setAuthState({
              user: session.user,
              userData,
              loading: false,
              initialized: true
            })
          } else {
            setAuthState({
              user: null,
              userData: null,
              loading: false,
              initialized: true
            })
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (mounted) {
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            initialized: true
          })
        }
      }
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Supabase Auth state changed:', event, session?.user?.email)
      
      if (mounted) {
        if (session?.user) {
          // Get user data from our users table
          const userData = await getUserDataById(session.user.id)
          setAuthState({
            user: session.user,
            userData,
            loading: false,
            initialized: true
          })
        } else {
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            initialized: true
          })
        }
      }
    })

    getInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const result = await handleSupabaseLogout()
    return result
  }

  return {
    ...authState,
    signOut
  }
} 