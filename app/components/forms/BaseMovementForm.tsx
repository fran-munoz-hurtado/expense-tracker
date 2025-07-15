/**
 * Base movement form component - orchestrates all form components
 */

import React, { useState, useEffect } from 'react'
import { MovementType, getMovementConfig } from '@/lib/config/icons'
import { User } from '@/lib/supabase'
import { 
  FORM_CONFIGS,
  RecurrentFormData,
  NonRecurrentFormData,
  ValidationError,
  validateRecurrentForm,
  validateNonRecurrentForm,
  validateCategory,
  getFormConfig,
  getDefaultRecurrentFormData,
  getDefaultNonRecurrentFormData
} from '@/lib/validation/formValidation'
import RecurrentFormFields from './RecurrentFormFields'
import NonRecurrentFormFields from './NonRecurrentFormFields'
import CategorySelector from './CategorySelector'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface BaseMovementFormProps {
  movementType: MovementType
  user: User
  onSubmit: (payload: any) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  className?: string
}

export default function BaseMovementForm({
  movementType,
  user,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = ''
}: BaseMovementFormProps) {
  
  // Get form configuration
  const config = getFormConfig(movementType)
  const movementConfig = getMovementConfig(movementType)
  
  // Form state
  const [recurrentFormData, setRecurrentFormData] = useState<RecurrentFormData>(getDefaultRecurrentFormData())
  const [nonRecurrentFormData, setNonRecurrentFormData] = useState<NonRecurrentFormData>(getDefaultNonRecurrentFormData())
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(config.defaultCategory || undefined)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  
  // Initialize form data with defaults
  useEffect(() => {
    if (config.defaultCategory) {
      setSelectedCategory(config.defaultCategory)
    }
  }, [config.defaultCategory])
  
  // Validate form data
  const validateForm = (): ValidationError[] => {
    let formErrors: ValidationError[] = []
    
    if (config.formType === 'recurrent') {
      const result = validateRecurrentForm(recurrentFormData)
      formErrors = result.errors
    } else {
      const result = validateNonRecurrentForm(nonRecurrentFormData)
      formErrors = result.errors
    }
    
    // Validate category if required
    if (config.showCategorySelector) {
      const categoryError = validateCategory(selectedCategory, config.showCategorySelector)
      if (categoryError) {
        formErrors.push(categoryError)
      }
    }
    
    return formErrors
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    
    // Validate form
    const validationErrors = validateForm()
    setErrors(validationErrors)
    
    if (validationErrors.length > 0) {
      setIsValidating(false)
      return
    }
    
    try {
      // Construct payload based on form type
      const payload = constructPayload()
      await onSubmit(payload)
    } catch (error) {
      console.error('Form submission error:', error)
      setErrors([{
        field: 'submit',
        message: 'Error al enviar el formulario. Por favor intenta nuevamente.',
        code: 'SUBMIT_ERROR'
      }])
    } finally {
      setIsValidating(false)
    }
  }
  
  // Construct payload for submission
  const constructPayload = () => {
    const basePayload = {
      user_id: user.id,
      type: config.type,
      category: selectedCategory || config.defaultCategory,
      isgoal: config.isgoal
    }
    
    if (config.formType === 'recurrent') {
      return {
        ...basePayload,
        ...recurrentFormData,
        // Apply smart day logic if needed
        payment_day_deadline: recurrentFormData.payment_day_deadline || null
      }
    } else {
      return {
        ...basePayload,
        ...nonRecurrentFormData,
        payment_deadline: nonRecurrentFormData.payment_deadline || null
      }
    }
  }
  
  // Get submit button text based on movement type
  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Creando...'
    if (isValidating) return 'Validando...'
    return `Crear ${movementConfig.label}`
  }
  
  // Get form title and description
  const getFormTitle = () => {
    return `Crear ${movementConfig.label}`
  }
  
  const getFormDescription = () => {
    return movementConfig.description
  }
  
  // Check if form has errors
  const hasErrors = errors.length > 0
  const submitError = errors.find(error => error.field === 'submit')
  
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${movementConfig.color}-100`}>
            <movementConfig.icon className={`h-5 w-5 text-${movementConfig.color}-600`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getFormTitle()}
            </h3>
            <p className="text-sm text-gray-600">
              {getFormDescription()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Form Fields */}
        {config.formType === 'recurrent' ? (
          <RecurrentFormFields
            formData={recurrentFormData}
            onChange={setRecurrentFormData}
            errors={errors}
          />
        ) : (
          <NonRecurrentFormFields
            formData={nonRecurrentFormData}
            onChange={setNonRecurrentFormData}
            errors={errors}
          />
        )}
        
        {/* Category Selector */}
        {config.showCategorySelector && (
          <CategorySelector
            selectedCategory={selectedCategory}
            onChange={setSelectedCategory}
            errors={errors}
          />
        )}
        
        {/* Category Info for Fixed Categories */}
        {!config.showCategorySelector && config.defaultCategory && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Categoría: {config.defaultCategory}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Esta categoría se asignará automáticamente
            </p>
          </div>
        )}
        
        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                {submitError.message}
              </span>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isValidating}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isValidating || hasErrors}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {(isSubmitting || isValidating) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span>{getSubmitButtonText()}</span>
          </button>
        </div>
      </form>
    </div>
  )
} 