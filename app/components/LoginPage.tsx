'use client'

import { useState } from 'react'
import { Eye, EyeOff, User, Lock, Mail, UserPlus, LogIn } from 'lucide-react'
import { supabase, type UserInput } from '@/lib/supabase'
import { texts } from '@/lib/translations'

interface LoginPageProps {
  onLogin: (user: any) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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
    setLoading(true)

    try {
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
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLogin ? texts.login : texts.createAccount}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLogin ? (
            <>
              {texts.haveAccount}{' '}
              <button
                onClick={toggleMode}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {texts.createAccount}
              </button>
            </>
          ) : (
            <>
              {texts.noAccount}{' '}
              <button
                onClick={toggleMode}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {texts.login}
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{texts.errorOccurred}</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                      {texts.profile.name}
                    </label>
                    <div className="mt-1">
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        required={!isLogin}
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                      {texts.profile.lastName}
                    </label>
                    <div className="mt-1">
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        required={!isLogin}
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    {texts.email}
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required={!isLogin}
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Nombre de usuario
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {texts.password}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {texts.loading}
                  </div>
                ) : (
                  <div className="flex items-center">
                    {isLogin ? (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        {texts.login}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {texts.createAccount}
                      </>
                    )}
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 