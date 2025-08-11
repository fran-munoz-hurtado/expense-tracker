'use client'

import { useState } from 'react'
import { Eye, EyeOff, User, Mail, Lock, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UserInput } from '@/lib/supabase'
import { handleSupabaseSignUp, handleSupabaseLogin, type SupabaseSignUpData, type SupabaseLoginData } from '@/lib/services/supabaseAuth'
import { texts } from '@/lib/translations'

interface LoginPageProps {
  onLogin: (user: any) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Toggle between legacy and Supabase Auth
  const [useSupabaseAuth, setUseSupabaseAuth] = useState(false)
  
  // Form data
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
      if (useSupabaseAuth) {
        // NEW: Supabase Auth flow
        if (isLogin) {
          // Supabase Auth Login
          const result = await handleSupabaseLogin({
            email: formData.email,
            password: formData.password
          })

          if (!result.success) {
            throw new Error(result.error)
          }

          // Get user data from our users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', result.user!.id)
            .single()

          if (userError) {
            console.error('Error fetching user data:', userError)
            // If user doesn't exist in our table, create a basic record
            const basicUserData = {
              id: result.user!.id,
              first_name: result.user!.user_metadata?.first_name || '',
              last_name: result.user!.user_metadata?.last_name || '',
              username: result.user!.email!,
              email: result.user!.email!,
              password_hash: '',
              status: 'active' as const,
              created_at: result.user!.created_at
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
            lastName: formData.last_name
          })

          if (!result.success) {
            throw new Error(result.error)
          }

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
      } else {
        // EXISTING: Legacy auth flow (unchanged)
        if (isLogin) {
          // Login logic
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', formData.username)
            .eq('password_hash', formData.password) // In production, use proper password hashing
            .eq('status', 'active')
            .single()

          if (error) {
            throw new Error('Usuario o contraseña incorrectos')
          }

          if (!data) {
            throw new Error('Usuario o contraseña incorrectos')
          }

          onLogin(data)
        } else {
          // Registration logic
          const userData: UserInput = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            username: formData.username,
            email: formData.email,
            password_hash: formData.password, // In production, hash the password
            status: 'active'
          }

          const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single()

          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              if (error.message.includes('username')) {
                throw new Error('El nombre de usuario ya existe')
              } else if (error.message.includes('email')) {
                throw new Error('El correo electrónico ya existe')
              }
            }
            throw new Error('Error al crear la cuenta')
          }

          onLogin(data)
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

  const toggleAuthMethod = () => {
    setUseSupabaseAuth(!useSupabaseAuth)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            {isLogin ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin 
              ? 'Accede a tu cuenta de gastos' 
              : 'Comienza a gestionar tus finanzas'
            }
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Authentication Method Toggle */}
          <div className="mb-6">
            <div className="flex justify-center">
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button
                  type="button"
                  onClick={toggleAuthMethod}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    !useSupabaseAuth 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔒 Sistema Actual
                </button>
                <button
                  type="button"
                  onClick={toggleAuthMethod}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    useSupabaseAuth 
                      ? 'bg-green-primary text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ✨ Supabase Auth
                </button>
              </div>
            </div>
            {useSupabaseAuth && (
              <p className="mt-2 text-xs text-center text-green-600">
                🔐 Sistema seguro con cifrado y gestión automática de sesiones
              </p>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
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
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
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
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                      placeholder="Tu apellido"
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </>
            )}

            {/* Username field - only for legacy system */}
            {!useSupabaseAuth && (
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
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                    placeholder="Nombre de usuario"
                  />
                  <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>
            )}

            {/* Email field - required for Supabase Auth, optional for legacy */}
            {(useSupabaseAuth || !isLogin) && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required={useSupabaseAuth}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
                    placeholder="tu@correo.com"
                  />
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>
            )}

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
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-primary focus:border-green-primary"
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
              {useSupabaseAuth && !isLogin && (
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>

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
          </form>

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
        </div>
      </div>
    </div>
  )
} 