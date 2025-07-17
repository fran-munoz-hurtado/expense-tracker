'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Calendar, Target, AlertCircle } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { texts } from '@/lib/translations'
import ResumenMensual from './ResumenMensual'

interface ComoVamosViewProps {
  user: User
  navigationParams?: any
}

export default function ComoVamosView({ user, navigationParams }: ComoVamosViewProps) {
  const [loading, setLoading] = useState(true)

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 font-sans">{texts.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark font-sans">¿Cómo vamos?</h2>
          <p className="text-sm text-green-dark font-sans">Tu estado financiero general</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Resumen Mensual Component */}
          <ResumenMensual user={user} />
          
          {/* Placeholder para futuros componentes */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Target className="h-4 w-4 text-green-primary" />
                  <span className="text-gray-700 font-sans">Progreso de metas</span>
                </div>
                <span className="text-gray-500 font-sans">Próximamente</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-green-primary" />
                  <span className="text-gray-700 font-sans">Próximos vencimientos</span>
                </div>
                <span className="text-gray-500 font-sans">Próximamente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 