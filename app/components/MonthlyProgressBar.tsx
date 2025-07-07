'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { TrendingUp, Target, Award, Zap, Star, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react'

/**
 * Interface for MonthlyProgressBar component props
 * @interface MonthlyProgressBarProps
 * @property {number} paid - Amount paid in the current month
 * @property {number} total - Total amount for the current month
 * @property {number} pending - Amount pending (not overdue)
 * @property {number} overdue - Amount overdue
 * @property {string} [className] - Additional CSS classes
 */
interface MonthlyProgressBarProps {
  paid: number
  total: number
  pending: number
  overdue: number
  className?: string
}

/**
 * Interface for progress range configuration
 * @interface ProgressRangeConfig
 */
interface ProgressRangeConfig {
  color: string
  bgColor: string
  borderColor: string
  icon: React.ComponentType<{ className?: string }>
  messages: string[]
  milestoneColor: string
  overdueColor: string
}

/**
 * Progress ranges configuration with motivational messages focused on personal achievement
 * Each range has specific colors, icons, and messages that encourage without comparison
 */
const PROGRESS_RANGES: Record<string, ProgressRangeConfig> = {
  // 0-20%: Building momentum
  '0-20': {
    color: 'from-red-400 to-orange-400',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    milestoneColor: 'bg-red-300',
    overdueColor: 'bg-red-500',
    icon: Target,
    messages: [
      "¡Estás construyendo tu futuro financiero! 🚀",
      "¡Cada decisión cuenta para tu bienestar! 💪",
      "¡El control financiero empieza aquí! 🌱",
      "¡Estás tomando las riendas de tu economía! 🎯",
      "¡Cada peso invertido en ti mismo! 💎"
    ]
  },
  // 21-40%: Gaining momentum
  '21-40': {
    color: 'from-orange-400 to-yellow-400',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    milestoneColor: 'bg-orange-300',
    overdueColor: 'bg-orange-500',
    icon: TrendingUp,
    messages: [
      "¡Tu disciplina financiera está creciendo! 📈",
      "¡El progreso se siente increíble! ✨",
      "¡Estás desarrollando excelentes hábitos! 🌟",
      "¡Tu futuro financiero se ve prometedor! 🎯",
      "¡Sigues fortaleciendo tu economía! 💪"
    ]
  },
  // 41-60%: Strong foundation
  '41-60': {
    color: 'from-yellow-400 to-green-400',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    milestoneColor: 'bg-yellow-300',
    overdueColor: 'bg-yellow-500',
    icon: Star,
    messages: [
      "¡Tu consistencia financiera es admirable! 🌟",
      "¡Estás creando una base sólida! 🏗️",
      "¡Tu dedicación está dando frutos! 🎯",
      "¡Sigues fortaleciendo tu independencia! 💎",
      "¡Tu futuro financiero se ve brillante! ⭐"
    ]
  },
  // 61-80%: Excellence in progress
  '61-80': {
    color: 'from-green-400 to-emerald-400',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    milestoneColor: 'bg-green-300',
    overdueColor: 'bg-green-500',
    icon: Award,
    messages: [
      "¡Tu excelencia financiera es notable! 🏆",
      "¡Estás alcanzando tus metas con maestría! 🎯",
      "¡Tu disciplina es verdaderamente inspiradora! ⚡",
      "¡Sigues demostrando tu compromiso! 💎",
      "¡Tu futuro financiero es extraordinario! 🌟"
    ]
  },
  // 81-99%: Near perfection
  '81-99': {
    color: 'from-emerald-400 to-teal-400',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    milestoneColor: 'bg-emerald-300',
    overdueColor: 'bg-emerald-500',
    icon: Zap,
    messages: [
      "¡Tu maestría financiera es excepcional! ⚡",
      "¡Estás en el camino de la excelencia total! 🌟",
      "¡Tu dedicación es verdaderamente admirable! 💎",
      "¡Sigues superando tus propias expectativas! 🎯",
      "¡Tu futuro financiero es extraordinario! 👑"
    ]
  },
  // 100%: Perfect achievement
  '100': {
    color: 'from-teal-400 to-cyan-400',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    milestoneColor: 'bg-teal-300',
    overdueColor: 'bg-teal-500',
    icon: Award,
    messages: [
      "¡PERFECCIÓN FINANCIERA ALCANZADA! 🎉",
      "¡MAESTRÍA TOTAL EN CONTROL FINANCIERO! 🏆",
      "¡EXCELENCIA ABSOLUTA LOGRADA! ⭐",
      "¡OBJETIVO PERFECTO CUMPLIDO! 💎",
      "¡INSPIRACIÓN FINANCIERA TOTAL! 👑"
    ]
  }
}

/**
 * MonthlyProgressBar Component
 * 
 * A comprehensive financial progress component that displays monthly financial overview
 * with integrated totals, progress tracking, and overdue status detection.
 * 
 * Features:
 * - Integrated display of all financial totals (total, paid, pending, overdue)
 * - Sophisticated progress bar with smooth animations
 * - Overdue status detection and warning messages
 * - Motivational messages focused on personal achievement
 * - Color-coded progress ranges with enhanced visual feedback
 * - Optimized performance with memoization
 * - Accessibility support with ARIA attributes
 * - Responsive design for all screen sizes
 * 
 * @param {MonthlyProgressBarProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
export default function MonthlyProgressBar({ 
  paid, 
  total, 
  pending,
  overdue,
  className = '' 
}: MonthlyProgressBarProps): JSX.Element {
  // State management with proper typing
  const [progress, setProgress] = useState<number>(0)
  const [selectedMessage, setSelectedMessage] = useState<string>('')
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  // Memoized calculations for performance optimization
  const percentage = useMemo(() => {
    return total > 0 ? Math.round((paid / total) * 100) : 0
  }, [paid, total])

  const range = useMemo(() => {
    if (percentage === 100) return '100'
    if (percentage >= 81) return '81-99'
    if (percentage >= 61) return '61-80'
    if (percentage >= 41) return '41-60'
    if (percentage >= 21) return '21-40'
    return '0-20'
  }, [percentage])

  const rangeConfig = useMemo(() => {
    return PROGRESS_RANGES[range]
  }, [range])

  const IconComponent = rangeConfig.icon

  // Memoized overdue status detection
  const hasOverdue = useMemo(() => {
    return overdue > 0
  }, [overdue])

  const overduePercentage = useMemo(() => {
    return total > 0 ? Math.round((overdue / total) * 100) : 0
  }, [overdue, total])

  // Memoized message selection to prevent unnecessary re-renders
  const selectRandomMessage = useCallback((messages: string[]): string => {
    const randomIndex = Math.floor(Math.random() * messages.length)
    return messages[randomIndex]
  }, [])

  // Effect for message selection with proper cleanup
  useEffect(() => {
    const message = selectRandomMessage(rangeConfig.messages)
    setSelectedMessage(message)
  }, [percentage, rangeConfig.messages, selectRandomMessage])

  // Effect for progress animation with proper cleanup
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setProgress(percentage)
      setIsAnimating(false)
    }, 150) // Slightly longer for smoother animation

    return () => clearTimeout(timer)
  }, [percentage])

  // Early return for edge cases
  if (total <= 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No hay datos disponibles para mostrar el progreso</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border ${rangeConfig.borderColor} p-6 ${className}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progreso del mes: ${percentage}% completado`}
    >
      {/* Header with icon and comprehensive financial overview */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg ${rangeConfig.bgColor} transition-colors duration-300`}>
            <IconComponent 
              className={`h-5 w-5 bg-gradient-to-r ${rangeConfig.color} bg-clip-text text-transparent`} 
              aria-hidden="true"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Progreso del Mes</h3>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold bg-gradient-to-r ${rangeConfig.color} bg-clip-text text-transparent`}>
            {percentage}%
          </div>
          <div className="text-xs text-gray-500">completado</div>
        </div>
      </div>

      {/* Integrated Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Total del Mes */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-200 rounded-lg">
              <DollarSign className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700">Total del mes</p>
              <p className="text-sm font-bold text-blue-900">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        {/* Ya Pagué */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-green-700">Ya pagué</p>
              <p className="text-sm font-bold text-green-900">{formatCurrency(paid)}</p>
            </div>
          </div>
        </div>

        {/* Falta Pagar */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-yellow-200 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-yellow-700">Falta pagar</p>
              <p className="text-sm font-bold text-yellow-900">{formatCurrency(pending)}</p>
            </div>
          </div>
        </div>

        {/* Se pasó la fecha */}
        <div className={`p-3 rounded-lg border ${
          hasOverdue 
            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-lg ${
              hasOverdue ? 'bg-red-200' : 'bg-gray-200'
            }`}>
              <AlertCircle className={`h-4 w-4 ${
                hasOverdue ? 'text-red-700' : 'text-gray-500'
              }`} />
            </div>
            <div>
              <p className={`text-xs font-medium ${
                hasOverdue ? 'text-red-700' : 'text-gray-500'
              }`}>Se pasó la fecha</p>
              <p className={`text-sm font-bold ${
                hasOverdue ? 'text-red-900' : 'text-gray-500'
              }`}>{formatCurrency(overdue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Progress Bar with Overdue Indicator */}
      <div className="mb-6">
        <div className="relative">
          {/* Background bar */}
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            {/* Progress bar with enhanced animations */}
            <div
              className={`h-full bg-gradient-to-r ${rangeConfig.color} rounded-full transition-all duration-1000 ease-out ${
                isAnimating ? 'animate-pulse' : ''
              }`}
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="h-full w-full bg-gradient-to-r from-white/30 via-white/10 to-transparent rounded-full animate-pulse"></div>
            </div>
            
            {/* Overdue indicator overlay */}
            {hasOverdue && (
              <div
                className={`absolute top-0 h-full ${rangeConfig.overdueColor} opacity-60 rounded-full transition-all duration-1000 ease-out`}
                style={{ 
                  left: `${Math.max(0, progress - overduePercentage)}%`,
                  width: `${Math.min(overduePercentage, 100 - Math.max(0, progress - overduePercentage))}%`
                }}
              >
                <div className="h-full w-full bg-gradient-to-r from-red-400/40 to-red-600/40 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          
          {/* Floating progress indicator with paid amount */}
          {progress > 0 && (
            <div
              className="absolute -top-10 transform -translate-x-1/2 transition-all duration-1000 ease-out"
              style={{ 
                left: (() => {
                  // Si el progreso está muy cerca del final (85% o más), mover el tooltip hacia la izquierda
                  if (progress >= 85) {
                    // Calcular una posición que deje espacio para el tooltip del total
                    const adjustedPosition = Math.max(progress - 20, 10)
                    return `${adjustedPosition}%`
                  }
                  // Si está entre 70-85%, usar una posición intermedia
                  else if (progress >= 70) {
                    return `${Math.min(progress - 5, 80)}%`
                  }
                  // Para progresos menores, usar la posición normal
                  else {
                    return `${Math.min(progress, 90)}%`
                  }
                })()
              }}
            >
              <div className={`bg-gradient-to-r ${rangeConfig.color} text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-medium`}>
                <div>{progress}%</div>
                <div className="text-xs opacity-90">{formatCurrency(paid)}</div>
              </div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-current mx-auto"></div>
            </div>
          )}

          {/* Total amount indicator at the end */}
          <div className="absolute -top-10 right-0 transform transition-all duration-1000 ease-out">
            <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-medium">
              <div>Total</div>
              <div className="text-xs opacity-90">{formatCurrency(total)}</div>
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Enhanced Motivational Message with Overdue Warning */}
      <div className={`text-center p-4 rounded-xl ${rangeConfig.bgColor} border ${rangeConfig.borderColor} transition-all duration-300`}>
        <p className={`text-sm font-medium bg-gradient-to-r ${rangeConfig.color} bg-clip-text text-transparent leading-relaxed mb-2`}>
          {selectedMessage}
        </p>
        {hasOverdue && (
          <div className="flex items-center justify-center space-x-2 text-red-600 bg-red-50 rounded-lg p-2 mt-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              Atención: {formatCurrency(overdue)} ({overduePercentage}%) se pasó la fecha
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Utility function to format currency values
 * Uses Intl.NumberFormat for proper localization and formatting
 * 
 * @param {number} value - The value to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
} 