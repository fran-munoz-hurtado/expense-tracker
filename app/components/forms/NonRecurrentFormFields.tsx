/**
 * Reusable form fields for non-recurrent transactions
 */

import React, { useState, useEffect } from 'react'
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
  
  // Local state for input value to allow free typing
  const [inputValue, setInputValue] = useState<string>('')
  
  // Initialize input value when formData.value changes from external source
  useEffect(() => {
    if (formData.value === 0) {
      setInputValue('')
    } else if (inputValue === '') {
      // Only update if input is empty (to avoid overriding user typing)
      setInputValue(formData.value.toString())
    }
  }, [formData.value])
  
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
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
          className={`w-full h-9 px-3 text-sm rounded-md border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400 ${
            getFieldError('description') 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-300 focus:border-blue-500'
          }`}
          maxLength={200}
        />
        {getFieldError('description') && (
          <p className="mt-1 text-xs text-red-600">
            {getFieldError('description')?.message}
          </p>
        )}
      </div>

      {/* Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Valor *
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={handleValueChange}
          onBlur={handleValueBlur}
          placeholder="$0"
          className={`w-full h-9 px-3 text-sm rounded-md border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400 ${
            getFieldError('value') 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {getFieldError('value') && (
          <p className="mt-1 text-xs text-red-600">
            {getFieldError('value')?.message}
          </p>
        )}
      </div>

      {/* Date */}
      <fieldset className="border border-gray-100 rounded-md px-3 py-2">
        <legend className="text-sm font-medium text-gray-700 px-2">
          Fecha *
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mes</label>
            <select
              value={formData.month}
              onChange={(e) => onChange({
                ...formData,
                month: parseInt(e.target.value)
              })}
              className={`w-full h-9 px-2 text-sm rounded-md border bg-white focus:ring-2 focus:ring-blue-100 transition-all ${
                getFieldError('month') 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            >
              {AVAILABLE_MONTHS.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {getFieldError('month') && (
              <p className="mt-1 text-xs text-red-600">
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
              className={`w-full h-9 px-2 text-sm rounded-md border bg-white focus:ring-2 focus:ring-blue-100 transition-all ${
                getFieldError('year') 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            >
              {AVAILABLE_YEARS.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {getFieldError('year') && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError('year')?.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Payment Deadline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
          className={`w-full h-9 px-3 text-sm rounded-md border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all ${
            getFieldError('payment_deadline') 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {getFieldError('payment_deadline') && (
          <p className="mt-1 text-xs text-red-600">
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