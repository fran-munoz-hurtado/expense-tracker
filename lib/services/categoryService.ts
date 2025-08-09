import { supabase } from '@/lib/supabase'

// Reference list of original default category names
export const DEFAULT_CATEGORY_NAMES = [
  'Sin categoría',
  'Mercado y comida',
  'Casa y servicios',
  'Transporte',
  'Salud',
  'Diversión',
  'Otros'
] as const

export interface CategoryInfo {
  name: string
  isDefault: boolean
}

/**
 * Get active categories for a user from user_categories table
 */
export async function getUserActiveCategories(userId: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_categories')
      .select('category_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('category_name')

    if (error) {
      console.error('Error fetching user categories:', error)
      // Fallback to hardcoded categories if database fails
      return ['Sin categoría', 'Mercado y comida', 'Casa y servicios', 'Transporte', 'Salud', 'Diversión', 'Otros']
    }

    return data?.map(item => item.category_name) || []
  } catch (error) {
    console.error('Error in getUserActiveCategories:', error)
    // Fallback to hardcoded categories if service fails
    return ['Sin categoría', 'Mercado y comida', 'Casa y servicios', 'Transporte', 'Salud', 'Diversión', 'Otros']
  }
}

/**
 * Get active categories with default info for a user from user_categories table
 */
export async function getUserActiveCategoriesWithInfo(userId: number): Promise<CategoryInfo[]> {
  try {
    const { data, error } = await supabase
      .from('user_categories')
      .select('category_name, is_default')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('category_name')

    if (error) {
      console.error('Error fetching user categories with info:', error)
      // Fallback to hardcoded categories if database fails
      return [
        { name: 'Sin categoría', isDefault: true },
        { name: 'Mercado y comida', isDefault: true },
        { name: 'Casa y servicios', isDefault: true },
        { name: 'Transporte', isDefault: true },
        { name: 'Salud', isDefault: true },
        { name: 'Diversión', isDefault: true },
        { name: 'Otros', isDefault: true }
      ]
    }

    return data?.map(item => ({
      name: item.category_name,
      isDefault: item.is_default
    })) || []
  } catch (error) {
    console.error('Error in getUserActiveCategoriesWithInfo:', error)
    // Fallback to hardcoded categories if service fails
    return [
      { name: 'Sin categoría', isDefault: true },
      { name: 'Mercado y comida', isDefault: true },
      { name: 'Casa y servicios', isDefault: true },
      { name: 'Transporte', isDefault: true },
      { name: 'Salud', isDefault: true },
      { name: 'Diversión', isDefault: true },
      { name: 'Otros', isDefault: true }
    ]
  }
}

/**
 * Add a new category for a user
 */
export async function addUserCategory(userId: number, categoryName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Trim and validate input
    const trimmedName = categoryName.trim()
    
    if (!trimmedName) {
      return { success: false, error: 'El nombre de la categoría no puede estar vacío' }
    }

    if (trimmedName.length > 50) {
      return { success: false, error: 'El nombre de la categoría no puede tener más de 50 caracteres' }
    }

    // Check if category already exists (including inactive ones)
    const { data: existingCategory, error: fetchError } = await supabase
      .from('user_categories')
      .select('category_name, is_active, is_default')
      .eq('user_id', userId)
      .ilike('category_name', trimmedName)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking existing category:', fetchError)
      return { success: false, error: 'Error al verificar categorías existentes' }
    }

    if (existingCategory) {
      if (existingCategory.is_active) {
        // Category is active, this is a duplicate
        return { success: false, error: 'Ya existe una categoría con este nombre' }
      } else {
        // Category exists but is inactive - reactivate it
        const { error: updateError } = await supabase
          .from('user_categories')
          .update({ is_active: true })
          .eq('user_id', userId)
          .ilike('category_name', trimmedName)

        if (updateError) {
          console.error('Error reactivating category:', updateError)
          return { success: false, error: 'Error al reactivar la categoría' }
        }

        return { success: true }
      }
    }

    // Category doesn't exist, create new one
    const { error } = await supabase
      .from('user_categories')
      .insert({
        user_id: userId,
        category_name: trimmedName,
        is_active: true,
        is_default: false
      })

    if (error) {
      console.error('Error adding user category:', error)
      return { success: false, error: 'Error al guardar la categoría en la base de datos' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in addUserCategory:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Count affected transactions for a category
 */
export async function countAffectedTransactions(userId: number, categoryName: string, onlyTransactionsTable: boolean = false): Promise<number> {
  try {
    // Count in transactions table
    const { count: transactionsCount, error: transactionsError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', categoryName)

    if (transactionsError) {
      console.error('Error counting transactions:', transactionsError)
      return 0
    }

    // If only counting transactions table for user display, return early
    if (onlyTransactionsTable) {
      return transactionsCount || 0
    }

    // Count in recurrent_expenses table
    const { count: recurrentCount, error: recurrentError } = await supabase
      .from('recurrent_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', categoryName)

    if (recurrentError) {
      console.error('Error counting recurrent expenses:', recurrentError)
      return 0
    }

    // Count in non_recurrent_expenses table
    const { count: nonRecurrentCount, error: nonRecurrentError } = await supabase
      .from('non_recurrent_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', categoryName)

    if (nonRecurrentError) {
      console.error('Error counting non-recurrent expenses:', nonRecurrentError)
      return 0
    }

    return (transactionsCount || 0) + (recurrentCount || 0) + (nonRecurrentCount || 0)
  } catch (error) {
    console.error('Error in countAffectedTransactions:', error)
    return 0
  }
}

/**
 * Delete or deactivate a category and update affected transactions
 */
export async function deleteUserCategory(userId: number, categoryName: string, isDefault: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    // First, update all affected transactions to "Sin categoría"
    const updatePromises = [
      // Update transactions table
      supabase
        .from('transactions')
        .update({ category: 'Sin categoría' })
        .eq('user_id', userId)
        .eq('category', categoryName),
      
      // Update recurrent_expenses table
      supabase
        .from('recurrent_expenses')
        .update({ category: 'Sin categoría' })
        .eq('user_id', userId)
        .eq('category', categoryName),
      
      // Update non_recurrent_expenses table
      supabase
        .from('non_recurrent_expenses')
        .update({ category: 'Sin categoría' })
        .eq('user_id', userId)
        .eq('category', categoryName)
    ]

    // Execute all updates
    const updateResults = await Promise.all(updatePromises)
    
    // Check for any errors in updates
    for (const result of updateResults) {
      if (result.error) {
        console.error('Error updating transactions:', result.error)
        return { success: false, error: 'Error al actualizar las transacciones' }
      }
    }

    // Now handle the category itself
    if (isDefault) {
      // For default categories, just deactivate them
      const { error } = await supabase
        .from('user_categories')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('category_name', categoryName)

      if (error) {
        console.error('Error deactivating default category:', error)
        return { success: false, error: 'Error al desactivar la categoría' }
      }
    } else {
      // For custom categories, delete them completely
      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('user_id', userId)
        .eq('category_name', categoryName)

      if (error) {
        console.error('Error deleting custom category:', error)
        return { success: false, error: 'Error al eliminar la categoría' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteUserCategory:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
} 

/**
 * Validate category name for editing (without saving to database)
 */
export async function validateCategoryForEdit(userId: number, newCategoryName: string, currentCategoryName: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Trim and validate input
    const trimmedName = newCategoryName.trim()
    
    if (!trimmedName) {
      return { valid: false, error: 'El nombre de la categoría no puede estar vacío' }
    }

    if (trimmedName.length > 50) {
      return { valid: false, error: 'El nombre de la categoría no puede tener más de 50 caracteres' }
    }

    // If the name hasn't changed, it's valid
    if (trimmedName.toLowerCase() === currentCategoryName.toLowerCase()) {
      return { valid: true }
    }

    // Check for duplicates (case-insensitive)
    const existingCategories = await getUserActiveCategories(userId)
    const isDuplicate = existingCategories.some(existing => 
      existing.toLowerCase() === trimmedName.toLowerCase()
    )

    if (isDuplicate) {
      return { valid: false, error: 'Ya existe una categoría con este nombre' }
    }

    return { valid: true }
  } catch (error) {
    console.error('Error in validateCategoryForEdit:', error)
    return { valid: false, error: 'Error interno del servidor' }
  }
}

/**
 * Update a category name and all affected transactions
 */
export async function updateUserCategory(userId: number, oldCategoryName: string, newCategoryName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Trim the new name
    const trimmedNewName = newCategoryName.trim()
    
    if (!trimmedNewName) {
      return { success: false, error: 'El nombre de la categoría no puede estar vacío' }
    }

    if (trimmedNewName.length > 50) {
      return { success: false, error: 'El nombre de la categoría no puede tener más de 50 caracteres' }
    }

    // If the name hasn't changed, no need to update
    if (trimmedNewName.toLowerCase() === oldCategoryName.toLowerCase()) {
      return { success: true }
    }

    // Check for duplicates (case-insensitive)
    const existingCategories = await getUserActiveCategories(userId)
    const isDuplicate = existingCategories.some(existing => 
      existing.toLowerCase() === trimmedNewName.toLowerCase()
    )

    if (isDuplicate) {
      return { success: false, error: 'Ya existe una categoría con este nombre' }
    }

    // First, update all affected transactions with the new category name
    const updatePromises = [
      // Update transactions table
      supabase
        .from('transactions')
        .update({ category: trimmedNewName })
        .eq('user_id', userId)
        .eq('category', oldCategoryName),
      
      // Update recurrent_expenses table
      supabase
        .from('recurrent_expenses')
        .update({ category: trimmedNewName })
        .eq('user_id', userId)
        .eq('category', oldCategoryName),
      
      // Update non_recurrent_expenses table
      supabase
        .from('non_recurrent_expenses')
        .update({ category: trimmedNewName })
        .eq('user_id', userId)
        .eq('category', oldCategoryName)
    ]

    // Execute all updates
    const updateResults = await Promise.all(updatePromises)
    
    // Check for any errors in updates
    for (const result of updateResults) {
      if (result.error) {
        console.error('Error updating transactions:', result.error)
        return { success: false, error: 'Error al actualizar las transacciones' }
      }
    }

    // Now update the category name in user_categories table
    const { error } = await supabase
      .from('user_categories')
      .update({ category_name: trimmedNewName })
      .eq('user_id', userId)
      .eq('category_name', oldCategoryName)

    if (error) {
      console.error('Error updating category name:', error)
      return { success: false, error: 'Error al actualizar el nombre de la categoría' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateUserCategory:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
} 

/**
 * Reset user categories to default predefined categories only
 * This will restore default categories to their original state while preserving custom user categories
 */
export async function resetUserCategoriesToDefaults(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔄 Starting selective category reset for user ${userId}`)

    // Step 1: For each default category, ensure it exists and has the correct name
    for (const originalCategoryName of DEFAULT_CATEGORY_NAMES) {
      // Check if this default category exists (might be with a different name if edited)
      const { data: existingDefaults, error: fetchError } = await supabase
        .from('user_categories')
        .select('category_name, is_active')
        .eq('user_id', userId)
        .eq('is_default', true)

      if (fetchError) {
        console.error('Error fetching existing default categories:', fetchError)
        return { success: false, error: 'Error al verificar categorías existentes' }
      }

      // Check if we already have this exact default category active
      const exactMatch = existingDefaults?.find(cat => 
        cat.category_name === originalCategoryName && cat.is_active
      )

      if (exactMatch) {
        // This default category already exists with correct name and is active
        console.log(`✅ Default category "${originalCategoryName}" already correct`)
        continue
      }

      // Check if we have an inactive default category with this name
      const inactiveMatch = existingDefaults?.find(cat => 
        cat.category_name === originalCategoryName && !cat.is_active
      )

      if (inactiveMatch) {
        // Reactivate the correct default category
        const { error: activateError } = await supabase
          .from('user_categories')
          .update({ is_active: true })
          .eq('user_id', userId)
          .eq('category_name', originalCategoryName)
          .eq('is_default', true)

        if (activateError) {
          console.error(`Error reactivating category "${originalCategoryName}":`, activateError)
          return { success: false, error: `Error al reactivar categoría "${originalCategoryName}"` }
        }

        console.log(`✅ Reactivated default category "${originalCategoryName}"`)
        continue
      }

      // If we get here, we need to insert the default category (or it was renamed)
      // First, deactivate any other default categories that might conflict
      const { error: deactivateError } = await supabase
        .from('user_categories')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_default', true)
        .neq('category_name', originalCategoryName)

      if (deactivateError) {
        console.error('Error deactivating conflicting default categories:', deactivateError)
      }

      // Insert/upsert the correct default category
      const { error: upsertError } = await supabase
        .from('user_categories')
        .upsert({
          user_id: userId,
          category_name: originalCategoryName,
          is_active: true,
          is_default: true
        }, {
          onConflict: 'user_id,category_name',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error(`Error upserting default category "${originalCategoryName}":`, upsertError)
        return { success: false, error: `Error al restaurar categoría "${originalCategoryName}"` }
      }

      console.log(`✅ Restored default category "${originalCategoryName}"`)
    }

    console.log(`✅ Successfully reset default categories for user ${userId}`)
    console.log(`📊 Default categories restored: ${DEFAULT_CATEGORY_NAMES.join(', ')}`)
    console.log(`🔒 Custom user categories preserved untouched`)

    return { success: true }
  } catch (error) {
    console.error('Error in resetUserCategoriesToDefaults:', error)
    return { success: false, error: 'Error interno del servidor durante el reset' }
  }
} 