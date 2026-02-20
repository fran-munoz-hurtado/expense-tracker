import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/supabase'

interface AuthStore {
  user: User | null
  isInitialized: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
  initAuth: () => Promise<() => void> // Returns unsubscribe function
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isInitialized: false,
  isLoading: true,

  setUser: (user) => {
    console.log('[auth] setUser called:', user?.email || 'null')
    set({ user, isInitialized: true })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  logout: async () => {
    console.log('[auth] Iniciando logout desde store...')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      // Siempre limpiamos el estado local inmediatamente (no depender del listener)
      set({ user: null })
      if (error) {
        console.error('[auth] Error durante logout (limpiando igual):', error)
        // Fallback: borrar sesión de localStorage si signOut falló (p. ej. bug 403)
        if (typeof window !== 'undefined') {
          const keysToRemove: string[] = []
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i)
            if (key?.startsWith('sb-') && key.includes('auth')) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k))
        }
      } else {
        console.log('[auth] Logout exitoso desde store')
      }
    } catch (error) {
      console.error('[auth] Error inesperado durante logout:', error)
      set({ user: null })
      throw error
    }
  },

  initAuth: async () => {
    console.log('[auth] Inicializando autenticación desde store...')
    
    const fetchUserProfile = async (userId: string) => {
      console.log('[auth] Realizando fetch a public.users con ID:', userId)

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('[auth] Respuesta de public.users - userData:', userData)
      console.log('[auth] Respuesta de public.users - userError:', userError)

      if (userError) {
        console.error('[auth] Error cargando perfil desde public.users:', userError)
        console.log('[auth] Código de error:', userError.code)
        console.log('[auth] Mensaje de error:', userError.message)
        return null
      }

      if (!userData) {
        console.warn('[auth] No se encontró perfil en public.users para ID:', userId)
        return null
      }

      return userData
    }

    const initialize = async () => {
      try {
        // On OAuth return, Supabase may still be exchanging the code (PKCE).
        // If URL has ?code= and no session yet, wait for the exchange to complete.
        let { data: { session }, error } = await supabase.auth.getSession()
        if (!session?.user && typeof window !== 'undefined' && window.location.search.includes('code=')) {
          console.log('[auth] OAuth code detected, waiting for exchange...')
          await new Promise((r) => setTimeout(r, 2000))
          const retry = await supabase.auth.getSession()
          session = retry.data.session
          error = retry.error
        }

        if (error) {
          console.error('[auth] Error obteniendo sesión:', error)
          set({ isLoading: false, isInitialized: true })
          return
        }

        if (session?.user) {
          console.log('[auth] Sesión encontrada:', session.user.email)
          const userData = await fetchUserProfile(session.user.id)
          
          if (userData) {
            console.log('[auth] Usuario cargado desde public.users:', userData.email)
            set({ user: userData, isInitialized: true })
          } else {
            console.log('[auth] No se pudo cargar el perfil, limpiando sesión')
            set({ user: null, isInitialized: true })
          }
        } else {
          console.log('[auth] No hay sesión activa')
          set({ user: null, isInitialized: true })
        }
        
        console.log('[auth] Inicialización de sesión completada')
      } catch (error) {
        console.error('[auth] Error inesperado inicializando sesión:', error)
        set({ user: null, isInitialized: true })
      } finally {
        set({ isLoading: false })
      }
    }

    await initialize()

    // Set up auth state change listener
    // IMPORTANT: Never make async Supabase calls inside this callback - causes deadlock (Supabase #762).
    // Defer fetchUserProfile with setTimeout so it runs after the callback completes.
    console.log('[auth] Listener de sesión activado')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[auth] Cambio de sesión detectado:', event, session?.user?.email || 'sin usuario')

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const userId = session.user.id
          setTimeout(async () => {
            console.log('[auth] Usuario autenticado, cargando perfil...')
            const userData = await fetchUserProfile(userId)
            if (userData) {
              const currentUser = get().user
              if (currentUser?.id === userData.id) {
                console.log('[auth] Usuario ya seteado en store, no se actualiza')
              } else {
                console.log('[auth] Usuario actualizado en store:', userData.email)
                set({ user: userData })
              }
            } else {
              console.log('[auth] No se pudo cargar el perfil tras evento:', event)
              set({ user: null })
            }
          }, 0)
        }
      } else if (event === 'SIGNED_OUT') {
        set({ user: null })
      }
    })

    // Return unsubscribe function
    return () => {
      console.log('[auth] Listener de sesión desconectado')
      subscription.unsubscribe()
    }
  }
})) 