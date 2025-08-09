'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, Calendar, DollarSign, FileText, Repeat, CheckCircle, AlertCircle, TrendingUp, X, Paperclip, Settings, Trash2, Edit2, Tag, Plus } from 'lucide-react'
import { type Transaction, type User, type TransactionAttachment, type RecurrentExpense } from '@/lib/supabase'
import { fetchAttachmentCounts, fetchUserExpenses } from '@/lib/dataUtils'
import { useDataSyncEffect, useDataSync } from '@/lib/hooks/useDataSync'
import { useAppNavigation } from '@/lib/hooks/useAppNavigation'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { APP_COLORS, getColor, getGradient, getNestedColor } from '@/lib/config/colors'
import { CATEGORIES } from '@/lib/config/constants'
import { renderCustomIcon } from '@/lib/utils/iconRenderer'
import { getTransactionIconType, getTransactionIconColor, getTransactionIconBackground } from '@/lib/utils/transactionIcons'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'
import { getUserActiveCategories, addUserCategory, getUserActiveCategoriesWithInfo, CategoryInfo, countAffectedTransactions, deleteUserCategory, validateCategoryForEdit, updateUserCategory } from '@/lib/services/categoryService'
import TransactionIcon from './TransactionIcon'
import CategoryOriginLabel from './CategoryOriginLabel'
import { useTransactionStore } from '@/lib/store/transactionStore'

interface CategoriesViewProps {
  navigationParams?: { year?: number; month?: number } | null
  user: User
}

interface YearGroup {
  year: number
  transactions: Transaction[]
  total: number
  paid: number
  pending: number
  overdue: number
}

interface RecurrentGroup {
  sourceId: number
  description: string
  yearGroups: YearGroup[]
  total: number
  paid: number
  pending: number
  overdue: number
}

interface CategoryGroup {
  categoryName: string
  recurrentGroups: RecurrentGroup[]
  nonRecurrentTransactions: Transaction[]
  total: number
  paid: number
  pending: number
  overdue: number
  count: number
}

export default function CategoriesView({ navigationParams, user }: CategoriesViewProps) {
  const navigation = useAppNavigation()
  const { refreshData } = useDataSync()
  
  // Zustand store
  const { transactions, isLoading, fetchTransactions } = useTransactionStore()
  
  // Function to validate categories data for debugging
  function validateCategoriesData(transactions: Transaction[]) {
    const invalid = transactions.filter(t =>
      t.type !== 'expense' ||
      t.category === 'Ahorro'
    )
    if (invalid.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('[zustand] CategoriesView: Found', invalid.length, 'transactions that should not be rendered:', invalid.slice(0, 3))
    }
  }
  
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Category management modal state
  const [showCategoryManagementModal, setShowCategoryManagementModal] = useState(false)
  const [managementCategories, setManagementCategories] = useState<CategoryInfo[]>([])
  const [loadingManagementCategories, setLoadingManagementCategories] = useState(false)

  // Add new category state
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null)

  // Delete category state
  const [showDeleteCategoryConfirmation, setShowDeleteCategoryConfirmation] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [affectedTransactionsCount, setAffectedTransactionsCount] = useState<number>(0)

  // Edit category state 
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryInfo | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editingCategoryState, setEditingCategoryState] = useState(false)
  const [editCategoryError, setEditCategoryError] = useState<string | null>(null)

  // Create recurrentGoalMap like in DashboardView
  const recurrentGoalMap = useMemo(() => {
    const map: Record<number, boolean> = {}
    recurrentExpenses.forEach(re => {
      if (re.isgoal) map[re.id] = true
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 CategoriesView: recurrentGoalMap created with', Object.keys(map).length, 'goals')
    }
    
    return map
  }, [JSON.stringify(recurrentExpenses.map(re => ({ id: re.id, isgoal: re.isgoal })))]) // Use JSON.stringify for deep comparison

  // Direct attachment functionality implementation (without external hook)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)
  const [showTransactionAttachments, setShowTransactionAttachments] = useState(false)
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null)

  // Estado para la nueva sección de detalle de transacción (recurrente o única)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  // Load attachment counts for a list of transactions
  const loadAttachmentCounts = async (transactions: Transaction[]) => {
    if (transactions && transactions.length > 0) {
      const transactionIds = transactions.map((t: Transaction) => t.id)
      const attachmentCountsData = await fetchAttachmentCounts(user, transactionIds)
      setAttachmentCounts(attachmentCountsData)
    }
  }

  // Attachment handlers
  const handleAttachmentUpload = (transaction: Transaction) => {
    setSelectedTransactionForAttachments(transaction)
    setShowAttachmentModal(true)
    setShowTransactionAttachments(false)
  }

  const handleAttachmentList = (transaction: Transaction) => {
    setSelectedTransactionForAttachments(transaction)
    setShowTransactionAttachments(true)
  }

  const handleAttachmentUploadComplete = (attachment: TransactionAttachment) => {
    setAttachmentCounts(prev => ({
      ...prev,
      [attachment.transaction_id]: (prev[attachment.transaction_id] || 0) + 1
    }))
    
    if (selectedTransactionForAttachments) {
      setSelectedTransactionForAttachments(selectedTransactionForAttachments)
      setShowTransactionAttachments(true)
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Attachment uploaded:', attachment)
    }
  }

  const handleAttachmentDeleted = (attachmentId: number) => {
    // Refresh attachment counts
    if (process.env.NODE_ENV === 'development') {
      console.log('Attachment deleted:', attachmentId)
    }
  }

  // Attachment clip component - EXACT structure from DashboardView
  const AttachmentClip = ({ transaction, className = "" }: { transaction: Transaction, className?: string }) => {
    return (
      <button
        onClick={() => handleAttachmentList(transaction)}
        className="text-green-dark hover:opacity-70 hover:shadow-md hover:shadow-gray-200 relative flex items-center justify-center p-1 rounded-md transition-all duration-200 hover:scale-105"
        title="View attachments"
      >
        <Paperclip className="w-3 h-3" />
        {attachmentCounts[transaction.id] > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-warning-bg text-gray-700 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-normal">
            {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
          </span>
        )}
      </button>
    )
  }

  // Attachment modals component  
  const AttachmentModals = () => {
    return (
      <>
        {/* File Upload Modal */}
        {showAttachmentModal && selectedTransactionForAttachments && (
          <FileUploadModal
            isOpen={showAttachmentModal}
            onClose={() => {
              setShowAttachmentModal(false)
              setSelectedTransactionForAttachments(null)
            }}
            transactionId={selectedTransactionForAttachments.id}
            userId={user.id}
            onUploadComplete={handleAttachmentUploadComplete}
          />
        )}

        {/* Attachments List Modal */}
        {showTransactionAttachments && selectedTransactionForAttachments && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
            <section className="relative bg-white rounded-xl p-0 w-full max-w-md shadow-sm border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowTransactionAttachments(false)
                  setSelectedTransactionForAttachments(null)
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full">
                    <Paperclip className="h-4 w-4 text-green-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Archivos Adjuntos</h2>
                    <p className="text-sm text-gray-500">Para: {selectedTransactionForAttachments.description}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <TransactionAttachments
                    transactionId={selectedTransactionForAttachments.id}
                    userId={user.id}
                    onAttachmentDeleted={handleAttachmentDeleted}
                    onAddAttachment={() => handleAttachmentUpload(selectedTransactionForAttachments)}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </>
    )
  }

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const availableYears = Array.from({ length: 16 }, (_, i) => 2025 + i)

  // Navigation function to redirect to Mis cuentas
  const handleNavigateToMonth = async (month: number, year: number) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗂️ CategoriesView: Navigating to Mis cuentas - Month: ${month}, Year: ${year}`)
      }
      await navigation.navigateToDashboard(month, year)
    } catch (error) {
      console.error('❌ CategoriesView: Navigation error:', error)
    }
  }

  // Helper function to format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Helper function to compare dates without time
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
    
    // Create today's date without time
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return deadlineDate < todayDate;
  }

  // Get category status (Al día/Vencido) - same logic as ComoVamosView
  const getCategoryStatus = (categoryName: string): 'on-time' | 'overdue' => {
    const categoryTransactions = transactions.filter(t => 
      t.type === 'expense' && 
      t.category === categoryName &&
      t.category !== 'Ahorro' && 
      !recurrentGoalMap[t.source_id]
    )
    
    const hasOverdue = categoryTransactions.some(transaction => 
      transaction.status === 'pending' && 
      transaction.deadline && 
      isDateOverdue(transaction.deadline)
    )
    
    return hasOverdue ? 'overdue' : 'on-time'
  }

  // Status functions - same logic as DashboardView for consistency
  const getStatusText = (transaction: Transaction) => {
    if (transaction.status === 'paid') return 'Pagado'
    if (transaction.deadline) {
      // Parse the date string to avoid timezone issues and compare only dates
      const [year, month, day] = transaction.deadline.split('-').map(Number);
      const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
      
      // Create today's date without time
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (deadlineDate < todayDate) {
        return 'Vencido'
      }
    }
    return 'Pendiente'
  }

  const getStatusColor = (transaction: Transaction) => {
    if (transaction.status === 'paid') return 'bg-green-light text-green-primary'
    if (transaction.deadline) {
      // Parse the date string to avoid timezone issues and compare only dates
      const [year, month, day] = transaction.deadline.split('-').map(Number);
      const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
      
      // Create today's date without time
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (deadlineDate < todayDate) {
        return 'bg-error-bg text-error-red'
      }
    }
    return 'bg-warning-bg text-warning-yellow'
  }

  // Fetch transactions data using pure Zustand pattern
  const fetchData = useCallback(async () => {
    if (!user) return
    
    try {
      setError(null)
      
      console.log('[zustand] CategoriesView: fetchTransactions triggered')
      
      // Use pure Zustand pattern with scope: 'all' for historical data
      await fetchTransactions({ 
        userId: user.id, 
        scope: 'all' // Fetch all transactions without month/year filters
      })
      
      console.log('[zustand] CategoriesView: transactions loaded:', transactions.length)
      
      // Also fetch expenses to build recurrentGoalMap
      const expenses = await fetchUserExpenses(user)
      setRecurrentExpenses(expenses.recurrent)
      
      // Validate categories data
      validateCategoriesData(transactions)

      // Load attachment counts
      await loadAttachmentCounts(transactions)

    } catch (error) {
      console.error('❌ Error in fetchData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [user, fetchTransactions, transactions]) // Dependencies for useCallback

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Development logging for Zustand transactions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isLoading) {
      const filtered = transactions.filter(t => 
        t.type === 'expense' &&
        t.category !== 'Ahorro'
      )
      console.log('[zustand] CategoriesView: loaded', filtered.length, 'filtered expense transactions from Zustand')
    }
  }, [isLoading, transactions])

  // Data sync effect using pure Zustand pattern
  useDataSyncEffect(() => {
    console.log('[zustand] CategoriesView: useDataSyncEffect triggered')
    fetchData()
  }, [fetchData])

  // Load categories for management modal
  const loadManagementCategories = async () => {
    setLoadingManagementCategories(true)
    try {
      const categories = await getUserActiveCategoriesWithInfo(user.id)
      // Filter out "Sin categoría" as it's not a user-available category
      const filteredCategories = categories.filter(category => category.name !== 'Sin categoría')
      
      // Debug log to check category.isDefault values
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Management Categories Debug:', filteredCategories.map(cat => ({
          name: cat.name,
          isDefault: cat.isDefault,
          type: typeof cat.isDefault
        })))
      }
      
      setManagementCategories(filteredCategories)
    } catch (error) {
      console.error('Error loading management categories:', error)
      setManagementCategories([])
    } finally {
      setLoadingManagementCategories(false)
    }
  }

  // Handle opening category management modal
  const handleCategoryManagementClick = () => {
    setShowCategoryManagementModal(true)
    setShowAddCategoryInput(false)
    setNewCategoryInput('')
    setAddCategoryError(null)
    setShowDeleteCategoryConfirmation(false)
    setCategoryToDelete(null)
    setDeletingCategory(false)
    setShowEditCategoryModal(false)
    setEditCategoryName('')
    setEditingCategoryState(false)
    setEditCategoryError(null)
    loadManagementCategories()
  }

  // Handle add category click
  const handleAddCategoryClick = () => {
    setShowAddCategoryInput(true)
    setNewCategoryInput('')
    setAddCategoryError(null)
  }

  // Handle adding new category
  const handleAddCategory = async () => {
    if (!newCategoryInput.trim()) {
      setAddCategoryError('El nombre de la categoría no puede estar vacío')
      return
    }

    setAddingCategory(true)
    setAddCategoryError(null)

    try {
      const result = await addUserCategory(user.id, newCategoryInput.trim())
      
      if (result.success) {
        // Reset form and reload categories
        setNewCategoryInput('')
        setShowAddCategoryInput(false)
        await loadManagementCategories()
        
        // Notify other views that a new category has been added
        refreshData(user.id, 'add_category')
      } else {
        setAddCategoryError(result.error || 'Error al agregar la categoría')
      }
    } catch (error) {
      console.error('Error adding category:', error)
      setAddCategoryError('Error interno del servidor')
    } finally {
      setAddingCategory(false)
    }
  }

  // Handle cancel add category
  const handleCancelAddCategory = () => {
    setShowAddCategoryInput(false)
    setNewCategoryInput('')
    setAddCategoryError(null)
  }

  // Handle delete category click
  const handleDeleteCategoryClick = async (category: CategoryInfo) => {
    try {
      // Count affected transactions (only from transactions table for user display)
      const count = await countAffectedTransactions(user.id, category.name, true)
      setCategoryToDelete(category.name)
      setShowDeleteCategoryConfirmation(true)
      setDeletingCategory(false)
      setAffectedTransactionsCount(count)
    } catch (error) {
      console.error('Error counting affected transactions:', error)
      setAddCategoryError('Error al verificar las transacciones afectadas')
    }
  }

  // Handle delete category confirmation
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return

    setDeletingCategory(true)

    try {
      const result = await deleteUserCategory(user.id, categoryToDelete, true)
      
      if (result.success) {
        // Close modal and reload categories
        setShowDeleteCategoryConfirmation(false)
        setCategoryToDelete(null)
        await loadManagementCategories()
        
        // Refresh local data to reflect changes in this view
        await fetchData()
        
        // Notify other views that data has changed
        refreshData(user.id, 'delete_category')
      } else {
        setAddCategoryError(result.error || 'Error al eliminar la categoría')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setAddCategoryError('Error interno del servidor')
    } finally {
      setDeletingCategory(false)
    }
  }

  // Handle cancel delete category
  const handleCancelDeleteCategory = () => {
    setShowDeleteCategoryConfirmation(false)
    setCategoryToDelete(null)
    setAddCategoryError(null)
  }

  // Handle edit category click
  const handleEditCategoryClick = (category: CategoryInfo) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
    setEditingCategoryState(false)
    setEditCategoryError(null)
  }

  // Handle edit category save
  const handleEditCategorySave = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      setEditCategoryError('El nombre de la categoría no puede estar vacío')
      return
    }

    // Validate the new name
    const validation = await validateCategoryForEdit(user.id, editCategoryName.trim(), editingCategory.name)
    
    if (!validation.valid) {
      setEditCategoryError(validation.error || 'Error en la validación')
      return
    }

    // If name hasn't changed, just cancel editing
    if (editCategoryName.trim().toLowerCase() === editingCategory.name.toLowerCase()) {
      setEditingCategory(null)
      setEditCategoryName('')
      setEditCategoryError(null)
      return
    }

    try {
      // Count affected transactions (only from transactions table for user display)
      const count = await countAffectedTransactions(user.id, editingCategory.name, true)
      setCategoryToDelete(editingCategory.name)
      setShowEditCategoryModal(true)
      setEditCategoryError(null)
    } catch (error) {
      console.error('Error counting affected transactions:', error)
      setEditCategoryError('Error al verificar las transacciones afectadas')
    }
  }

  // Handle edit category cancel
  const handleEditCategoryCancel = () => {
    setEditingCategory(null)
    setEditCategoryName('')
    setEditCategoryError(null)
  }

  // Handle confirm edit category
  const handleConfirmEditCategory = async () => {
    if (!editingCategory) return

    setEditingCategoryState(true)
    setEditCategoryError(null)

    try {
      const result = await updateUserCategory(user.id, editingCategory.name, editCategoryName.trim())
      
      if (result.success) {
        // Close modals and reset state
        setShowEditCategoryModal(false)
        setEditingCategory(null)
        setEditCategoryName('')
        setEditCategoryError(null)
        
        // Reload categories
        await loadManagementCategories()
        
        // Refresh local data to reflect changes in this view
        await fetchData()
        
        // Notify other views that data has changed
        refreshData(user.id, 'edit_category')
      } else {
        setEditCategoryError(result.error || 'Error al actualizar la categoría')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      setEditCategoryError('Error interno del servidor')
    } finally {
      setEditingCategoryState(false)
    }
  }

  // Handle cancel edit category
  const handleCancelEditCategory = () => {
    setShowEditCategoryModal(false)
    setEditingCategory(null)
    setEditCategoryError(null)
  }

  // Group transactions by category with recurrent and year grouping
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    // Only include expense transactions (simplified, no filtering)
    const expenseTransactions = transactions.filter(t => 
      t.type === 'expense' && 
      t.category !== 'Ahorro' && 
      !recurrentGoalMap[t.source_id]
    )
    
    // Group by category
    const groups = new Map<string, Transaction[]>()
    
    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'Sin categoría'
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(transaction)
    })

    // Convert to CategoryGroup objects with recurrent and year grouping
    const categoryGroupsArray: CategoryGroup[] = Array.from(groups.entries()).map(([categoryName, transactions]) => {
      // Separate recurrent and non-recurrent transactions
      const recurrentTransactions = transactions.filter(t => t.source_type === 'recurrent')
      const nonRecurrentTransactions = transactions.filter(t => t.source_type === 'non_recurrent')

      // Group recurrent transactions by source_id
      const recurrentGroups = new Map<number, Transaction[]>()
      recurrentTransactions.forEach(transaction => {
        const sourceId = transaction.source_id
        if (!recurrentGroups.has(sourceId)) {
          recurrentGroups.set(sourceId, [])
        }
        recurrentGroups.get(sourceId)!.push(transaction)
      })

      // Convert recurrent groups to RecurrentGroup objects with year grouping
      const recurrentGroupsArray: RecurrentGroup[] = Array.from(recurrentGroups.entries()).map(([sourceId, groupTransactions]) => {
        // Group transactions by year
        const yearGroups = new Map<number, Transaction[]>()
        groupTransactions.forEach(transaction => {
          const year = transaction.year
          if (!yearGroups.has(year)) {
            yearGroups.set(year, [])
          }
          yearGroups.get(year)!.push(transaction)
        })

        // Convert year groups to YearGroup objects
        const yearGroupsArray: YearGroup[] = Array.from(yearGroups.entries()).map(([year, yearTransactions]) => {
          const sortedTransactions = yearTransactions.sort((a, b) => {
            // Sort by month
            return a.month - b.month
          })

          const total = sortedTransactions.reduce((sum, t) => sum + t.value, 0)
          const paid = sortedTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
          const pendingTransactions = sortedTransactions.filter(t => {
            if (t.status !== 'pending') return false
            if (!t.deadline) return true
            return !isDateOverdue(t.deadline)
          })
          const overdueTransactions = sortedTransactions.filter(t => {
            if (t.status !== 'pending') return false
            if (!t.deadline) return false
            return isDateOverdue(t.deadline)
          })
          
          const pending = pendingTransactions.reduce((sum, t) => sum + t.value, 0)
          const overdue = overdueTransactions.reduce((sum, t) => sum + t.value, 0)

          return {
            year,
            transactions: sortedTransactions,
            total,
            paid,
            pending,
            overdue
          }
        })

        // Sort year groups by year (ascending - earliest first)
        const sortedYearGroups = yearGroupsArray.sort((a, b) => a.year - b.year)

        // Calculate recurrent group totals
        const allRecurrentTransactions = groupTransactions
        const total = allRecurrentTransactions.reduce((sum, t) => sum + t.value, 0)
        const paid = allRecurrentTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
        const pendingTransactions = allRecurrentTransactions.filter(t => {
          if (t.status !== 'pending') return false
          if (!t.deadline) return true
          return !isDateOverdue(t.deadline)
        })
        const overdueTransactions = allRecurrentTransactions.filter(t => {
          if (t.status !== 'pending') return false
          if (!t.deadline) return false
          return isDateOverdue(t.deadline)
        })
        
        const pending = pendingTransactions.reduce((sum, t) => sum + t.value, 0)
        const overdue = overdueTransactions.reduce((sum, t) => sum + t.value, 0)

        // Determine the year range for the description
        const firstYear = sortedYearGroups[0]?.year;
        const lastYear = sortedYearGroups[sortedYearGroups.length - 1]?.year;
        const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear}-${lastYear}`;

        return {
          sourceId,
          description: groupTransactions[0].description, // Use first transaction's description
          yearGroups: sortedYearGroups,
          total,
          paid,
          pending,
          overdue,
          yearRange: yearRange // Add yearRange to the group
        }
      })

      // Sort non-recurrent transactions by deadline
      const sortedNonRecurrentTransactions = nonRecurrentTransactions.sort((a, b) => {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        }
        if (a.deadline && !b.deadline) return -1
        if (!a.deadline && b.deadline) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      // Calculate category totals
      const allTransactions = [...recurrentTransactions, ...nonRecurrentTransactions]
      const total = allTransactions.reduce((sum, t) => sum + t.value, 0)
      const paid = allTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0)
      const pendingTransactions = allTransactions.filter(t => {
        if (t.status !== 'pending') return false
        if (!t.deadline) return true
        return !isDateOverdue(t.deadline)
      })
      const overdueTransactions = allTransactions.filter(t => {
        if (t.status !== 'pending') return false
        if (!t.deadline) return false
        return isDateOverdue(t.deadline)
      })
      
      const pending = pendingTransactions.reduce((sum, t) => sum + t.value, 0)
      const overdue = overdueTransactions.reduce((sum, t) => sum + t.value, 0)

      return {
        categoryName,
        recurrentGroups: recurrentGroupsArray,
        nonRecurrentTransactions: sortedNonRecurrentTransactions,
        total,
        paid,
        pending,
        overdue,
        count: allTransactions.length
      }
    })

    // Sort categories by total amount (descending)
    const sortedCategories = categoryGroupsArray.sort((a, b) => b.total - a.total)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ CategoriesView: Final categoryGroups result - ${sortedCategories.length} categories`)
    }
    
    return sortedCategories
  }, [JSON.stringify(transactions.map(t => ({ id: t.id, category: t.category, status: t.status, value: t.value, type: t.type, source_id: t.source_id }))), JSON.stringify(recurrentGoalMap)]) // Use JSON.stringify for deep comparison

  // Get category display name with fallback
  const getCategoryDisplayName = (categoryName: string) => {
    if (categoryName === 'sin categoría' || categoryName === 'Sin categoría') {
      return 'Sin categoría'
    }
    return categoryName
  }

  // Get recurrent group icon based on its transactions
  const getRecurrentGroupIcon = (recurrentGroup: RecurrentGroup) => {
    // Get the first transaction to determine the icon
    const firstTransaction = recurrentGroup.yearGroups[0]?.transactions[0]
    
    if (!firstTransaction) {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#fdf5d3]">
          <Repeat className="h-5 w-5 text-[#5d7760]" />
        </div>
      )
    }
    
    // Use TransactionIcon component for consistency
    return (
      <TransactionIcon 
        transaction={firstTransaction}
        recurrentGoalMap={recurrentGoalMap}
        size="w-5 h-5"
        showBackground={true}
      />
    )
  }

  // Get recurrent group icon with smaller size - for visual consistency with calendar icon
  const getRecurrentGroupIconSmall = (recurrentGroup: RecurrentGroup) => {
    // Get the first transaction to determine the icon
    const firstTransaction = recurrentGroup.yearGroups[0]?.transactions[0]
    
    if (!firstTransaction) {
      return (
        <Repeat className="h-4 w-4 text-[#5d7760]" />
      )
    }
    
    // Get the icon type and colors from the parametrized system
    const iconType = getTransactionIconType(firstTransaction, recurrentGoalMap)
    const iconColor = getTransactionIconColor(firstTransaction, iconType)
    
    // Render the appropriate icon based on type
    switch (iconType) {
      case 'SAVINGS_TROPHY':
        return renderCustomIcon('SAVINGS_TROPHY', `w-4 h-4 ${iconColor}`)
      
      case 'GOAL_TARGET':
        return renderCustomIcon('GOAL_TARGET', `w-4 h-4 ${iconColor}`)
      
      case 'TICKET_TAG':
        return renderCustomIcon('TICKET_TAG', `w-4 h-4 ${iconColor}`)
      
      case 'REPEAT':
        return <Repeat className={`w-4 h-4 ${iconColor}`} />
      
      default:
        return <Repeat className={`w-4 h-4 ${iconColor}`} />
    }
  }

  // Get recurrent group background color
  const getRecurrentGroupBackground = (recurrentGroup: RecurrentGroup) => {
    // Get the first transaction to determine the background
    const firstTransaction = recurrentGroup.yearGroups[0]?.transactions[0]
    
    if (!firstTransaction) {
      return `bg-${getColor('expense', 'light')}`
    }
    
    // Use the parametrized system
    const iconType = getTransactionIconType(firstTransaction, recurrentGoalMap)
    return getTransactionIconBackground(firstTransaction, iconType)
  }

  // Get transaction icon using TransactionIcon component
  const getTransactionIcon = (transaction: Transaction) => {
    return (
      <TransactionIcon 
        transaction={transaction}
        recurrentGoalMap={recurrentGoalMap}
        size="w-5 h-5"
        showBackground={true}
      />
    )
  }

  // Get transaction icon with smaller size - specifically for monthly detail view
  const getTransactionIconSmall = (transaction: Transaction) => {
    return (
      <TransactionIcon 
        transaction={transaction}
        recurrentGoalMap={recurrentGoalMap}
        size="w-4 h-4"
        showBackground={true}
      />
    )
  }

  // Get transaction icon without background - for use in custom containers
  const getTransactionIconOnly = (transaction: Transaction) => {
    const iconType = getTransactionIconType(transaction, recurrentGoalMap)
    const iconColor = getTransactionIconColor(transaction, iconType)
    
    // Render only the icon element without background container
    switch (iconType) {
      case 'SAVINGS_TROPHY':
        return renderCustomIcon('SAVINGS_TROPHY', `w-4 h-4 ${iconColor}`)
      
      case 'GOAL_TARGET':
        return renderCustomIcon('GOAL_TARGET', `w-4 h-4 ${iconColor}`)
      
      case 'TICKET_TAG':
        return renderCustomIcon('TICKET_TAG', `w-4 h-4 ${iconColor}`)
      
      case 'REPEAT':
        return <Repeat className={`w-4 h-4 ${iconColor}`} />
      
      default:
        return <Repeat className={`w-4 h-4 ${iconColor}`} />
    }
  }

  // Get transaction background color
  const getTransactionBackground = (transaction: Transaction) => {
    const iconType = getTransactionIconType(transaction, recurrentGoalMap)
    return getTransactionIconBackground(transaction, iconType)
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">¿En qué gasto?</h2>
          <p className="text-sm text-neutral-500">Analiza tus gastos organizados por categoría</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 mb-1">{texts.errorOccurred}</h3>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 px-6 sm:px-8 lg:px-16 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Container */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Transacciones por categoría
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Revisa y organiza tus gastos agrupados por categoría
              </p>
            </div>

            {/* Two Column Layout */}
            <div className="flex flex-col lg:flex-row gap-6 min-h-0">
              {/* Left Column - Categories List */}
              <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-neutral-bg border-b border-neutral-200 py-2 px-4 rounded-t-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                      Categorías
                    </span>
                    <button
                      onClick={handleCategoryManagementClick}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Gestionar categorías"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-6 text-center text-gray-500">{texts.loading}</div>
                ) : categoryGroups.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No hay categorías para mostrar</div>
                ) : (
                  <div className="overflow-y-auto max-h-96 lg:max-h-none">
                    {categoryGroups.map((group) => {
                      const displayName = getCategoryDisplayName(group.categoryName)
                      const isSelected = selectedCategory === group.categoryName
                      
                      return (
                        <div
                          key={group.categoryName}
                          className={`rounded-md px-3 py-2 mb-2 ${
                            isSelected 
                              ? 'border-l-4 border-green-primary bg-green-light' 
                              : 'border border-gray-200'
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (process.env.NODE_ENV === 'development') {
                                console.log('🖱️ CategoriesView: Category clicked', {
                                  categoryName: group.categoryName,
                                  previousSelection: selectedCategory,
                                  group: {
                                    count: group.count,
                                    total: group.total,
                                    recurrentGroups: group.recurrentGroups.length,
                                    nonRecurrentTransactions: group.nonRecurrentTransactions.length
                                  }
                                })
                              }
                              setSelectedCategory(group.categoryName)
                            }}
                            className="w-full text-sm text-left transition-colors hover:opacity-80"
                          >
                            <div className="flex items-center gap-1 text-sm text-gray-900 font-medium leading-tight">
                              <span>{displayName}</span>
                              <span className="text-xs text-gray-400 font-normal">
                                · {Object.values(CATEGORIES.EXPENSE).includes(group.categoryName as any) ? 'Predeterminada' : 'Creada por ti'}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 mt-0.5">
                              {group.count} transacciones
                            </p>

                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(group.total)}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                getCategoryStatus(group.categoryName) === 'overdue' 
                                  ? 'bg-error-bg text-error-red' 
                                  : 'bg-green-light text-green-primary'
                              }`}>
                                {getCategoryStatus(group.categoryName) === 'overdue' ? 'Vencido' : 'Al día'}
                              </span>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right Column - Canvas/Detail Area */}
              <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-96">
                {!selectedCategory ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-6">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-dark font-sans mb-1">
                        Explora tus gastos por categoría
                      </p>
                      <p className="text-xs text-gray-500 font-sans">
                        Haz clic en una categoría de la izquierda para ver sus transacciones asociadas
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Selected Category Content - Direct Transaction Hierarchy */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {(() => {
                        const group = categoryGroups.find(g => g.categoryName === selectedCategory)
                        
                        // Debug logging
                        if (process.env.NODE_ENV === 'development') {
                          console.log('🔍 CategoriesView Debug:', {
                            selectedCategory,
                            categoryGroups: categoryGroups.map(g => ({
                              name: g.categoryName,
                              count: g.count,
                              recurrentGroups: g.recurrentGroups.length,
                              nonRecurrentTransactions: g.nonRecurrentTransactions.length
                            })),
                            foundGroup: group ? {
                              name: group.categoryName,
                              count: group.count,
                              recurrentGroups: group.recurrentGroups.length,
                              nonRecurrentTransactions: group.nonRecurrentTransactions.length
                            } : null
                          })
                        }
                        
                        if (!group) {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('❌ No group found for selectedCategory:', selectedCategory)
                          }
                          return (
                            <div className="text-center py-8">
                              <p className="text-gray-500">No se encontró la categoría seleccionada</p>
                              <p className="text-xs text-gray-400 mt-2">Categoría: {selectedCategory}</p>
                            </div>
                          )
                        }
                        
                        // Check if group has any transactions
                        const hasTransactions = group.recurrentGroups.length > 0 || group.nonRecurrentTransactions.length > 0
                        
                        if (!hasTransactions) {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('⚠️ Group found but no transactions:', group)
                          }
                          return (
                            <div className="text-center px-4 py-6">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-6 w-6 text-gray-400" />
                              </div>
                              <p className="text-sm font-medium text-gray-dark font-sans mb-1">
                                Esta categoría aún no tiene transacciones
                              </p>
                              <p className="text-xs text-gray-500 font-sans mb-4">
                                Agrega una transacción para comenzar a visualizar tus gastos aquí.
                              </p>
                              <button
                                onClick={() => navigation.navigateToDashboard(new Date().getMonth() + 1, new Date().getFullYear())}
                                className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-all duration-200 hover:shadow-sm font-sans"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Añadir transacción
                              </button>
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-4">
                            {/* Transacciones recurrentes */}
                            {group.recurrentGroups.length > 0 && (
                              <div>
                                {/* Divisor para Transacciones recurrentes */}
                                <div className="mb-4 pb-2 border-b border-gray-200">
                                  <h4 className="text-sm font-medium text-gray-500 font-sans">
                                    Recurrentes
                                  </h4>
                                </div>
                                
                                {/* Lista de grupos recurrentes */}
                                <div>
                                  {group.recurrentGroups.map((recurrentGroup) => {
                                    // Determine the year range for the description
                                    const firstYear = recurrentGroup.yearGroups[0]?.year;
                                    const lastYear = recurrentGroup.yearGroups[recurrentGroup.yearGroups.length - 1]?.year;
                                    const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear}-${lastYear}`;

                                    return (
                                      <button
                                        key={recurrentGroup.sourceId}
                                        onClick={() => {
                                          // Seleccionar la primera transacción del grupo recurrente para la tabla de detalle
                                          const firstTransaction = recurrentGroup.yearGroups[0]?.transactions[0]
                                          if (firstTransaction) {
                                            if (process.env.NODE_ENV === 'development') {
                                              console.log('🖱️ CategoriesView: Recurrent group clicked, selecting first transaction', firstTransaction)
                                            }
                                            setSelectedTransaction(firstTransaction)
                                          }
                                        }}
                                        className="w-full p-3 text-left border-b border-gray-100 transition-colors hover:bg-gray-50"
                                      >
                                        <div className="flex items-center justify-between">
                                          {/* Left section: Icon + Name + Date/Range */}
                                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <div className="flex-shrink-0">
                                              {(() => {
                                                const firstTransaction = recurrentGroup.yearGroups[0]?.transactions[0]
                                                
                                                if (!firstTransaction) {
                                                  return (
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#fdf5d3]">
                                                      <Repeat className="h-3 w-3 text-[#5d7760]" />
                                                    </div>
                                                  )
                                                }
                                                
                                                return (
                                                  <TransactionIcon 
                                                    transaction={firstTransaction}
                                                    recurrentGoalMap={recurrentGoalMap}
                                                    size="w-3 h-3"
                                                    containerSize="w-5 h-5"
                                                    showBackground={true}
                                                  />
                                                )
                                              })()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center space-x-2">
                                                <div className="text-sm font-medium text-gray-900 truncate font-sans">{recurrentGroup.description}</div>
                                                <div className="text-xs text-gray-500 font-sans flex-shrink-0">{yearRange}</div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Right section: Status + Amount + (no attachment for recurrent groups) */}
                                          <div className="flex items-center space-x-3 flex-shrink-0">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans ${recurrentGroup.overdue > 0 ? 'bg-error-bg text-error-red' : 'bg-green-light text-green-primary'}`}>
                                              {recurrentGroup.overdue > 0 ? 'Vencido' : 'Al día'}
                                            </span>
                                            <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(recurrentGroup.total)}</div>
                                          </div>
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Transacciones únicas */}
                            {group.nonRecurrentTransactions.length > 0 && (
                              <div>
                                {/* Divisor para Transacciones únicas */}
                                <div className="mb-4 pb-2 border-b border-gray-200">
                                  <h4 className="text-sm font-medium text-gray-500 font-sans">
                                    Únicas
                                  </h4>
                                </div>
                                
                                {/* Lista de transacciones únicas */}
                                <div>
                                  {group.nonRecurrentTransactions.map((transaction) => {
                                    return (
                                      <button
                                        key={transaction.id} 
                                        onClick={() => {
                                          if (process.env.NODE_ENV === 'development') {
                                            console.log('🖱️ CategoriesView: Unique transaction clicked, selecting transaction', transaction)
                                          }
                                          setSelectedTransaction(transaction)
                                        }}
                                        className="w-full p-3 border-b border-gray-100 transition-colors hover:bg-gray-50 text-left"
                                      >
                                        <div className="flex items-center justify-between">
                                          {/* Left section: Icon + Name + Date */}
                                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <div className="flex-shrink-0">
                                              <TransactionIcon 
                                                transaction={transaction}
                                                recurrentGoalMap={recurrentGoalMap}
                                                size="w-3 h-3"
                                                containerSize="w-5 h-5"
                                                showBackground={true}
                                              />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center space-x-2">
                                                <div className="text-sm font-medium text-gray-900 truncate font-sans">{transaction.description}</div>
                                                <div className="text-xs text-gray-500 font-sans flex-shrink-0">{months[transaction.month - 1]} {transaction.year}</div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Right section: Status + Amount + Attachment */}
                                          <div className="flex items-center space-x-3 flex-shrink-0">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans ${getStatusColor(transaction)}`}>
                                              {getStatusText(transaction)}
                                            </span>
                                            <div className="text-sm font-medium text-gray-900 font-sans">{formatCurrency(transaction.value)}</div>
                                          </div>
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detalle de Transacción Recurrente */}
      <div className="flex-1 px-6 sm:px-8 lg:px-16 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {!selectedTransaction ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                  Detalle de transacción
                </h3>
                <p className="text-xs text-gray-500 font-sans">
                  Selecciona una transacción recurrente o única para ver su historial mensual
                </p>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                    {selectedTransaction.source_type === 'recurrent' 
                      ? `Detalle mensual: ${selectedTransaction.description}`
                      : `Detalle transacción única: ${selectedTransaction.description}`
                    }
                  </h3>
                  <p className="text-xs text-gray-500 font-sans">
                    {selectedTransaction.source_type === 'recurrent' 
                      ? `Historial completo de esta transacción recurrente`
                      : `Información asociada a esta transacción no recurrente`
                    }
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Período
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Fecha límite
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Adjuntos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {(() => {
                        // Si es recurrente, filtrar todas las transacciones relacionadas
                        // Si es única, solo mostrar esa transacción
                        const relatedTransactions = selectedTransaction.source_type === 'recurrent'
                          ? transactions.filter(t => 
                              t.source_type === 'recurrent' && 
                              t.source_id === selectedTransaction.source_id &&
                              t.type === selectedTransaction.type &&
                              t.category === selectedTransaction.category
                            ).sort((a, b) => {
                              // Ordenar por año y mes
                              if (a.year !== b.year) return a.year - b.year
                              return a.month - b.month
                            })
                          : [selectedTransaction] // Para únicas, solo la transacción seleccionada

                        // Agrupar por año
                        const groupedByYear = relatedTransactions.reduce((groups, transaction) => {
                          const year = transaction.year
                          if (!groups[year]) {
                            groups[year] = []
                          }
                          groups[year].push(transaction)
                          return groups
                        }, {} as Record<number, Transaction[]>)

                        const sortedYears = Object.keys(groupedByYear)
                          .map(year => parseInt(year))
                          .sort((a, b) => a - b)

                        return sortedYears.map((year) => (
                          <React.Fragment key={year}>
                            {/* Year divider row */}
                            <tr>
                              <td colSpan={5} className="px-4 pt-4 pb-2 border-t border-gray-200 bg-white">
                                <div className="text-sm text-gray-500 font-sans">
                                  {year}
                                </div>
                              </td>
                            </tr>
                            {/* Transactions for this year */}
                            {groupedByYear[year].map((transaction, index) => (
                              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center space-x-3">
                                    <TransactionIcon
                                      transaction={transaction}
                                      recurrentGoalMap={recurrentGoalMap}
                                      size="w-4 h-4"
                                      containerSize="w-6 h-6"
                                    />
                                    <div className="flex items-center space-x-2">
                                      <div className="text-sm font-medium text-gray-900 font-sans">
                                        {months[transaction.month - 1]}
                                      </div>
                                      {transaction.year === new Date().getFullYear() && transaction.month === new Date().getMonth() + 1 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-[#e4effa] text-[#3f70ad]">
                                          Actual
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleNavigateToMonth(transaction.month, transaction.year)}
                                        className="text-gray-400 hover:text-blue-600 transition-all duration-300 p-1 rounded-md hover:bg-blue-50 hover:scale-[1.005] hover:shadow-sm"
                                        title={`Ir a Mis cuentas - ${months[transaction.month - 1]} ${transaction.year}`}
                                      >
                                        <svg 
                                          className="w-3 h-3" 
                                          fill="none" 
                                          stroke="currentColor" 
                                          strokeWidth="2" 
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900 font-sans">
                                    {transaction.deadline ? (() => {
                                      const [year, month, day] = transaction.deadline.split('-').map(Number)
                                      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
                                    })() : '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans",
                                    getStatusColor(transaction)
                                  )}>
                                    {getStatusText(transaction)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-medium text-gray-900 font-sans">
                                    {formatCurrency(transaction.value)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex justify-center">
                                    <AttachmentClip transaction={transaction} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Category Management Modal */}
      {showCategoryManagementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-light bg-neutral-bg rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-dark">Gestión de Categorías</h2>
              <button
                onClick={() => setShowCategoryManagementModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-5 py-4">
              {/* Categories list */}
              <div className="mb-4">
                <h3 className="text-sm text-green-dark mb-2 font-medium">Categorías disponibles:</h3>
                {loadingManagementCategories ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando categorías...</p>
                  </div>
                ) : managementCategories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No hay categorías disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {managementCategories.map((category, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 px-4 py-2 rounded-md hover:bg-gray-50 transition-all"
                      >
                        {editingCategory && editingCategory.name === category.name ? (
                          // Edit mode
                          <div className="flex-1 flex items-center space-x-2">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                maxLength={50}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditCategorySave()
                                  } else if (e.key === 'Escape') {
                                    handleEditCategoryCancel()
                                  }
                                }}
                                autoFocus
                              />
                              {editCategoryError && (
                                <p className="text-red-500 text-xs mt-1">{editCategoryError}</p>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={handleEditCategorySave}
                                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                title="Guardar cambios"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </button>
                              <button
                                onClick={handleEditCategoryCancel}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Cancelar edición"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <>
                            <div className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                              <span>{category.name}</span>
                              <span className="text-xs text-gray-400">
                                · {category.isDefault ? 'Predeterminada' : 'Creada por ti'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditCategoryClick(category)}
                                className="w-4 h-4 text-green-dark opacity-70 hover:opacity-100 transition-all"
                                title="Editar categoría"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategoryClick(category)}
                                className="w-4 h-4 text-green-dark opacity-70 hover:opacity-100 transition-all"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new category section */}
              {!showAddCategoryInput ? (
                <div className="mb-4">
                  <button
                    onClick={handleAddCategoryClick}
                    className="w-full flex items-center gap-2 px-4 py-2 border border-dashed border-border-light rounded-md text-sm text-green-dark hover:bg-[#f8fbf7] cursor-pointer transition-colors"
                  >
                    <svg className="w-4 h-4 text-green-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Agregar nueva categoría</span>
                  </button>
                </div>
              ) : (
                <div className="mb-4 mt-4 border-t border-border-light pt-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-green-dark font-medium mb-1">
                        Nueva categoría
                      </label>
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="Nombre de la categoría"
                        className="w-full px-3 py-1.5 rounded-md border border-border-light text-sm text-gray-dark focus:outline-none focus:ring-2 focus:ring-green-primary"
                        maxLength={50}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCategory()
                          }
                        }}
                      />
                      {addCategoryError && (
                        <p className="text-red-500 text-xs mt-1">{addCategoryError}</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      <button
                        onClick={handleAddCategory}
                        disabled={addingCategory || !newCategoryInput.trim()}
                        className="bg-green-primary text-white hover:bg-[#77b16e] rounded-md px-4 py-2 text-sm font-medium transition-all w-full sm:w-auto disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {addingCategory ? 'Agregando...' : 'Agregar'}
                      </button>
                      <button
                        onClick={handleCancelAddCategory}
                        disabled={addingCategory}
                        className="bg-border-light text-gray-dark hover:bg-[#e3e4db] rounded-md px-4 py-2 text-sm font-medium transition-all w-full sm:w-auto disabled:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setShowCategoryManagementModal(false)}
                  className="bg-border-light text-gray-dark hover:bg-[#e3e4db] rounded-md px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteCategoryConfirmation && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-light bg-neutral-bg rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-dark">Confirmar eliminación</h2>
              <button
                onClick={handleCancelDeleteCategory}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-5 py-4">
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    editingCategory && editingCategory.isDefault ? 'bg-neutral-bg text-green-dark' : 'bg-green-light text-green-primary'
                  }`}>
                    <Tag className="h-4 w-4" fill="currentColor" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-dark font-medium">
                    <span>{categoryToDelete}</span>
                    {editingCategory && (
                      <span className="text-xs text-gray-400">
                        · {editingCategory.isDefault ? 'Predeterminada' : 'Creada por ti'}
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-dark mb-3">
                  ¿Estás seguro?
                </p>
                
                {affectedTransactionsCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Transacciones afectadas
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Eliminando esta categoría va a afectar <strong>{affectedTransactionsCount}</strong> transacciones.
                      Estas transacciones cambiarán a "Sin categoría".
                    </p>
                  </div>
                )}
                
                {addCategoryError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-700">{addCategoryError}</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelDeleteCategory}
                  disabled={deletingCategory}
                  className="flex-1 bg-border-light text-gray-dark hover:bg-[#e3e4db] rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteCategory}
                  disabled={deletingCategory}
                  className="flex-1 bg-error-bg text-error-red hover:bg-red-100 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deletingCategory ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-light bg-neutral-bg rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-dark">Confirmar Edición</h2>
              <button
                onClick={handleCancelEditCategory}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-5 py-4">
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div>
                    <span className="text-sm text-gray-500">Cambiar nombre de:</span>
                    <div className="font-medium text-gray-900">
                      <span className="text-sm text-gray-400 line-through">{editingCategory.name}</span>
                      <span className="mx-2">→</span>
                      <span className="text-sm text-green-dark font-medium">{editCategoryName}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-xs text-gray-400">
                        · {editingCategory.isDefault ? 'Predeterminada' : 'Creada por ti'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-dark mb-3">
                  ¿Estás seguro que deseas cambiar el nombre de esta categoría?
                </p>
                
                {affectedTransactionsCount > 0 && (
                  <div className="bg-green-50 text-green-800 border border-green-200 rounded-md px-4 py-2 text-sm mb-3">
                    <strong className="font-medium">ℹ️ Transacciones afectadas</strong><br />
                    Cambiar el nombre de esta categoría va a actualizar <strong>{affectedTransactionsCount}</strong> transacciones.
                  </div>
                )}
                
                {editCategoryError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-700">{editCategoryError}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={handleCancelEditCategory}
                  disabled={editingCategoryState}
                  className="bg-border-light text-gray-dark hover:bg-[#e3e4db] rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmEditCategory}
                  disabled={editingCategoryState}
                  className="bg-green-primary text-white hover:bg-[#77b16e] rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingCategoryState ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modals */}
      <AttachmentModals />
    </div>
  )
} 