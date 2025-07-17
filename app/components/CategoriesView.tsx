'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp, Calendar, DollarSign, FileText, Repeat, CheckCircle, AlertCircle, TrendingUp, X, Paperclip, Settings, Trash2, Edit2 } from 'lucide-react'
import { type Transaction, type User, type TransactionAttachment, type RecurrentExpense } from '@/lib/supabase'
import { fetchUserTransactions, fetchAttachmentCounts, fetchUserExpenses } from '@/lib/dataUtils'
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
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedRecurrentGroups, setExpandedRecurrentGroups] = useState<Set<string>>(new Set())
  const [expandedYearGroups, setExpandedYearGroups] = useState<Set<string>>(new Set())
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
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryInfo | null>(null)
  const [affectedTransactionsCount, setAffectedTransactionsCount] = useState<number>(0)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Edit category state
  const [editingCategory, setEditingCategory] = useState<CategoryInfo | null>(null)
  const [editCategoryInput, setEditCategoryInput] = useState('')
  const [editCategoryError, setEditCategoryError] = useState<string | null>(null)
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<{ old: CategoryInfo; new: string } | null>(null)
  const [editAffectedTransactionsCount, setEditAffectedTransactionsCount] = useState<number>(0)
  const [updatingCategory, setUpdatingCategory] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Create recurrentGoalMap like in DashboardView
  const recurrentGoalMap = useMemo(() => {
    const map: Record<number, boolean> = {}
    recurrentExpenses.forEach(re => {
      if (re.isgoal) map[re.id] = true
    })
    console.log('🎯 CategoriesView: recurrentGoalMap created', map)
    return map
  }, [recurrentExpenses])

  // Direct attachment functionality implementation (without external hook)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)
  const [showTransactionAttachments, setShowTransactionAttachments] = useState(false)
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null)

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
    
    console.log('Attachment uploaded:', attachment)
  }

  const handleAttachmentDeleted = (attachmentId: number) => {
    // Refresh attachment counts
    console.log('Attachment deleted:', attachmentId)
  }

  // Attachment clip component
  const AttachmentClip = ({ transaction, className = "" }: { transaction: Transaction, className?: string }) => {
    return (
      <button
        onClick={() => handleAttachmentList(transaction)}
        className={`text-gray-600 hover:text-gray-800 relative flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md p-1 rounded-md hover:bg-gray-50 ${className}`}
        title="Ver archivos adjuntos"
      >
        <Paperclip className="h-4 w-4 transition-all duration-200" />
        {attachmentCounts[transaction.id] > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium transition-all duration-200 hover:scale-110">
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
            <section className="relative bg-white rounded-xl p-0 w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowTransactionAttachments(false)
                  setSelectedTransactionForAttachments(null)
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                    <Paperclip className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Archivos Adjuntos</h2>
                    <p className="text-sm text-gray-600">Para: {selectedTransactionForAttachments.description}</p>
                  </div>
                </div>
                
                <TransactionAttachments
                  transactionId={selectedTransactionForAttachments.id}
                  userId={user.id}
                  onAttachmentDeleted={handleAttachmentDeleted}
                  onAddAttachment={() => handleAttachmentUpload(selectedTransactionForAttachments)}
                />
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

  // Navigation function to redirect to Control del mes
  const handleNavigateToMonth = async (month: number, year: number) => {
    try {
      console.log(`🗂️ CategoriesView: Navigating to Control del mes - Month: ${month}, Year: ${year}`)
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

  // Helper function to check if date is overdue
  const isDateOverdue = (deadline: string): boolean => {
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return deadlineDate < todayDate;
  }

  // Fetch transactions data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔄 CategoriesView: Fetching all transactions`)
      
      // Fetch all transactions (simplified, no filtering)
      const allTransactions = await fetchUserTransactions(user, undefined, undefined)
      console.log(`📊 CategoriesView: Fetched ${allTransactions.length} transactions`)

      // Fetch recurrent expenses to build recurrentGoalMap
      const expenses = await fetchUserExpenses(user)
      console.log(`📊 CategoriesView: Fetched ${expenses.recurrent.length} recurrent expenses`)

      setTransactions(allTransactions)
      setRecurrentExpenses(expenses.recurrent)

      // Load attachment counts
      await loadAttachmentCounts(allTransactions)

    } catch (error) {
      console.error('❌ Error in fetchData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [user])

  // Data sync effect
  useDataSyncEffect(() => {
    console.log('🔄 CategoriesView: Data sync triggered, refetching data')
    console.log('🔄 CategoriesView: This should sync when categories are updated in DashboardView')
    fetchData()
  }, [])

  // Load categories for management modal
  const loadManagementCategories = async () => {
    setLoadingManagementCategories(true)
    try {
      const categories = await getUserActiveCategoriesWithInfo(user.id)
      // Filter out "Sin categoría" as it's not a user-available category
      const filteredCategories = categories.filter(category => category.name !== 'Sin categoría')
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
    setShowDeleteConfirmModal(false)
    setCategoryToDelete(null)
    setDeleteError(null)
    setEditingCategory(null)
    setEditCategoryInput('')
    setEditCategoryError(null)
    setShowEditConfirmModal(false)
    setCategoryToEdit(null)
    setEditError(null)
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
      setAffectedTransactionsCount(count)
      setCategoryToDelete(category)
      setShowDeleteConfirmModal(true)
      setDeleteError(null)
    } catch (error) {
      console.error('Error counting affected transactions:', error)
      setDeleteError('Error al verificar las transacciones afectadas')
    }
  }

  // Handle delete category confirmation
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return

    setDeletingCategory(true)
    setDeleteError(null)

    try {
      const result = await deleteUserCategory(user.id, categoryToDelete.name, categoryToDelete.isDefault)
      
      if (result.success) {
        // Close modal and reload categories
        setShowDeleteConfirmModal(false)
        setCategoryToDelete(null)
        await loadManagementCategories()
        
        // Refresh local data to reflect changes in this view
        await fetchData()
        
        // Notify other views that data has changed
        refreshData(user.id, 'delete_category')
      } else {
        setDeleteError(result.error || 'Error al eliminar la categoría')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setDeleteError('Error interno del servidor')
    } finally {
      setDeletingCategory(false)
    }
  }

  // Handle cancel delete category
  const handleCancelDeleteCategory = () => {
    setShowDeleteConfirmModal(false)
    setCategoryToDelete(null)
    setDeleteError(null)
    setAffectedTransactionsCount(0)
  }

  // Handle edit category click
  const handleEditCategoryClick = (category: CategoryInfo) => {
    setEditingCategory(category)
    setEditCategoryInput(category.name)
    setEditCategoryError(null)
  }

  // Handle edit category save
  const handleEditCategorySave = async () => {
    if (!editingCategory || !editCategoryInput.trim()) {
      setEditCategoryError('El nombre de la categoría no puede estar vacío')
      return
    }

    // Validate the new name
    const validation = await validateCategoryForEdit(user.id, editCategoryInput.trim(), editingCategory.name)
    
    if (!validation.valid) {
      setEditCategoryError(validation.error || 'Error en la validación')
      return
    }

    // If name hasn't changed, just cancel editing
    if (editCategoryInput.trim().toLowerCase() === editingCategory.name.toLowerCase()) {
      setEditingCategory(null)
      setEditCategoryInput('')
      setEditCategoryError(null)
      return
    }

    try {
      // Count affected transactions (only from transactions table for user display)
      const count = await countAffectedTransactions(user.id, editingCategory.name, true)
      setEditAffectedTransactionsCount(count)
      setCategoryToEdit({ old: editingCategory, new: editCategoryInput.trim() })
      setShowEditConfirmModal(true)
      setEditError(null)
    } catch (error) {
      console.error('Error counting affected transactions:', error)
      setEditCategoryError('Error al verificar las transacciones afectadas')
    }
  }

  // Handle edit category cancel
  const handleEditCategoryCancel = () => {
    setEditingCategory(null)
    setEditCategoryInput('')
    setEditCategoryError(null)
  }

  // Handle confirm edit category
  const handleConfirmEditCategory = async () => {
    if (!categoryToEdit) return

    setUpdatingCategory(true)
    setEditError(null)

    try {
      const result = await updateUserCategory(user.id, categoryToEdit.old.name, categoryToEdit.new)
      
      if (result.success) {
        // Close modals and reset state
        setShowEditConfirmModal(false)
        setCategoryToEdit(null)
        setEditingCategory(null)
        setEditCategoryInput('')
        setEditCategoryError(null)
        
        // Reload categories
        await loadManagementCategories()
        
        // Refresh local data to reflect changes in this view
        await fetchData()
        
        // Notify other views that data has changed
        refreshData(user.id, 'edit_category')
      } else {
        setEditError(result.error || 'Error al actualizar la categoría')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      setEditError('Error interno del servidor')
    } finally {
      setUpdatingCategory(false)
    }
  }

  // Handle cancel edit category
  const handleCancelEditCategory = () => {
    setShowEditConfirmModal(false)
    setCategoryToEdit(null)
    setEditError(null)
    setEditAffectedTransactionsCount(0)
  }

  // Group transactions by category with recurrent and year grouping
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    console.log('🔄 CategoriesView: Recalculating categoryGroups', {
      transactionsCount: transactions.length,
      recurrentGoalMapSize: Object.keys(recurrentGoalMap).length
    })
    
    // Only include expense transactions (simplified, no filtering)
    const expenseTransactions = transactions.filter(t => 
      t.type === 'expense' && 
      t.category !== 'Ahorro' && 
      !recurrentGoalMap[t.source_id]
    )
    
    console.log('📊 CategoriesView: Transaction filtering results', {
      totalTransactions: transactions.length,
      expenseTransactions: expenseTransactions.length,
      filtersApplied: {
        onlyExpenses: 'type === expense',
        excludeAhorro: 'category !== Ahorro',
        excludeGoals: 'isgoal !== true'
      },
      sampleExpenseTransactions: expenseTransactions.slice(0, 3).map(t => ({
        id: t.id,
        description: t.description,
        category: t.category,
        type: t.type,
        source_type: t.source_type,
        value: t.value,
        isGoal: recurrentGoalMap[t.source_id] || false
      }))
    })

    // Group by category
    const groups = new Map<string, Transaction[]>()
    
    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'Sin categoría'
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(transaction)
    })
    
    console.log('🏷️ CategoriesView: Category grouping results', {
      categoriesFound: Array.from(groups.keys()),
      categoryDetails: Array.from(groups.entries()).map(([cat, trans]) => ({
        category: cat,
        transactionCount: trans.length,
        totalValue: trans.reduce((sum, t) => sum + t.value, 0)
      }))
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
    
    console.log('✅ CategoriesView: Final categoryGroups result', {
      categoriesCount: sortedCategories.length,
      categories: sortedCategories.map(cat => ({
        name: cat.categoryName,
        count: cat.count,
        total: cat.total,
        recurrentGroups: cat.recurrentGroups.length,
        nonRecurrentTransactions: cat.nonRecurrentTransactions.length
      }))
    })
    
    return sortedCategories
  }, [transactions, recurrentGoalMap])

  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  // Toggle recurrent group expansion
  const toggleRecurrentGroup = (categoryName: string, sourceId: number) => {
    const groupKey = `${categoryName}-${sourceId}`
    setExpandedRecurrentGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  // Toggle year group expansion
  const toggleYearGroup = (categoryName: string, sourceId: number, year: number) => {
    const yearKey = `${categoryName}-${sourceId}-${year}`
    setExpandedYearGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(yearKey)) {
        newSet.delete(yearKey)
      } else {
        newSet.add(yearKey)
      }
      return newSet
    })
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Transacciones por Categoría</h1>
          <p className="text-gray-600">Organiza y analiza tus gastos agrupados por categoría</p>
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
      <div className="flex-1 flex px-6 lg:px-8 pb-6 lg:pb-8 gap-4 min-h-0">
        {/* Left Column - Categories List */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Categorías
              </h2>
              <button
                onClick={handleCategoryManagementClick}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Gestionar categorías"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">{texts.loading}</div>
          ) : categoryGroups.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No hay categorías para mostrar</div>
          ) : (
            <div className="overflow-y-auto">
              {categoryGroups.map((group) => {
                const displayName = getCategoryDisplayName(group.categoryName)
                const isSelected = selectedCategory === group.categoryName
                
                return (
                  <button
                    key={group.categoryName}
                    onClick={() => {
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
                      setSelectedCategory(group.categoryName)
                    }}
                    className={`w-full p-4 text-left border-b border-gray-100 transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm ${
                      isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                          group.categoryName === 'sin categoría' || group.categoryName === 'Sin categoría'
                            ? 'bg-red-100'
                            : (() => {
                                // Check if it's a default category
                                const isDefaultCategory = Object.values(CATEGORIES.EXPENSE).includes(group.categoryName as any)
                                return isDefaultCategory ? 'bg-gray-100' : 'bg-blue-100'
                              })()
                        }`}>
                          <DollarSign className={`h-3 w-3 ${
                            group.categoryName === 'sin categoría' || group.categoryName === 'Sin categoría'
                              ? 'text-red-600'
                              : (() => {
                                  // Check if it's a default category
                                  const isDefaultCategory = Object.values(CATEGORIES.EXPENSE).includes(group.categoryName as any)
                                  return isDefaultCategory ? 'text-gray-600' : 'text-blue-600'
                                })()
                          }`} />
                        </div>
                        <div>
                          <h3 className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {displayName}
                          </h3>
                          <p className="text-xs text-gray-500">{group.count} transacciones</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {formatCurrency(group.total)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column - Canvas/Detail Area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {!selectedCategory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una categoría</h3>
                <p className="text-gray-500">Haz clic en una categoría de la izquierda para ver sus transacciones</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Selected Category Content - Direct Transaction Hierarchy */}
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const group = categoryGroups.find(g => g.categoryName === selectedCategory)
                  
                  // Debug logging
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
                  
                  if (!group) {
                    console.log('❌ No group found for selectedCategory:', selectedCategory)
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
                    console.log('⚠️ Group found but no transactions:', group)
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No hay transacciones en esta categoría</p>
                        <p className="text-xs text-gray-400 mt-2">Categoría: {group.categoryName}</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-3">
                      {/* Recurrent Groups */}
                      {group.recurrentGroups.map((recurrentGroup) => {
                        const groupKey = `${group.categoryName}-${recurrentGroup.sourceId}`
                        const isRecurrentExpanded = expandedRecurrentGroups.has(groupKey)
                        
                        // Determine the year range for the description
                        const firstYear = recurrentGroup.yearGroups[0]?.year;
                        const lastYear = recurrentGroup.yearGroups[recurrentGroup.yearGroups.length - 1]?.year;
                        const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear}-${lastYear}`;

                        return (
                          <div key={recurrentGroup.sourceId} className="bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                            {/* Recurrent Group Header */}
                            <button
                              onClick={() => toggleRecurrentGroup(group.categoryName, recurrentGroup.sourceId)}
                              className="w-full p-4 text-left transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm hover:bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-1.5 rounded-full ${getRecurrentGroupBackground(recurrentGroup)} transition-all duration-300 hover:scale-110`}>
                                    {getRecurrentGroupIcon(recurrentGroup)}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-gray-900">{recurrentGroup.description}</span>
                                    <span className="text-xs text-gray-500">({recurrentGroup.yearGroups.length} {recurrentGroup.yearGroups.length === 1 ? 'año' : 'años'}: {yearRange})</span>
                                  </div>
                                </div>
                                
                                {/* RIGHT: Total Value + Status + Expand Icon */}
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs text-gray-600">{formatCurrency(recurrentGroup.total)}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs ${recurrentGroup.overdue > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                    {recurrentGroup.overdue > 0 ? 'Vencido' : 'Al día'}
                                  </span>
                                  
                                  {isRecurrentExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Recurrent Group Transactions */}
                            {isRecurrentExpanded && (
                              <div className="px-4 pb-4 bg-white rounded-b-lg">
                                <div className="space-y-2">
                                  {recurrentGroup.yearGroups.map((yearGroup) => {
                                    const yearKey = `${group.categoryName}-${recurrentGroup.sourceId}-${yearGroup.year}`
                                    const isYearGroupExpanded = expandedYearGroups.has(yearKey)

                                    return (
                                      <div key={yearGroup.year} className="bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                                        {/* Year Group Header */}
                                        <button
                                          onClick={() => toggleYearGroup(group.categoryName, recurrentGroup.sourceId, yearGroup.year)}
                                          className="w-full p-3 text-left transition-all duration-300 transform hover:scale-[1.005] hover:shadow-sm hover:bg-gray-50 rounded-lg"
                                        >
                                          <div className="flex items-center justify-between">
                                            {/* LEFT: Blue icon + Year + Actual + Months */}
                                            <div className="flex items-center space-x-2">
                                              <div className="p-1 rounded-full bg-blue-100 transition-all duration-300 hover:scale-110">
                                                <Calendar className="h-3 w-3 text-blue-600" />
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-900">{yearGroup.year}</span>
                                                {yearGroup.year === new Date().getFullYear() && (
                                                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                    Actual
                                                  </span>
                                                )}
                                                <span className="text-xs text-gray-500">({yearGroup.transactions.length} meses)</span>
                                              </div>
                                            </div>
                                            
                                            {/* RIGHT: Total Value + Status with specific logic */}
                                            <div className="flex items-center space-x-3">
                                              <span className="text-xs text-gray-600">{formatCurrency(yearGroup.total)}</span>
                                              <span className={`px-2 py-1 rounded-full text-xs ${(() => {
                                                const currentYear = new Date().getFullYear()
                                                const hasOverdue = yearGroup.overdue > 0
                                                
                                                if (hasOverdue) {
                                                  return 'bg-red-100 text-red-800'
                                                } else if (yearGroup.year === currentYear) {
                                                  return 'bg-green-100 text-green-800'
                                                } else if (yearGroup.year < currentYear) {
                                                  return 'bg-blue-100 text-blue-800'
                                                } else {
                                                  return 'bg-yellow-100 text-yellow-800'
                                                }
                                              })()}`}>
                                                {(() => {
                                                  const currentYear = new Date().getFullYear()
                                                  const hasOverdue = yearGroup.overdue > 0
                                                  
                                                  if (hasOverdue) {
                                                    return 'Vencido'
                                                  } else if (yearGroup.year === currentYear) {
                                                    return 'Al día'
                                                  } else if (yearGroup.year < currentYear) {
                                                    return 'Pagado'
                                                  } else {
                                                    return 'Pendiente'
                                                  }
                                                })()}
                                              </span>
                                              
                                              {isYearGroupExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                              ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-400 transition-all duration-300" />
                                              )}
                                            </div>
                                          </div>
                                        </button>

                                        {/* Year Group Transactions */}
                                        {isYearGroupExpanded && (
                                          <div className="px-3 pb-3 bg-white rounded-b-lg">
                                            <div className="space-y-1">
                                              {yearGroup.transactions.map((transaction) => (
                                                <div key={transaction.id} className="bg-gray-50 rounded-md p-3 border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                      {getTransactionIcon(transaction)}
                                                      <span className="text-xs text-gray-900">{months[transaction.month - 1]}</span>
                                                      {/* Navigation Link Icon */}
                                                      <button
                                                        onClick={() => handleNavigateToMonth(transaction.month, transaction.year)}
                                                        className="text-gray-400 hover:text-blue-600 transition-all duration-300 p-1 rounded-md hover:bg-blue-50 hover:scale-[1.005] hover:shadow-sm"
                                                        title={`Ir a Control del mes - ${months[transaction.month - 1]} ${transaction.year}`}
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
                                                      {transaction.deadline && (
                                                        <span className="text-xs text-gray-500">
                                                          Vence: {(() => {
                                                            const [year, month, day] = transaction.deadline.split('-').map(Number);
                                                            return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
                                                          })()}
                                                        </span>
                                                      )}
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2">
                                                      <span className="text-xs text-gray-900">
                                                        {formatCurrency(transaction.value)}
                                                      </span>
                                                      <span className={cn(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs",
                                                        transaction.status === 'paid' 
                                                          ? 'bg-green-100 text-green-800'
                                                          : transaction.deadline && isDateOverdue(transaction.deadline)
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                      )}>
                                                        {transaction.status === 'paid' 
                                                          ? 'Pagado' 
                                                          : transaction.deadline && isDateOverdue(transaction.deadline)
                                                            ? 'Vencido'
                                                            : 'Pendiente'
                                                        }
                                                      </span>
                                                      {/* Attachment Clip */}
                                                      <AttachmentClip transaction={transaction} />
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Non-Recurrent Transactions - Level 1 Flat Layout */}
                      {group.nonRecurrentTransactions.map((transaction) => {
                        // Calculate status: "Al día" if not overdue, "Vencido" if overdue
                        const isOverdue = transaction.status === 'pending' && transaction.deadline && isDateOverdue(transaction.deadline)
                        const status = isOverdue ? 'Vencido' : 'Al día'
                        
                        return (
                          <div key={transaction.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all duration-200 hover:shadow-sm hover:scale-[1.005] hover:border-blue-200">
                            <div className="flex items-center justify-between">
                              {/* LEFT: Icon + Description + Year */}
                              <div className="flex items-center space-x-3">
                                <div className={`p-1.5 rounded-full ${getTransactionBackground(transaction)} transition-all duration-300 hover:scale-110`}>
                                  {getTransactionIcon(transaction)}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-900">{transaction.description}</span>
                                  <span className="text-xs text-gray-500">{months[transaction.month - 1]} {transaction.year}</span>
                                </div>
                              </div>
                              
                              {/* RIGHT: Total Value + Status */}
                              <div className="flex items-center space-x-3">
                                <span className="text-xs text-gray-600">{formatCurrency(transaction.value)}</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                  {status}
                                </span>
                                {/* Attachment Clip */}
                                <AttachmentClip transaction={transaction} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Category Management Modal */}
      {showCategoryManagementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-light bg-neutral-bg">
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
                        className="flex items-center justify-between gap-3 px-4 py-2 rounded-md bg-neutral-bg hover:bg-[#f5f6f4] transition-all"
                      >
                        {editingCategory && editingCategory.name === category.name ? (
                          // Edit mode
                          <div className="flex-1 flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                              category.isDefault ? 'bg-[#e3e4db] text-green-dark' : 'bg-[#d7eaff] text-[#3f70ad]'
                            }`}>
                              <DollarSign className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={editCategoryInput}
                                onChange={(e) => setEditCategoryInput(e.target.value)}
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
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                category.isDefault ? 'bg-[#e3e4db] text-green-dark' : 'bg-[#d7eaff] text-[#3f70ad]'
                              }`}>
                                <DollarSign className="h-4 w-4" />
                              </div>
                              <span className="text-sm text-gray-dark font-medium">
                                {category.name}
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
                <div className="mb-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nueva categoría
                      </label>
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="Nombre de la categoría"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddCategory}
                        disabled={addingCategory || !newCategoryInput.trim()}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {addingCategory ? 'Agregando...' : 'Agregar'}
                      </button>
                      <button
                        onClick={handleCancelAddCategory}
                        disabled={addingCategory}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
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
      {showDeleteConfirmModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h2>
              <button
                onClick={handleCancelDeleteCategory}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-full ${
                    categoryToDelete.isDefault ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    <DollarSign className={`h-4 w-4 ${
                      categoryToDelete.isDefault ? 'text-gray-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <span className="text-lg font-medium text-gray-900">
                    {categoryToDelete.name}
                  </span>
                </div>
                
                <p className="text-gray-700 mb-3">
                  ¿Estás seguro que deseas eliminar esta categoría?
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
                
                {deleteError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-700">{deleteError}</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelDeleteCategory}
                  disabled={deletingCategory}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteCategory}
                  disabled={deletingCategory}
                  className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {deletingCategory ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {showEditConfirmModal && categoryToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Confirmar Edición</h2>
              <button
                onClick={handleCancelEditCategory}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-full ${
                    categoryToEdit.old.isDefault ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    <DollarSign className={`h-4 w-4 ${
                      categoryToEdit.old.isDefault ? 'text-gray-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Cambiar nombre de:</span>
                    <div className="font-medium text-gray-900">
                      <span className="line-through text-gray-500">{categoryToEdit.old.name}</span>
                      <span className="mx-2">→</span>
                      <span className="text-blue-600">{categoryToEdit.new}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-3">
                  ¿Estás seguro que deseas cambiar el nombre de esta categoría?
                </p>
                
                {editAffectedTransactionsCount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Transacciones afectadas
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Cambiar el nombre de esta categoría va a actualizar <strong>{editAffectedTransactionsCount}</strong> transacciones.
                    </p>
                  </div>
                )}
                
                {editError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-700">{editError}</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelEditCategory}
                  disabled={updatingCategory}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmEditCategory}
                  disabled={updatingCategory}
                  className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {updatingCategory ? 'Actualizando...' : 'Actualizar'}
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