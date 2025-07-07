'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, Target, Award, Zap, Star } from 'lucide-react'

interface MonthlyProgressBarProps {
  paid: number
  total: number
  className?: string
}

// Definición de rangos de progreso con mensajes motivacionales
const PROGRESS_RANGES = {
  // 0-20%: Necesita motivación inicial
  '0-20': {
    color: 'from-red-400 to-orange-400',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: Target,
    messages: [
      "¡Cada paso cuenta! 🚀",
      "¡Empieza con fuerza! 💪",
      "¡El primer paso es el más importante! 🌱",
      "¡Vamos a construir algo increíble! 🏗️",
      "¡Cada peso cuenta para tu futuro! 💰"
    ]
  },
  // 21-40%: Progreso inicial
  '21-40': {
    color: 'from-orange-400 to-yellow-400',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: TrendingUp,
    messages: [
      "¡Ya estás en movimiento! 📈",
      "¡El progreso se siente bien! ✨",
      "¡Sigues avanzando! 🎯",
      "¡Cada día es una oportunidad! 🌅",
      "¡Mantén el ritmo! 🏃‍♂️"
    ]
  },
  // 41-60%: Mitad del camino
  '41-60': {
    color: 'from-yellow-400 to-green-400',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Star,
    messages: [
      "¡Ya estás a mitad de camino! 🎯",
      "¡Excelente progreso! 🌟",
      "¡Sigues fuerte! 💪",
      "¡La constancia es tu superpoder! ⚡",
      "¡Vas por buen camino! 🛤️"
    ]
  },
  // 61-80%: Casi terminando
  '61-80': {
    color: 'from-green-400 to-emerald-400',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Award,
    messages: [
      "¡Casi llegas a la meta! 🏆",
      "¡Increíble trabajo! 🎉",
      "¡Estás muy cerca! 🎯",
      "¡El final está a la vista! 👀",
      "¡Sigue así, eres un campeón! 🏅"
    ]
  },
  // 81-99%: Casi perfecto
  '81-99': {
    color: 'from-emerald-400 to-teal-400',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: Zap,
    messages: [
      "¡Casi perfecto! ⚡",
      "¡Estás a un paso de la excelencia! 🌟",
      "¡Increíble dedicación! 💎",
      "¡El éxito está a tu alcance! 🎯",
      "¡Eres un ejemplo a seguir! 👑"
    ]
  },
  // 100%: Perfecto
  '100': {
    color: 'from-teal-400 to-cyan-400',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    icon: Award,
    messages: [
      "¡PERFECTO! ¡MISIÓN CUMPLIDA! 🎉",
      "¡100% COMPLETADO! ¡ERES INCREÍBLE! 🏆",
      "¡EXCELENCIA TOTAL! ¡FELICITACIONES! ⭐",
      "¡OBJETIVO ALCANZADO! ¡ERES UN MAESTRO! 👑",
      "¡MES PERFECTO! ¡INSPIRAS A OTROS! 🌟"
    ]
  }
}

export default function MonthlyProgressBar({ paid, total, className = '' }: MonthlyProgressBarProps) {
  const [progress, setProgress] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  // Calcular porcentaje de progreso
  const percentage = total > 0 ? Math.round((paid / total) * 100) : 0

  // Determinar el rango de progreso
  const getProgressRange = (percent: number) => {
    if (percent === 100) return '100'
    if (percent >= 81) return '81-99'
    if (percent >= 61) return '61-80'
    if (percent >= 41) return '41-60'
    if (percent >= 21) return '21-40'
    return '0-20'
  }

  const range = getProgressRange(percentage)
  const rangeConfig = PROGRESS_RANGES[range as keyof typeof PROGRESS_RANGES]
  const IconComponent = rangeConfig.icon

  // Seleccionar mensaje aleatorio
  useEffect(() => {
    const messages = rangeConfig.messages
    const randomIndex = Math.floor(Math.random() * messages.length)
    setSelectedMessage(messages[randomIndex])
  }, [percentage])

  // Animación de progreso
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setProgress(percentage)
      setIsAnimating(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${rangeConfig.borderColor} p-6 ${className}`}>
      {/* Header con icono y título */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${rangeConfig.bgColor}`}>
            <IconComponent className={`h-5 w-5 bg-gradient-to-r ${rangeConfig.color} bg-clip-text text-transparent`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Progreso del Mes</h3>
            <p className="text-sm text-gray-600">
              {formatCurrency(paid)} de {formatCurrency(total)} pagados
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold bg-gradient-to-r ${rangeConfig.color} bg-clip-text text-transparent`}>
            {percentage}%
          </div>
          <div className="text-xs text-gray-500">completado</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="relative">
          {/* Barra de fondo */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            {/* Barra de progreso animada */}
            <div
              className={`h-full bg-gradient-to-r ${rangeConfig.color} rounded-full transition-all duration-1000 ease-out ${
                isAnimating ? 'animate-pulse' : ''
              }`}
              style={{ width: `${progress}%` }}
            >
              {/* Efecto de brillo */}
              <div className="h-full w-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
            </div>
          </div>
          
          {/* Indicador de progreso flotante */}
          {progress > 0 && (
            <div
              className="absolute -top-8 transform -translate-x-1/2 transition-all duration-1000 ease-out"
              style={{ left: `${Math.min(progress, 95)}%` }}
            >
              <div className={`bg-gradient-to-r ${rangeConfig.color} text-white text-xs px-2 py-1 rounded-md shadow-lg`}>
                {progress}%
              </div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-current mx-auto"></div>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje motivacional */}
      <div className={`text-center p-3 rounded-lg ${rangeConfig.bgColor} border ${rangeConfig.borderColor}`}>
        <p className={`text-sm font-medium bg-gradient-to-r ${rangeConfig.color} bg-clip-text text-transparent`}>
          {selectedMessage}
        </p>
      </div>

      {/* Información adicional */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{formatCurrency(paid)}</div>
          <div className="text-xs text-gray-600">Pagado</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{formatCurrency(total - paid)}</div>
          <div className="text-xs text-gray-600">Pendiente</div>
        </div>
      </div>
    </div>
  )
}

// Función auxiliar para formatear moneda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
} 