/**
 * Reusable form fields for recurrent transactions
 */

import React, { useState, useEffect } from 'react'
import { 
  AVAILABLE_YEARS, 
  AVAILABLE_MONTHS, 
  RecurrentFormData, 
  ValidationError,
  formatCurrencyForInput,
  parseCurrency,
  getValidDayForMonth,
  calculateEndDateFromInstallments,
  calculateInstallmentsFromDateRange,
  validateInstallments,
  formatInstallmentPreview
} from '@/lib/validation/formValidation'
import { Calendar, Target, Info } from 'lucide-react'

interface RecurrentFormFieldsProps {
  formData: RecurrentFormData
  onChange: (data: RecurrentFormData) => void
  errors: ValidationError[]
  className?: string
  isGoal?: boolean
  hideDescription?: boolean
  onGoalValidationChange?: (data: {
    goalInputMode: 'date_range' | 'installments'
    installments: number
  }) => void
}

export default function RecurrentFormFields({ 
  formData, 
  onChange, 
  errors, 
  className = '',
  isGoal = false,
  hideDescription = false,
  onGoalValidationChange
}: RecurrentFormFieldsProps) {
  
  // Local state for input value to allow free typing
  const [inputValue, setInputValue] = useState<string>('')
  
  // Goal-specific state
  const [goalInputMode, setGoalInputMode] = useState<'date_range' | 'installments'>('date_range')
  const [installments, setInstallments] = useState<number>(1)
  const [installmentsInputValue, setInstallmentsInputValue] = useState<string>('1')
  
  // Initialize input value when formData.value changes from external source
  useEffect(() => {
    if (formData.value === 0) {
      setInputValue('')
    } else if (inputValue === '') {
      // Only update if input is empty (to avoid overriding user typing)
      setInputValue(formData.value.toString())
    }
  }, [formData.value])
  
  // Initialize installments when form data changes (for goals)
  useEffect(() => {
    if (isGoal && goalInputMode === 'installments') {
      const calculatedInstallments = calculateInstallmentsFromDateRange(
        formData.month_from,
        formData.year_from,
        formData.month_to,
        formData.year_to
      )
      setInstallments(calculatedInstallments)
      setInstallmentsInputValue(calculatedInstallments.toString())
    }
  }, [formData.month_from, formData.year_from, formData.month_to, formData.year_to, isGoal, goalInputMode])
  
  // Synchronize installments input value when installments state changes
  useEffect(() => {
    if (isGoal && goalInputMode === 'installments') {
      setInstallmentsInputValue(installments.toString())
    }
  }, [installments, isGoal, goalInputMode])
  
  // Get error for specific field
  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)
  }
  
  // Handle value change with better UX
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setInputValue(rawValue)
    
    // Parse and update the numeric value
    const numericValue = parseCurrency(rawValue)
    onChange({
      ...formData,
      value: numericValue
    })
  }
  
  // Handle input blur to format the value
  const handleValueBlur = () => {
    if (inputValue.trim() === '') {
      setInputValue('')
      onChange({
        ...formData,
        value: 0
      })
      return
    }
    
    const numericValue = parseCurrency(inputValue)
    if (numericValue > 0) {
      const formattedValue = numericValue.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
      setInputValue(formattedValue)
    }
  }
  
  // Handle payment day change with smart day logic
  const handlePaymentDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = parseInt(e.target.value)
    if (isNaN(day)) {
      onChange({
        ...formData,
        payment_day_deadline: undefined
      })
      return
    }
    
    // Apply smart day logic
    const validDay = getValidDayForMonth(day, formData.year_from, formData.month_from)
    onChange({
      ...formData,
      payment_day_deadline: validDay
    })
  }
  
  // Handle installment input change
  const handleInstallmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setInstallmentsInputValue(rawValue)
    
    // Allow empty input while user is typing
    if (rawValue === '') {
      return
    }
    
    const value = parseInt(rawValue)
    
    // Only update if it's a valid positive number
    if (!isNaN(value) && value > 0) {
      setInstallments(value)
      
      // Calculate and update end date
      const { endMonth, endYear } = calculateEndDateFromInstallments(
        formData.month_from,
        formData.year_from,
        value
      )
      
      onChange({
        ...formData,
        month_to: endMonth,
        year_to: endYear
      })
      
      // Notify parent of validation data change
      onGoalValidationChange?.({
        goalInputMode,
        installments: value
      })
    }
    // If invalid, don't update state but allow the user to keep typing
  }
  
  // Handle goal input mode change
  const handleGoalInputModeChange = (mode: 'date_range' | 'installments') => {
    setGoalInputMode(mode)
    
    // If switching to installments, calculate current installments
    if (mode === 'installments') {
      const calculatedInstallments = calculateInstallmentsFromDateRange(
        formData.month_from,
        formData.year_from,
        formData.month_to,
        formData.year_to
      )
      setInstallments(calculatedInstallments)
      setInstallmentsInputValue(calculatedInstallments.toString())
      
      // Notify parent of validation data change
      onGoalValidationChange?.({
        goalInputMode: mode,
        installments: calculatedInstallments
      })
    } else {
      // Notify parent of validation data change
      onGoalValidationChange?.({
        goalInputMode: mode,
        installments: installments
      })
    }
  }
  
  // Notify parent of validation data changes
  useEffect(() => {
    if (isGoal && onGoalValidationChange) {
      onGoalValidationChange({
        goalInputMode,
        installments
      })
    }
  }, [isGoal, goalInputMode, installments, onGoalValidationChange])
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Description */}
      {!hideDescription && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => onChange({
              ...formData,
              description: e.target.value
            })}
            placeholder="Ej: Arriendo del apartamento"
            className={`w-full px-4 py-3 rounded-xl border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400 ${
              getFieldError('description') 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
            maxLength={200}
          />
          {getFieldError('description') && (
            <p className="mt-1 text-sm text-red-600">
              {getFieldError('description')?.message}
            </p>
          )}
        </div>
      )}

      {/* Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Valor *
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={handleValueChange}
          onBlur={handleValueBlur}
          placeholder="$0"
          className={`w-full px-4 py-3 rounded-xl border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400 ${
            getFieldError('value') 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-blue-500'
          }`}
        />
        {getFieldError('value') && (
          <p className="mt-1 text-sm text-red-600">
            {getFieldError('value')?.message}
          </p>
        )}
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Período *
        </label>
        
        {/* Goal-specific input mode toggle */}
        {isGoal && (
          <div className="mb-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleGoalInputModeChange('date_range')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  goalInputMode === 'date_range'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-1" />
                Rango de fechas
              </button>
              <button
                type="button"
                onClick={() => handleGoalInputModeChange('installments')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  goalInputMode === 'installments'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Target className="h-4 w-4 inline mr-1" />
                Número de cuotas
              </button>
            </div>
          </div>
        )}
        
        {/* Conditional rendering based on goal input mode */}
        {(!isGoal || goalInputMode === 'date_range') ? (
          // Traditional date range input
          <div className="grid grid-cols-2 gap-4">
            {/* From */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.month_from}
                  onChange={(e) => onChange({
                    ...formData,
                    month_from: parseInt(e.target.value)
                  })}
                  className={`px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                    getFieldError('month_from') || getFieldError('temporal_range')
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                >
                  {AVAILABLE_MONTHS.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.year_from}
                  onChange={(e) => onChange({
                    ...formData,
                    year_from: parseInt(e.target.value)
                  })}
                  className={`px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                    getFieldError('year_from') || getFieldError('temporal_range')
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                >
                  {AVAILABLE_YEARS.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* To */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.month_to}
                  onChange={(e) => onChange({
                    ...formData,
                    month_to: parseInt(e.target.value)
                  })}
                  className={`px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                    getFieldError('month_to') || getFieldError('temporal_range')
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                >
                  {AVAILABLE_MONTHS.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.year_to}
                  onChange={(e) => onChange({
                    ...formData,
                    year_to: parseInt(e.target.value)
                  })}
                  className={`px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                    getFieldError('year_to') || getFieldError('temporal_range')
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                >
                  {AVAILABLE_YEARS.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          // Installments input mode
          <div className="space-y-4">
            {/* Start date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha de inicio</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.month_from}
                  onChange={(e) => onChange({
                    ...formData,
                    month_from: parseInt(e.target.value)
                  })}
                  className={`px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                    getFieldError('month_from') || getFieldError('temporal_range')
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                >
                  {AVAILABLE_MONTHS.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.year_from}
                  onChange={(e) => onChange({
                    ...formData,
                    year_from: parseInt(e.target.value)
                  })}
                  className={`px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                    getFieldError('year_from') || getFieldError('temporal_range')
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                >
                  {AVAILABLE_YEARS.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Number of installments */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Número de cuotas</label>
              <input
                type="number"
                min="1"
                max="240"
                value={installmentsInputValue}
                onChange={handleInstallmentsChange}
                className={`w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                  getFieldError('installments')
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-blue-500'
                }`}
                placeholder="Ej: 12, 180 (15 años)"
              />
              {getFieldError('installments') && (
                <p className="mt-1 text-sm text-red-600">
                  {getFieldError('installments')?.message}
                </p>
              )}
            </div>
            
            {/* Preview */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-yellow-700">
                  {formatInstallmentPreview(formData.month_from, formData.year_from, installments)}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {(getFieldError('temporal_range') || getFieldError('month_from') || getFieldError('year_from')) && (
          <p className="mt-1 text-sm text-red-600">
            {getFieldError('temporal_range')?.message || 
             getFieldError('month_from')?.message || 
             getFieldError('year_from')?.message}
          </p>
        )}
      </div>

      {/* Payment Day */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Día de pago
          <span className="text-xs text-gray-500 ml-1">(opcional)</span>
        </label>
        <input
          type="number"
          min="1"
          max="31"
          value={formData.payment_day_deadline || ''}
          onChange={handlePaymentDayChange}
          placeholder="Día del mes (1-31)"
          className={`w-full px-4 py-3 rounded-xl border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all text-base placeholder-gray-400 ${
            getFieldError('payment_day_deadline') 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-blue-500'
          }`}
        />
        {getFieldError('payment_day_deadline') && (
          <p className="mt-1 text-sm text-red-600">
            {getFieldError('payment_day_deadline')?.message}
          </p>
        )}
        {formData.payment_day_deadline && (
          <p className="mt-1 text-xs text-gray-500">
            💡 Si el día no existe en algún mes, se usará el último día válido
          </p>
        )}
      </div>
    </div>
  )
}