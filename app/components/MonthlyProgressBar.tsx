'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { TrendingUp, Target, Award, Zap, Star, CheckCircle } from 'lucide-react'

/**
 * Interface for MonthlyProgressBar component props
 * @interface MonthlyProgressBarProps
 * @property {number} paid - Amount paid in the current month
 * @property {number} total - Total amount for the current month
 * @property {string} [className] - Additional CSS classes
 */
interface MonthlyProgressBarProps {
  paid: number
  total: number
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
 * A sophisticated progress bar component that displays monthly financial progress
 * with motivational messages and smooth animations.
 * 
 * Features:
 * - Responsive design with accessibility support
 * - Smooth animations and transitions
 * - Motivational messages focused on personal achievement
 * - Color-coded progress ranges
 * - Optimized performance with memoization
 * 
 * @param {MonthlyProgressBarProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
export default function MonthlyProgressBar({ 
  paid, 
  total, 
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
      {/* Header with icon and title */}
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

      {/* Progress bar */}
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
          </div>
          
          {/* Floating progress indicator */}
          {progress > 0 && (
            <div
              className="absolute -top-10 transform -translate-x-1/2 transition-all duration-1000 ease-out"
              style={{ left: `${Math.min(progress, 95)}%` }}
            >
              <div className={`bg-gradient-to-r ${rangeConfig.color} text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-medium`}>
                {progress}%
              </div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-current mx-auto"></div>
            </div>
          )}
        </div>
      </div>

      {/* Motivational message */}
      <div className={`text-center p-4 rounded-xl ${rangeConfig.bgColor} border ${rangeConfig.borderColor} transition-all duration-300`}>
        <p className={`text-sm font-medium bg-gradient-to-r ${rangeConfig.color} bg-clip-text text-transparent leading-relaxed`}>
          {selectedMessage}
        </p>
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