/**
 * Base movement form component - orchestrates all form components
 */

import React, { useState, useEffect, useCallback } from 'react'
import { MovementType, getMovementConfig, MOVEMENT_TYPES } from '@/lib/config/icons'
import { User } from '@/lib/supabase'
import { 
  FORM_CONFIGS,
  RecurrentFormData,
  NonRecurrentFormData,
  ValidationError,
  validateRecurrentForm,
  validateRecurrentFormWithGoals,
  validateNonRecurrentForm,
  validateCategory,
  getFormConfig,
  getDefaultRecurrentFormData,
  getDefaultNonRecurrentFormData
} from '@/lib/validation/formValidation'
import RecurrentFormFields from './RecurrentFormFields'
import NonRecurrentFormFields from './NonRecurrentFormFields'
import CategorySelector from './CategorySelector'
import TransactionIcon from '../TransactionIcon'
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
  const [recurrentFormData, setRecurrentFormData] = useState<RecurrentFormData>(getDefaultRecurrentFormData(movementType))
  const [nonRecurrentFormData, setNonRecurrentFormData] = useState<NonRecurrentFormData>(getDefaultNonRecurrentFormData(movementType))
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  
  // Goal-specific state for validation
  const [goalValidationData, setGoalValidationData] = useState<{
    goalInputMode: 'date_range' | 'installments'
    installments: number
  }>({
    goalInputMode: 'date_range',
    installments: 1
  })
  
  // Get current category value from the appropriate form data
  const getCurrentCategory = (): string | undefined => {
    if (config.formType === 'recurrent') {
      return recurrentFormData.category
    } else {
      return nonRecurrentFormData.category
    }
  }
  
  // Update category in the appropriate form data
  const updateCategory = (category: string) => {
    if (config.formType === 'recurrent') {
      setRecurrentFormData({
        ...recurrentFormData,
        category
      })
    } else {
      setNonRecurrentFormData({
        ...nonRecurrentFormData,
        category
      })
    }
  }
  
  // Validate form data
  const validateForm = useCallback(() => {
    let formErrors: ValidationError[] = []
    
    if (config.formType === 'recurrent') {
      // Use extended validation for goals
      if (config.isgoal) {
        const result = validateRecurrentFormWithGoals(
          recurrentFormData,
          true,
          goalValidationData.goalInputMode,
          goalValidationData.installments,
          movementType
        )
        formErrors = result.errors
      } else {
        const result = validateRecurrentForm(recurrentFormData, movementType)
        formErrors = result.errors
      }
    } else {
      const result = validateNonRecurrentForm(nonRecurrentFormData)
      formErrors = result.errors
    }
    
    // Validate category if required
    if (config.showCategorySelector) {
      const categoryError = validateCategory(getCurrentCategory(), config.showCategorySelector)
      if (categoryError) {
        formErrors.push(categoryError)
      }
    }
    
    return formErrors
  }, [
    recurrentFormData,
    nonRecurrentFormData,
    config.formType,
    config.showCategorySelector,
    config.isgoal,
    goalValidationData,
    movementType
  ])
  
  // Real-time validation - runs whenever form data changes
  useEffect(() => {
    const validationErrors = validateForm()
    setErrors(validationErrors)
  }, [validateForm])
  
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
      // isgoal is handled separately below based on form type
    }
    
    if (config.formType === 'recurrent') {
      // Get final category - use default if not set
      let finalCategory = recurrentFormData.category
      if (!finalCategory) {
        finalCategory = config.showCategorySelector ? 'sin categoría' : config.defaultCategory!
      } else if (finalCategory === 'Sin categoría') {
        finalCategory = 'sin categoría'  // Normalize for database
      }
      
      // For SAVINGS type, force description to "Ahorro"
      let finalDescription = recurrentFormData.description
      if (movementType === 'SAVINGS') {
        finalDescription = 'Ahorro'
      }
      
      console.log('🏷️ Category debug (recurrent):', {
        formDataCategory: recurrentFormData.category,
        showCategorySelector: config.showCategorySelector,
        defaultCategory: config.defaultCategory,
        finalCategory,
        movementType: movementType
      })
      
      return {
        ...basePayload,
        ...recurrentFormData,
        description: finalDescription,
        category: finalCategory,
        payment_day_deadline: recurrentFormData.payment_day_deadline || null,
        isgoal: config.isgoal  // Only include isgoal for recurrent movements
      }
    } else {
      // Get final category - use default if not set
      let finalCategory = nonRecurrentFormData.category
      if (!finalCategory) {
        finalCategory = config.showCategorySelector ? 'sin categoría' : config.defaultCategory!
      } else if (finalCategory === 'Sin categoría') {
        finalCategory = 'sin categoría'  // Normalize for database
      }
      
      console.log('🏷️ Category debug (non-recurrent):', {
        formDataCategory: nonRecurrentFormData.category,
        showCategorySelector: config.showCategorySelector,
        defaultCategory: config.defaultCategory,
        finalCategory,
        movementType: movementType
      })
      
      return {
        ...basePayload,
        ...nonRecurrentFormData,
        category: finalCategory,
        payment_deadline: nonRecurrentFormData.payment_deadline || null
        // isgoal is NOT included because non_recurrent_expenses table doesn't have this column
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
  
  // Generate header icon using the same system as the selection view
  const getHeaderIcon = () => {
    // Create a mock transaction to use with TransactionIcon
    const mockTransaction = {
      id: 0,
      user_id: typeof user?.id === 'string' ? parseInt(user.id) : (user?.id || 0),
      description: '',
      value: 0,
      month: 1,
      year: 2025,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deadline: null,
      notes: null,
      status: 'pending' as const,
      // Movement type specific properties
      type: MOVEMENT_TYPES[movementType].type,
      source_type: MOVEMENT_TYPES[movementType].source_type,
      source_id: 1,
      category: movementType === 'SAVINGS' ? 'Ahorro' : 'general',
    }
    
    // Mock recurrentGoalMap - only GOAL should be true
    const mockRecurrentGoalMap = {
      1: movementType === 'GOAL'
    }
    
    return (
      <TransactionIcon 
        transaction={mockTransaction}
        recurrentGoalMap={mockRecurrentGoalMap}
        size="w-4 h-4"
        showBackground={true}
      />
    )
  }
  
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {getHeaderIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getFormTitle()}
            </h3>
            <p className="text-xs text-gray-500">
              {getFormDescription()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {/* Form Fields */}
        {config.formType === 'recurrent' ? (
          <RecurrentFormFields
            formData={recurrentFormData}
            onChange={setRecurrentFormData}
            errors={errors}
            isGoal={config.isgoal}
            hideDescription={movementType === 'SAVINGS'}
            onGoalValidationChange={setGoalValidationData}
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
            selectedCategory={getCurrentCategory()}
            onChange={updateCategory}
            errors={errors}
            userId={user.id}
          />
        )}
        
        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                {submitError.message}
              </span>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isValidating}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isValidating || hasErrors}
            className="px-4 py-2 text-sm bg-green-primary text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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