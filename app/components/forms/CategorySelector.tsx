/**
 * Reusable category selector component
 */

import React, { useState, useEffect } from 'react'
import { ValidationError } from '@/lib/validation/formValidation'
import { getUserActiveCategories } from '@/lib/services/categoryService'

interface CategorySelectorProps {
  selectedCategory: string | undefined
  onChange: (category: string) => void
  errors: ValidationError[]
  userId: number
  className?: string
}

export default function CategorySelector({ 
  selectedCategory, 
  onChange, 
  errors, 
  userId,
  className = '' 
}: CategorySelectorProps) {
  
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  
  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true)
        const userCategories = await getUserActiveCategories(userId)
        setCategories(userCategories)
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadCategories()
  }, [userId])
  
  // Get error for category field
  const getFieldError = () => {
    return errors.find(error => error.field === 'category')
  }
  
  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoría *
        </label>
        <div className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 bg-gray-50 text-gray-500 flex items-center">
          Cargando categorías...
        </div>
      </div>
    )
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Categoría *
      </label>
      <select
        value={selectedCategory || 'Sin categoría'}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-9 px-3 text-sm rounded-md border bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all ${
          getFieldError() 
            ? 'border-red-300 focus:border-red-500' 
            : 'border-gray-300 focus:border-blue-500'
        }`}
      >
        {categories.map(category => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      {getFieldError() && (
        <p className="mt-1 text-xs text-red-600">
          {getFieldError()?.message}
        </p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        💡 Selecciona una categoría para este movimiento
      </p>
    </div>
  )
} 