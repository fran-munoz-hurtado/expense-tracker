/**
 * Reusable category selector component
 */

import React from 'react'
import { CATEGORIES } from '@/lib/config/constants'
import { ValidationError } from '@/lib/validation/formValidation'

interface CategorySelectorProps {
  selectedCategory: string | undefined
  onChange: (category: string) => void
  errors: ValidationError[]
  className?: string
}

export default function CategorySelector({ 
  selectedCategory, 
  onChange, 
  errors, 
  className = '' 
}: CategorySelectorProps) {
  
  // Get error for category field
  const getFieldError = () => {
    return errors.find(error => error.field === 'category')
  }
  
  // Available expense categories
  const expenseCategories = Object.values(CATEGORIES.EXPENSE)
  
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Categoría *
      </label>
      <select
        value={selectedCategory || 'Sin categoría'}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all text-base ${
          getFieldError() 
            ? 'border-red-300 focus:border-red-500' 
            : 'border-gray-200 focus:border-blue-500'
        }`}
      >
        <option value="Sin categoría">Sin categoría</option>
        {expenseCategories.map(category => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      {getFieldError() && (
        <p className="mt-1 text-sm text-red-600">
          {getFieldError()?.message}
        </p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        💡 Selecciona una categoría para este movimiento
      </p>
    </div>
  )
} 