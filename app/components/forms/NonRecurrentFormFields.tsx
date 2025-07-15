/**
 * Reusable form fields for non-recurrent transactions
 */

import React from 'react'
import { 
  AVAILABLE_YEARS, 
  AVAILABLE_MONTHS, 
  NonRecurrentFormData, 
  ValidationError,
  formatCurrencyForInput,
  parseCurrency
} from '@/lib/validation/formValidation'

interface NonRecurrentFormFieldsProps {
  formData: NonRecurrentFormData
  onChange: (data: NonRecurrentFormData) => void
  errors: ValidationError[]
  className?: string
}

export default function NonRecurrentFormFields({ 
  formData, 
  onChange, 
  errors, 
  className = '' 
}: NonRecurrentFormFieldsProps) {
  
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
          placeholder="Ej: Compra de mercado"
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

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mes</label>
            <select
              value={formData.month}
              onChange={(e) => onChange({
                ...formData,
                month: parseInt(e.target.value)
              })}
              className={`w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                getFieldError('month') 
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
            {getFieldError('month') && (
              <p className="mt-1 text-sm text-red-600">
                {getFieldError('month')?.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Año</label>
            <select
              value={formData.year}
              onChange={(e) => onChange({
                ...formData,
                year: parseInt(e.target.value)
              })}
              className={`w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-blue-100 transition-all ${
                getFieldError('year') 
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
            {getFieldError('year') && (
              <p className="mt-1 text-sm text-red-600">
                {getFieldError('year')?.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Deadline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha de vencimiento
          <span className="text-xs text-gray-500 ml-1">(opcional)</span>
        </label>
        <input
          type="date"
          value={formData.payment_deadline || ''}
          onChange={(e) => onChange({
            ...formData,
            payment_deadline: e.target.value || undefined
          })}
          className={`w-full px-4 py-3 rounded-xl border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all text-base ${
            getFieldError('payment_deadline') 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-blue-500'
          }`}
        />
        {getFieldError('payment_deadline') && (
          <p className="mt-1 text-sm text-red-600">
            {getFieldError('payment_deadline')?.message}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          💡 Puedes ingresar fechas históricas para migrar datos anteriores
        </p>
      </div>
    </div>
  )
} 