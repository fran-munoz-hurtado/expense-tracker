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
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[auth] Error durante logout:', error)
        throw error
      } else {
        console.log('[auth] Logout exitoso desde store')
      }
      // Note: User state will be cleared by onAuthStateChange listener
    } catch (error) {
      console.error('[auth] Error inesperado durante logout:', error)
      // Fallback: clear user state manually
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
        const { data: { session }, error } = await supabase.auth.getSession()
        
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