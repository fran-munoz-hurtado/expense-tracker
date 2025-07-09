'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { TrendingUp, Target, Award, Zap, Star, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react'
import { texts } from '@/lib/translations'

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
 * Motivational messages for overdue amounts - focused on getting back on track
 */
const OVERDUE_MESSAGES = [
  "¡Es momento de ponerte al día! ⚡",
  "¡Actúa ahora para recuperar el control! 🎯",
  "¡No dejes que la mora crezca más! 💪",
  "¡Cada día cuenta para salir adelante! ⏰",
  "¡Tu futuro financiero te espera! 🚀",
  "¡La disciplina financiera empieza hoy! 🌟",
  "¡Tú puedes superar este desafío! 💎",
  "¡Cada peso pagado es un paso hacia la libertad! 🎯"
]

/**
 * MonthlyProgressBar Component
 * 
 * A comprehensive financial progress component that displays monthly financial overview
 * with integrated totals, progress tracking, and overdue status detection.
 * 
 * Features:
 * - Single progress bar with rounded ends
 * - Real progress calculation (paid + overdue, with overdue in red)
 * - Progress tooltip shows only paid amount
 * - Dynamic color gradients (green when up-to-date, green-to-red when overdue)
 * - Always visible progress tooltip (even at 0%)
 * - Integrated display of all financial totals
 * - Sophisticated progress bar with smooth animations
 * - Overdue status detection and warning messages
 * - Motivational messages focused on personal achievement
 * - Color-coded progress ranges with enhanced visual feedback
 * - Smart tooltip positioning to avoid overlaps
 * - Conditional overdue tooltip based on available space
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
  const [selectedOverdueMessage, setSelectedOverdueMessage] = useState<string>('')
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  // Memoized calculations for performance optimization
  const percentage = useMemo(() => {
    if (total <= 0) return 0
    const raw = (paid / total) * 100
    // If there is overdue, cap real progress at 99% to avoid confusion
    if (overdue > 0 && Math.round(raw) >= 100) return 99
    return Math.round(raw)
  }, [paid, total, overdue])

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

  // Calculate total progress (paid + overdue) for bar width - this can reach 100%
  const totalProgressPercentage = useMemo(() => {
    if (total <= 0) return 0
    const raw = ((paid + overdue) / total) * 100
    // Overdue progress can reach 100% - this is the real value
    return Math.round(raw)
  }, [paid, overdue, total])

  // Smart tooltip positioning logic - tooltips very close together at the end
  const tooltipConfig = useMemo(() => {
    const paidProgressPos = Math.min(percentage, 95)
    
    // Calculate tooltip widths as percentages of the bar (approximate)
    // Each tooltip is roughly 8-10% of the bar width
    const tooltipWidthPercent = 8 // Estimated tooltip width as % of bar
    const separationPercent = 2 // Small separation between tooltips
    
    // Progress tooltip positioning
    let progressLeft = paidProgressPos
    let progressTransform = 'translateX(-50%)'
    let showProgressPointer = true
    
    // If both tooltips are near the end, position them from 100% backwards
    const isNearEnd = hasOverdue && totalProgressPercentage >= 90
    if (isNearEnd) {
      // Position tooltips from the end (100%) backwards
      // Overdue tooltip goes first (closest to 100%)
      // Progress tooltip goes second (with separation)
      const overdueLeft = 100 - (tooltipWidthPercent / 2) // Center of overdue tooltip
      const progressLeft = overdueLeft - separationPercent - tooltipWidthPercent // Progress tooltip position
      
      return {
        progressLeft: Math.max(progressLeft, 5), // Don't go below 5%
        progressTransform: 'translateX(-50%)',
        showProgressPointer: true,
        showOverdueTooltip: hasOverdue,
        isNearEnd,
        overdueLeft: Math.max(overdueLeft, 5) // Don't go below 5%
      }
    } else if (percentage === 100) {
      progressLeft = 95
      progressTransform = 'translateX(-50%)'
      showProgressPointer = false
    } else if (hasOverdue && totalProgressPercentage < 95) {
      // Check if tooltips would overlap at the end (both close to 100%)
      const overdueTooltipPos = Math.min(totalProgressPercentage, 95)
      const minDistancePercent = tooltipWidthPercent + separationPercent // Minimum distance to prevent overlap
      
      // If progress tooltip would be too close to overdue tooltip, adjust position
      if (Math.abs(paidProgressPos - overdueTooltipPos) < minDistancePercent) {
        // Position progress tooltip to the left of overdue tooltip with proper spacing
        progressLeft = Math.max(overdueTooltipPos - minDistancePercent, 5)
        progressTransform = 'translateX(-50%)'
      }
    } else {
      // When no overdue, position normally with some edge protection
      if (percentage >= 90) {
        progressLeft = Math.max(percentage - 10, 80)
        progressTransform = 'translateX(-50%)'
      } else if (percentage <= 10) {
        progressLeft = Math.min(percentage + 10, 20)
        progressTransform = 'translateX(-50%)'
      }
    }
    
    return {
      progressLeft,
      progressTransform,
      showProgressPointer,
      showOverdueTooltip: hasOverdue, // Always show when there's overdue
      isNearEnd
    }
  }, [percentage, totalProgressPercentage, hasOverdue])

  // Dynamic gradient calculation based on overdue status
  const getProgressGradient = useCallback((): string => {
    if (!hasOverdue) {
      // When up-to-date: green gradient based on progress
      if (percentage >= 80) return 'from-green-500 to-emerald-600'
      if (percentage >= 60) return 'from-green-400 to-green-600'
      if (percentage >= 40) return 'from-green-300 to-green-500'
      if (percentage >= 20) return 'from-green-200 to-green-400'
      return 'from-green-100 to-green-300'
    } else {
      // When overdue: ALWAYS green to red gradient (no yellow/orange)
      const paidRatio = paid / (paid + overdue)
      if (paidRatio >= 0.8) return 'from-green-500 to-red-500'
      if (paidRatio >= 0.6) return 'from-green-400 to-red-500'
      if (paidRatio >= 0.4) return 'from-green-300 to-red-500'
      if (paidRatio >= 0.2) return 'from-green-200 to-red-500'
      return 'from-green-100 to-red-500'
    }
  }, [hasOverdue, percentage, paid, overdue])

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

  // Effect for overdue message selection
  useEffect(() => {
    if (hasOverdue) {
      const overdueMessage = selectRandomMessage(OVERDUE_MESSAGES)
      setSelectedOverdueMessage(overdueMessage)
    }
  }, [hasOverdue, selectRandomMessage])

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
              <p className="text-xs font-medium text-blue-700">{texts.monthlyTotal}</p>
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
              <p className="text-xs font-medium text-green-700">{texts.alreadyPaid}</p>
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
              <p className="text-xs font-medium text-yellow-700">{texts.stillPending}</p>
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
              }`}>{texts.overdueAmount}</p>
              <p className={`text-sm font-bold ${
                hasOverdue ? 'text-red-900' : 'text-gray-500'
              }`}>{formatCurrency(overdue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Single Progress Bar with Dynamic Gradients */}
      <div className="mb-6">
        <div className="relative">
          {/* Background bar */}
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            {/* Single progress bar with dynamic gradient */}
            <div
              className={`h-full bg-gradient-to-r ${getProgressGradient()} rounded-full transition-all duration-1000 ease-out ${
                isAnimating ? 'animate-pulse' : ''
              }`}
              style={{ width: `${Math.min(totalProgressPercentage, 100)}%` }}
            >
              {/* Shimmer effect */}
              <div className="h-full w-full bg-gradient-to-r from-white/30 via-white/10 to-transparent animate-pulse"></div>
            </div>
          </div>
          
          {/* Progress tooltip - always visible, shows only paid amount */}
          <div
            className="absolute -top-10 transition-all duration-1000 ease-out"
            style={{ 
              left: `${tooltipConfig.progressLeft}%`,
              transform: tooltipConfig.progressTransform,
              zIndex: 20
            }}
          >
            <div className={`text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-medium ${
              hasOverdue 
                ? 'bg-red-400' // Soft red when there's overdue
                : 'bg-green-500' // Solid green when up-to-date
            }`}>
              <div>{percentage}%</div>
              <div className="text-xs opacity-90">{formatCurrency(paid)}</div>
            </div>
            {/* Conditional pointer - hide when at the very right edge */}
            {tooltipConfig.showProgressPointer && tooltipConfig.progressLeft < 98 && (
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-current mx-auto"></div>
            )}
          </div>

          {/* Overdue tooltip - conditional and motivational */}
          {tooltipConfig.showOverdueTooltip && (
            <div 
              className="absolute -top-10 transition-all duration-1000 ease-out"
              style={{ 
                left: tooltipConfig.isNearEnd && tooltipConfig.overdueLeft
                  ? `${tooltipConfig.overdueLeft}%` // Use calculated position when near end
                  : `${Math.min(totalProgressPercentage, 95)}%`, // Normal positioning
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
              <div className="bg-rose-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-medium">
                <div>{totalProgressPercentage}%</div>
                <div className="text-xs opacity-90">{formatCurrency(paid + overdue)}</div>
              </div>
              {/* Pointer for overdue tooltip - hide when at the very right edge */}
              {(!tooltipConfig.isNearEnd || (tooltipConfig.overdueLeft && tooltipConfig.overdueLeft < 98)) && (
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-rose-500 mx-auto"></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Motivational Message with Overdue Warning */}
      <div className={`text-center p-4 rounded-xl border transition-all duration-300 ${
        hasOverdue 
          ? 'bg-red-50 border-red-200' // Red background when there's overdue
          : 'bg-green-50 border-green-200' // Green background when up-to-date
      }`}>
        <p className={`text-sm font-medium leading-relaxed mb-2 ${
          hasOverdue 
            ? 'text-red-600' // Red text when there's overdue
            : 'bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent' // Green gradient when up-to-date
        }`}>
          {hasOverdue ? selectedOverdueMessage : selectedMessage}
        </p>
        {hasOverdue && (
          <div className="flex items-center justify-center space-x-2 text-red-600 bg-red-50 rounded-lg p-2 mt-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              Atención: {formatCurrency(overdue)} ({overduePercentage}%) {texts.overdueAmount}
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