'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseSignUp, handleSupabaseLogin, handleSupabaseGoogleLogin, type SupabaseSignUpData, type SupabaseLoginData } from '@/lib/services/supabaseAuth'
import { analytics } from '@/lib/analytics'
import { texts } from '@/lib/translations'
import PrivacyPolicyContent from './PrivacyPolicyContent'

const PRIVACY_CONSENT_STORAGE_KEY = 'privacy_consent_signup'

interface LoginPageProps {
  onLogin: (user: any) => void
  /** Cuando false, solo muestra el botón Google. La lógica email/password queda en código pero oculta. */
  showPasswordLogin?: boolean
  /** 'login' = copy para existentes, 'signup' = copy para nuevos */
  variant?: 'login' | 'signup'
}

export default function LoginPage({ onLogin, showPasswordLogin = true, variant = 'login' }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  
  // Form data - only fields needed for Supabase Auth
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isLogin) {
        // Supabase Auth Login
        const result = await handleSupabaseLogin({
          email: formData.email,
          password: formData.password
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        analytics.login('email', result.user!.id)

        // Get user data from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', result.user!.id)
          .single()

        if (userError) {
          console.error('Error fetching user data:', userError)
          // If user doesn't exist in our table, create a basic record from user_metadata
          const basicUserData = {
            id: result.user!.id,
            first_name: result.user!.user_metadata?.first_name || '',
            last_name: result.user!.user_metadata?.last_name || '',
            email: result.user!.email!,
            status: 'active' as const,
            role: 'user' as const,
            subscription_tier: 'free' as const,
            is_on_trial: false,
            created_at: result.user!.created_at,
            updated_at: result.user!.updated_at || result.user!.created_at
          }
          
          onLogin(basicUserData)
        } else {
          onLogin(userData)
        }
      } else {
        // Supabase Auth Registration
        const result = await handleSupabaseSignUp({
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          username: formData.username
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        analytics.signUp('email', result.user!.id)

        if (result.needsConfirmation) {
          setSuccess('¡Registro exitoso! Por favor revisa tu correo electrónico para confirmar tu cuenta.')
        } else {
          // Get user data from our users table and login
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', result.user!.id)
            .single()

          if (userData && !userError) {
            onLogin(userData)
          } else {
            setSuccess('¡Registro exitoso! Ya puedes iniciar sesión.')
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError(error instanceof Error ? error.message : texts.errorOccurred)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      password: ''
    })
    setError(null)
    setSuccess(null)
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  const handleGoogleLogin = async () => {
    setError(null)
    const isSignupFlow = !showPasswordLogin && variant === 'signup'
    if (isSignupFlow && !acceptedPrivacy) {
      setError('Debes aceptar la Política de Tratamiento de Datos para continuar.')
      return
    }
    setGoogleLoading(true)
    analytics.login('google')
    try {
      if (isSignupFlow && acceptedPrivacy) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify({ accepted: true, policy_version: '1.0' }))
        }
      }
      const result = await handleSupabaseGoogleLogin(isSignupFlow ? { fromSignup: true } : undefined)
      if (!result.success) {
        setError(result.error ?? 'Error al iniciar sesión con Google')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 25%, #eff6ff 50%, #f0fdf4 75%, #ecfdf5 100%)',
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-green-primary transition-colors">
            ← Volver
          </Link>
        </div>
        <div className="text-center">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            {!showPasswordLogin
              ? (variant === 'signup' ? 'Crea tu espacio en Controla.' : 'Bienvenido de nuevo.')
              : (isLogin ? 'Inicia sesión' : 'Crea tu cuenta')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {!showPasswordLogin
              ? (variant === 'signup'
                ? <>Organiza tus ingresos y obligaciones en minutos.<br />Descubre cuánto puedes gastar sin afectar tus pagos.</>
                : 'Accede a tus espacios y revisa tu disponible real.')
              : (isLogin ? 'Accede a tu cuenta de gastos' : 'Comienza a gestionar tus finanzas')}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {showPasswordLogin && !isLogin && (
              <>
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                      placeholder="Tu nombre"
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                    Apellido
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                      placeholder="Tu apellido"
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Nombre de usuario
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                      placeholder="Nombre de usuario"
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </>
            )}

            {showPasswordLogin && (
            <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                  placeholder="tu@correo.com"
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                  placeholder="Contraseña"
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {isLogin ? (
                <div className="mt-2 text-right">
                  <a
                    href="/forgot-password"
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>
            </>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-800">{success}</div>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading || (!showPasswordLogin && variant === 'signup' && !acceptedPrivacy)}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? 'Conectando...' : (!showPasswordLogin ? (variant === 'signup' ? 'Crear cuenta con Google' : 'Entrar con Google') : 'Continuar con Google')}
              </button>
              {!showPasswordLogin && variant === 'signup' && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    id="privacy-accept"
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border border-gray-300 focus:ring-green-primary focus:ring-2"
                  />
                  <label htmlFor="privacy-accept" className="text-sm text-gray-700">
                    Acepto la{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-green-primary hover:text-green-dark underline"
                    >
                      Política de Tratamiento de Datos
                    </button>
                  </label>
                </div>
              )}
              {!showPasswordLogin && (
                <p className="mt-3 text-xs text-gray-500 text-center">
                  {variant === 'signup'
                    ? 'Seguro y sin contraseñas. Si ya tienes cuenta, entrarás automáticamente.'
                    : 'Usa la misma cuenta con la que creaste tu espacio.'}
                </p>
              )}
            </div>

            {showPasswordLogin && (
            <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o continúa con email</span>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-primary hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                  </div>
                ) : (
                  <div className="flex items-center">
                    {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>
            </>
            )}
          </form>

          {showPrivacyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowPrivacyModal(false)} aria-hidden="true" />
              <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Política de Tratamiento de Datos</h3>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(false)}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 flex-1">
                  <PrivacyPolicyContent />
                </div>
                <div className="p-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(false)}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-primary"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPasswordLogin && (
          <div className="mt-6">
            <div className="text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-green-primary hover:text-green-dark font-medium"
              >
                {isLogin 
                  ? '¿No tienes cuenta? Regístrate aquí' 
                  : '¿Ya tienes cuenta? Inicia sesión'
                }
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
} 