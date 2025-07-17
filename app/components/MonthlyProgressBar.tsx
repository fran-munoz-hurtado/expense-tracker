'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { TrendingUp, Target, Award, Zap, Star, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react'
import { texts } from '@/lib/translations'
import { APP_COLORS } from '@/lib/config/colors'

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
 * Progress-based motivational messages
 */
const PROGRESS_MESSAGES = {
  perfect: [
    "¡PERFECCIÓN FINANCIERA ALCANZADA! 🎉",
    "¡MAESTRÍA TOTAL EN CONTROL FINANCIERO! 🏆",
    "¡EXCELENCIA ABSOLUTA LOGRADA! ⭐",
    "¡OBJETIVO PERFECTO CUMPLIDO! 💎",
    "¡INSPIRACIÓN FINANCIERA TOTAL! 👑"
  ],
  excellent: [
    "¡Tu maestría financiera es excepcional! ⚡",
    "¡Estás en el camino de la excelencia total! 🌟",
    "¡Tu dedicación es verdaderamente admirable! 💎",
    "¡Sigues superando tus propias expectativas! 🎯",
    "¡Tu futuro financiero es extraordinario! 👑"
  ],
  great: [
    "¡Tu excelencia financiera es notable! 🏆",
    "¡Estás alcanzando tus metas con maestría! 🎯",
    "¡Tu disciplina es verdaderamente inspiradora! ⚡",
    "¡Sigues demostrando tu compromiso! 💎",
    "¡Tu futuro financiero es extraordinario! 🌟"
  ],
  good: [
    "¡Tu consistencia financiera es admirable! 🌟",
    "¡Estás creando una base sólida! 🏗️",
    "¡Tu dedicación está dando frutos! 🎯",
    "¡Sigues fortaleciendo tu independencia! 💎",
    "¡Tu futuro financiero se ve brillante! ⭐"
  ],
  building: [
    "¡Tu disciplina financiera está creciendo! 📈",
    "¡El progreso se siente increíble! ✨",
    "¡Estás desarrollando excelentes hábitos! 🌟",
    "¡Tu futuro financiero se ve prometedor! 🎯",
    "¡Sigues fortaleciendo tu economía! 💪"
  ],
  starting: [
    "¡Estás construyendo tu futuro financiero! 🚀",
    "¡Cada decisión cuenta para tu bienestar! 💪",
    "¡El control financiero empieza aquí! 🌱",
    "¡Estás tomando las riendas de tu economía! 🎯",
    "¡Cada peso invertido en ti mismo! 💎"
  ]
}

/**
 * MonthlyProgressBar Component
 * 
 * A comprehensive financial progress component that displays monthly progress tracking
 * with overdue status detection and motivational messages.
 * 
 * Features:
 * - Single progress bar with rounded ends
 * - Real progress calculation (paid + overdue, with overdue in red)
 * - Progress tooltip shows only paid amount
 * - Dynamic color gradients (green when up-to-date, green-to-red when overdue)
 * - Always visible progress tooltip (even at 0%)
 * - Progress overview cards (paid, pending, overdue)
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

  // Memoized overdue status detection
  const hasOverdue = useMemo(() => {
    return overdue > 0
  }, [overdue])

  // Memoized message selection to prevent unnecessary re-renders
  const selectRandomMessage = useCallback((messages: string[]): string => {
    const randomIndex = Math.floor(Math.random() * messages.length)
    return messages[randomIndex]
  }, [])

  // Get appropriate message array based on progress percentage
  const getMessageArray = useCallback((percentage: number): string[] => {
    if (percentage === 100) return PROGRESS_MESSAGES.perfect
    if (percentage >= 81) return PROGRESS_MESSAGES.excellent
    if (percentage >= 61) return PROGRESS_MESSAGES.great
    if (percentage >= 41) return PROGRESS_MESSAGES.good
    if (percentage >= 21) return PROGRESS_MESSAGES.building
    return PROGRESS_MESSAGES.starting
  }, [])

  // Effect for message selection with proper cleanup
  useEffect(() => {
    const messages = getMessageArray(percentage)
    const message = selectRandomMessage(messages)
    setSelectedMessage(message)
  }, [percentage, getMessageArray, selectRandomMessage])

  // Effect for overdue message selection
  useEffect(() => {
    if (hasOverdue) {
      const overdueMessage = selectRandomMessage(OVERDUE_MESSAGES)
      setSelectedOverdueMessage(overdueMessage)
    }
  }, [hasOverdue, selectRandomMessage])

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
      // CORRECCIÓN: Si el porcentaje es 0, el tooltip va a 0%. Si es >0 y <=10, margen mínimo 5%.
      if (percentage === 0) {
        progressLeft = 0
        progressTransform = 'translateX(0%)' // Para que el tooltip salga bien pegado a la izquierda
      } else if (percentage > 0 && percentage <= 10) {
        progressLeft = 5
        progressTransform = 'translateX(-50%)'
      } else if (percentage >= 90) {
        progressLeft = Math.max(percentage - 10, 80)
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
      if (percentage >= 80) return 'from-green-primary to-green-dark'
      if (percentage >= 60) return 'from-green-primary to-green-primary'
      if (percentage >= 40) return 'from-green-light to-green-primary'
      if (percentage >= 20) return 'from-green-light to-green-primary'
      return 'from-green-light to-green-primary'
    } else {
      // When overdue: ALWAYS green to red gradient
      const paidRatio = paid / (paid + overdue)
      if (paidRatio >= 0.8) return 'from-green-primary to-error-red'
      if (paidRatio >= 0.6) return 'from-green-primary to-error-red'
      if (paidRatio >= 0.4) return 'from-green-light to-error-red'
      if (paidRatio >= 0.2) return 'from-green-light to-error-red'
      return 'from-green-light to-error-red'
    }
  }, [hasOverdue, percentage, paid, overdue])

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
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progreso del mes: ${percentage}% completado`}
    >
      {/* Enhanced Single Progress Bar with Dynamic Gradients */}
      <div className="mb-3">
        <div className="relative">
          {/* Background bar */}
          <div className="w-full h-3 bg-beige rounded-mdplus overflow-hidden shadow-inner relative">
            {/* Progreso pagado (verde) */}
            {paid > 0 && (
              <div
                className={`absolute left-0 top-0 h-full bg-green-primary transition-all duration-1000 ease-out ${overdue > 0 ? 'rounded-l-mdplus' : 'rounded-mdplus'}`}
                style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%`, zIndex: 1 }}
              />
            )}
            {/* Progreso overdue (rojo) */}
            {overdue > 0 && (
              <div
                className={`absolute top-0 h-full bg-error-red transition-all duration-1000 ease-out ${paid > 0 ? 'rounded-r-mdplus' : 'rounded-mdplus'}`}
                style={{ left: `${total > 0 ? (paid / total) * 100 : 0}%`, width: `${total > 0 ? (overdue / total) * 100 : 0}%`, zIndex: 2 }}
              />
            )}
          </div>
          {/* Tooltip de progreso pagado */}
          <div
            className="absolute -top-8 transition-all duration-1000 ease-out"
            style={{
              left: `${total > 0 ? (paid / total) * 100 : 0}%`,
              transform: 'translateX(-50%)',
              zIndex: 20
            }}
          >
            <div className="text-white text-xs px-2 py-1 rounded-mdplus shadow-soft font-medium bg-green-primary">
              <div>{percentage}%</div>
              <div className="text-xs opacity-90">{formatCurrency(paid)}</div>
            </div>
            {/* Conditional pointer - verde oscuro y tamaño armónico */}
            {((total > 0 ? (paid / total) * 100 : 0) < 98) && (
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-green-dark mx-auto"></div>
            )}
          </div>
          {/* Overdue tooltip - igual que antes */}
          {tooltipConfig.showOverdueTooltip && (
            <div
              className="absolute -top-8 transition-all duration-1000 ease-out"
              style={{
                left: tooltipConfig.isNearEnd && tooltipConfig.overdueLeft
                  ? `${tooltipConfig.overdueLeft}%`
                  : `${Math.min(totalProgressPercentage, 95)}%`,
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
              <div className="bg-error-red text-white text-xs px-2 py-1 rounded-mdplus shadow-soft font-medium">
                <div>{totalProgressPercentage}%</div>
                <div className="text-xs opacity-90">{formatCurrency(paid + overdue)}</div>
              </div>
              {(!tooltipConfig.isNearEnd || (tooltipConfig.overdueLeft && tooltipConfig.overdueLeft < 98)) && (
                <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-error-red mx-auto"></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Frase Motivadora */}
      <div className={`text-center p-1.5 rounded-mdplus border transition-all duration-300 max-w-xs mx-auto ${
        hasOverdue 
          ? 'bg-error-bg border-error-red' // Red background when there's overdue
          : 'bg-green-light border-green-primary' // Green background when up-to-date
      }`}>
        <p className={`text-sm font-medium leading-tight ${
          hasOverdue 
            ? 'text-error-red' // Red text when there's overdue
            : 'text-green-primary' // Green text when up-to-date
        }`}>
          {hasOverdue ? selectedOverdueMessage : selectedMessage}
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