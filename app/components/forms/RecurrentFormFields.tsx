/**
 * Reusable form fields for recurrent transactions
 */

import React from 'react'
import { 
  AVAILABLE_YEARS, 
  AVAILABLE_MONTHS, 
  RecurrentFormData, 
  ValidationError,
  formatCurrencyForInput,
  parseCurrency,
  getValidDayForMonth
} from '@/lib/validation/formValidation'

interface RecurrentFormFieldsProps {
  formData: RecurrentFormData
  onChange: (data: RecurrentFormData) => void
  errors: ValidationError[]
  className?: string
}

export default function RecurrentFormFields({ 
  formData, 
  onChange, 
  errors, 
  className = '' 
}: RecurrentFormFieldsProps) {
  
  // Get error for specific field
  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)
  }
  
  // Handle value change with currency formatting
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const numericValue = parseCurrency(rawValue)
    onChange({
      ...formData,
      value: numericValue
    })
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
  
  // Get display value for currency input
  const getValueDisplayValue = () => {
    if (formData.value === 0) return ''
    return formatCurrencyForInput(formData.value.toString())
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Description */}
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

      {/* Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Valor *
        </label>
        <input
          type="text"
          value={getValueDisplayValue()}
          onChange={handleValueChange}
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