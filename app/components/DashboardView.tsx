'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, Paperclip, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, fetchAttachmentCounts, measureQueryPerformance, clearUserCache } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import { texts } from '@/lib/translations'
import { useRouter, useSearchParams } from 'next/navigation'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

interface DashboardViewProps {
  navigationParams?: { month?: number; year?: number } | null
  user: User
  onDataChange?: () => void
  refreshTrigger?: number
}

export default function DashboardView({ navigationParams, user, onDataChange, refreshTrigger }: DashboardViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Remove excessive debug logging
  // console.log('🔄 DashboardView rendered with refreshTrigger:', refreshTrigger)
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(navigationParams?.month || new Date().getMonth() + 1)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'recurrent' | 'non_recurrent'>('all')
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  
  // Sorting state
  const [sortField, setSortField] = useState<'description' | 'deadline' | 'status' | 'value' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Parse URL parameters on mount and when URL changes
  useEffect(() => {
    const urlMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const urlYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const urlFilter = searchParams.get('filter') as 'all' | 'recurrent' | 'non_recurrent' || 'all'
    
    if (urlMonth && urlYear) {
      setSelectedMonth(urlMonth)
      setSelectedYear(urlYear)
    }
    
    if (urlFilter) {
      setFilterType(urlFilter)
    }
  }, [searchParams])

  // Update URL when filters or month/year selection changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Always set view to dashboard
    params.set('view', 'dashboard')
    
    // Set month and year
    params.set('month', selectedMonth.toString())
    params.set('year', selectedYear.toString())
    
    // Set filter (only if not 'all')
    if (filterType !== 'all') {
      params.set('filter', filterType)
    } else {
      params.delete('filter')
    }
    
    const newUrl = `/?${params.toString()}`
    router.replace(newUrl, { scroll: false })
  }, [selectedMonth, selectedYear, filterType, router, searchParams])

  const fetchData = async () => {
    try {
      setError(null)
      setLoading(true)
      
      // Use optimized data fetching with performance monitoring
      const result = await measureQueryPerformance(
        'fetchDashboardData',
        async () => {
          const [transactions, expenses] = await Promise.all([
            fetchUserTransactions(user, selectedMonth, selectedYear),
            fetchUserExpenses(user)
          ])
          
          return { transactions, expenses }
        }
      )

      setTransactions(result.transactions)
      setRecurrentExpenses(result.expenses.recurrent)
      setNonRecurrentExpenses(result.expenses.nonRecurrent)

      // Fetch attachment counts if we have transactions
      if (result.transactions && result.transactions.length > 0) {
        const transactionIds = result.transactions.map((t: Transaction) => t.id)
        const attachmentCountsData = await fetchAttachmentCounts(user, transactionIds)
        setAttachmentCounts(attachmentCountsData)
      }

    } catch (error) {
      console.error('❌ Error in fetchData():', error)
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  // Consolidated useEffect for data fetching
  useEffect(() => {
    console.log('=== CONSOLIDATED useEffect triggered ===')
    console.log('selectedMonth:', selectedMonth)
    console.log('selectedYear:', selectedYear)
    console.log('refreshTrigger:', refreshTrigger)
    
    fetchData()
  }, [selectedMonth, selectedYear, refreshTrigger])

  // Remove the individual useEffects that were causing multiple calls
  // useEffect(() => {
  //   fetchData()
  // }, [])

  // useEffect(() => {
  //   fetchData()
  // }, [selectedMonth, selectedYear])

  // useEffect(() => {
  //   if (refreshTrigger !== undefined && refreshTrigger > 0) {
  //     console.log('🔄 DashboardView useEffect triggered by refreshTrigger:', refreshTrigger)
  //     
  //     // Add a small delay to prevent multiple rapid calls
  //     const timeoutId = setTimeout(() => {
  //       fetchData()
  //     }, 100)
  //     
  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [refreshTrigger])

  const filteredTransactions = transactions.filter(transaction => 
    transaction.year === selectedYear && transaction.month === selectedMonth
  )

  // Apply type filter
  const typeFilteredTransactions = filteredTransactions.filter(transaction => {
    if (filterType === 'all') return true
    return transaction.source_type === filterType
  })

  // Sort transactions by deadline (closest first) only
  const sortedTransactions = [...typeFilteredTransactions].sort((a, b) => {
    // Sort by deadline (closest first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    
    // If one has deadline and other doesn't, prioritize the one with deadline
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    
    // If neither has deadline, sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Apply custom sorting if a sort field is selected
  const applyCustomSorting = (transactions: Transaction[]) => {
    if (!sortField) return transactions

    return [...transactions].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'description':
          comparison = a.description.localeCompare(b.description)
          break
        case 'deadline':
          // Handle cases where deadline might be null
          if (!a.deadline && !b.deadline) comparison = 0
          else if (!a.deadline) comparison = 1
          else if (!b.deadline) comparison = -1
          else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'value':
          comparison = a.value - b.value
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const finalSortedTransactions = applyCustomSorting(sortedTransactions)

  // Calcular totales del mes según la lógica del usuario
  const monthlyStats = {
    total: filteredTransactions.reduce((sum, t) => sum + t.value, 0), // Total del mes
    paid: filteredTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0), // Ya pagué
    pending: filteredTransactions.filter(t => {
      // Falta pagar: status 'pending' y NO vencidas
      if (t.status !== 'pending') return false
      if (!t.deadline) return true // Sin fecha límite, no está vencida
      return new Date(t.deadline) >= new Date() // No vencida
    }).reduce((sum, t) => sum + t.value, 0),
    overdue: filteredTransactions.filter(t => {
      // Se pasó la fecha: status 'pending' y vencidas
      if (t.status !== 'pending') return false
      if (!t.deadline) return false // Sin fecha límite, no puede estar vencida
      return new Date(t.deadline) < new Date() // Vencida
    }).reduce((sum, t) => sum + t.value, 0)
  }

  // Remove excessive debug logging
  // console.log('=== DEBUG MONTHLY STATS ===')
  // console.log('Selected month/year:', selectedMonth, selectedYear)
  // console.log('Filter type:', filterType)
  // console.log('All transactions count:', transactions.length)
  // console.log('Filtered transactions count:', filteredTransactions.length)
  // console.log('Type filtered transactions count:', typeFilteredTransactions.length)
  // console.log('Sorted transactions count:', sortedTransactions.length)
  
  // console.log('All transactions for month:', filteredTransactions.map(t => ({
  //   id: t.id,
  //   description: t.description,
  //   value: t.value,
  //   status: t.status,
  //   deadline: t.deadline,
  //   isOverdue: t.deadline ? new Date(t.deadline) < new Date() : false,
  //   source_type: t.source_type,
  //   month: t.month,
  //   year: t.year
  // })))
  
  const paidTransactions = filteredTransactions.filter(t => t.status === 'paid')
  const pendingTransactions = filteredTransactions.filter(t => {
    if (t.status !== 'pending') return false
    if (!t.deadline) return true
    return new Date(t.deadline) >= new Date()
  })
  const overdueTransactions = filteredTransactions.filter(t => {
    if (t.status !== 'pending') return false // Only include pending transactions
    if (!t.deadline) return false // No deadline, can't be overdue
    return new Date(t.deadline) < new Date() // Overdue
  })
  
  // console.log('Paid transactions:', paidTransactions.map(t => ({ id: t.id, description: t.description, value: t.value })))
  // console.log('Pending transactions:', pendingTransactions.map(t => ({ id: t.id, description: t.description, value: t.value })))
  // console.log('Overdue transactions:', overdueTransactions.map(t => ({ id: t.id, description: t.description, value: t.value, status: t.status })))
  
  // console.log('Monthly stats:', {
  //   total: monthlyStats.total,
  //   paid: monthlyStats.paid,
  //   pending: monthlyStats.pending,
  //   overdue: monthlyStats.overdue
  // })
  
  // Verify totals
  const calculatedTotal = paidTransactions.reduce((sum, t) => sum + t.value, 0) + 
                         pendingTransactions.reduce((sum, t) => sum + t.value, 0) + 
                         overdueTransactions.reduce((sum, t) => sum + t.value, 0)
  
  // console.log('Verification:', {
  //   calculatedTotal,
  //   actualTotal: monthlyStats.total,
  //   match: calculatedTotal === monthlyStats.total
  // })
  // console.log('=== END DEBUG ===')

  const calculateTransactionCount = (type: ExpenseType, formData: any): number => {
    if (type === 'recurrent') {
      const { month_from, month_to, year_from, year_to } = formData
      let count = 0
      let currentYear = year_from
      let currentMonth = month_from
      
      while ((currentYear < year_to) || (currentYear === year_to && currentMonth <= month_to)) {
        count++
        if (currentMonth === 12) {
          currentMonth = 1
          currentYear++
        } else {
          currentMonth++
        }
      }
      return count
    } else if (type === 'non_recurrent') {
      return 1
    }
    return 0
  }

  const handleCheckboxChange = async (transactionId: number, isChecked: boolean) => {
    try {
      setError(null)
      console.log(`🔄 handleCheckboxChange called for transaction ${transactionId}, isChecked: ${isChecked}`)
      
      // Determine the new status based on checkbox and due date
      const transaction = transactions.find(t => t.id === transactionId)
      if (!transaction) {
        console.error(`❌ Transaction ${transactionId} not found in transactions array`)
        return
      }

      console.log(`📋 Found transaction:`, {
        id: transaction.id,
        description: transaction.description,
        currentStatus: transaction.status,
        deadline: transaction.deadline,
        isOverdue: transaction.deadline ? new Date(transaction.deadline) < new Date() : false
      })

      let newStatus: 'paid' | 'pending'
      if (isChecked) {
        newStatus = 'paid'
      } else {
        // If unchecked, check if it's overdue
        if (transaction.deadline && new Date(transaction.deadline) < new Date()) {
          newStatus = 'pending' // Will show as overdue in UI
        } else {
          newStatus = 'pending'
        }
      }
      
      console.log(`🔄 Updating status from '${transaction.status}' to '${newStatus}'`)

      // Optimistically update the local state first for immediate UI feedback
      setTransactions(prevTransactions => 
        prevTransactions.map(t => 
          t.id === transactionId 
            ? { ...t, status: newStatus }
            : t
        )
      )

      const { data, error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Supabase error (status update):', error)
        setError(`Error al actualizar estado: ${error.message}`)
        
        // Revert the optimistic update on error
        setTransactions(prevTransactions => 
          prevTransactions.map(t => 
            t.id === transactionId 
              ? { ...t, status: transaction.status }
              : t
          )
        )
        throw error
      }

      console.log('✅ Status update successful:', data)
      
      // Don't call onDataChange() for status updates since we're using optimistic updates
      // The optimistic update already provides immediate UI feedback
      // Calling onDataChange() would trigger a refresh that overwrites the optimistic update
      console.log('✅ Status update completed - optimistic update maintained')
      
    } catch (error) {
      console.error('❌ Error updating status:', error)
      setError(`Error al actualizar estado: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleDeleteTransaction = async (id: number) => {
    // Find the transaction to determine if it's recurrent
    const transaction = transactions.find(t => t.id === id)
    if (!transaction) return

    // Show custom delete modal
    setDeleteModalData({
      transactionId: id,
      transaction,
      isRecurrent: transaction.source_type === 'recurrent'
    })
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async (deleteSeries: boolean = false) => {
    if (!deleteModalData) return

    const { transactionId, transaction } = deleteModalData

    try {
      // Optimistically update the local state first for immediate UI feedback
      setTransactions(prevTransactions => 
        prevTransactions.filter(t => t.id !== transactionId)
      )

      let error = null
      if (transaction.source_type === 'recurrent' && deleteSeries) {
        // Delete the entire recurrent series
        const res = await supabase
          .from('recurrent_expenses')
          .delete()
          .eq('id', transaction.source_id)
          .eq('user_id', user.id)
        error = res.error
      } else {
        // Delete only this transaction
        const res = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId)
          .eq('user_id', user.id)
        error = res.error
      }

      if (error) {
        // Revert the optimistic update on error
        setTransactions(prevTransactions => [...prevTransactions, transaction])
        setError('Error al eliminar: ' + (error.message || 'Error desconocido'))
        return
      }

      // Don't call onDataChange() since we're using optimistic updates
      // The optimistic update already provides immediate UI feedback
      console.log('✅ Delete operation completed - optimistic update maintained')
      
    } catch (error) {
      setTransactions(prevTransactions => [...prevTransactions, transaction])
      setError('Error al eliminar: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setShowDeleteModal(false)
      setDeleteModalData(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteModalData(null)
  }

  const handleModifyTransaction = async (id: number) => {
    // Find the transaction to determine if it's recurrent
    const transaction = transactions.find(t => t.id === id)
    if (!transaction) return

    // Show modify modal
    setModifyModalData({
      transactionId: id,
      transaction,
      isRecurrent: transaction.source_type === 'recurrent',
      modifySeries: false
    })
    setShowModifyModal(true)
  }

  const handleConfirmModify = async (modifySeries: boolean) => {
    if (!modifyModalData) return

    const { transaction } = modifyModalData

    try {
      if (transaction.source_type === 'recurrent' && modifySeries) {
        // Get the original recurrent expense data
        const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
        if (!recurrentExpense) {
          setError('Original recurrent expense not found')
          return
        }

        // Set up form data for editing the entire series
        setModifyFormData({
          type: 'recurrent',
          description: recurrentExpense.description,
          month_from: recurrentExpense.month_from,
          month_to: recurrentExpense.month_to,
          year_from: recurrentExpense.year_from,
          year_to: recurrentExpense.year_to,
          value: recurrentExpense.value,
          payment_day_deadline: recurrentExpense.payment_day_deadline?.toString() || '',
          month: 1,
          year: 2025,
          payment_deadline: '',
          originalId: recurrentExpense.id,
          modifySeries: true
        })
      } else {
        // Set up form data for editing individual transaction
        if (transaction.source_type === 'recurrent') {
          const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
          if (!recurrentExpense) {
            setError('Original recurrent expense not found')
            return
          }

          setModifyFormData({
            type: 'recurrent',
            description: recurrentExpense.description,
            month_from: transaction.month,
            month_to: transaction.month,
            year_from: transaction.year,
            year_to: transaction.year,
            value: transaction.value,
            payment_day_deadline: recurrentExpense.payment_day_deadline?.toString() || '',
            month: transaction.month,
            year: transaction.year,
            payment_deadline: transaction.deadline || '',
            originalId: transaction.id,
            modifySeries: false
          })
        } else {
          const nonRecurrentExpense = nonRecurrentExpenses.find(nre => nre.id === transaction.source_id)
          if (!nonRecurrentExpense) {
            setError('Original non-recurrent expense not found')
            return
          }

          setModifyFormData({
            type: 'non_recurrent',
            description: nonRecurrentExpense.description,
            month_from: 1,
            month_to: 12,
            year_from: 2025,
            year_to: 2025,
            value: nonRecurrentExpense.value,
            payment_day_deadline: '',
            month: nonRecurrentExpense.month,
            year: nonRecurrentExpense.year,
            payment_deadline: nonRecurrentExpense.payment_deadline || '',
            originalId: nonRecurrentExpense.id,
            modifySeries: false
          })
        }
      }

      setShowModifyModal(false)
      setModifyModalData(null)
      setShowModifyForm(true)

    } catch (error) {
      console.error('Error setting up modify form:', error)
      setError(`Error al configurar el formulario de modificación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleCancelModify = () => {
    setShowModifyModal(false)
    setModifyModalData(null)
  }

  const handleModifyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!modifyFormData) return

    const period = modifyFormData.type === 'recurrent' 
      ? `${months[modifyFormData.month_from - 1]} ${modifyFormData.year_from} to ${months[modifyFormData.month_to - 1]} ${modifyFormData.year_to}`
      : `${months[modifyFormData.month - 1]} ${modifyFormData.year}`

    const action = modifyFormData.type === 'recurrent' && modifyFormData.modifySeries 
      ? 'modify entire series' 
      : 'modify transaction'

    // Show confirmation dialog
    setModifyConfirmationData({
      type: modifyFormData.type,
      description: modifyFormData.description,
      value: modifyFormData.value,
      period,
      action
    })
    setShowModifyConfirmation(true)
  }

  const handleConfirmModifySubmit = async () => {
    if (!modifyConfirmationData || !modifyFormData) return

    setError(null)
    setLoading(true)

    try {
      // Optimistically update the local state first for immediate UI feedback
      setTransactions(prevTransactions => 
        prevTransactions.map(t => {
          if (t.id === modifyFormData.originalId) {
            return {
              ...t,
              description: modifyFormData.description,
              value: Number(modifyFormData.value),
              deadline: modifyFormData.payment_deadline || null
            }
          }
          return t
        })
      )

      if (modifyFormData.type === 'recurrent') {
        const recurrentData = {
          description: modifyFormData.description,
          month_from: modifyFormData.month_from,
          month_to: modifyFormData.month_to,
          year_from: modifyFormData.year_from,
          year_to: modifyFormData.year_to,
          value: Number(modifyFormData.value),
          payment_day_deadline: modifyFormData.payment_day_deadline ? Number(modifyFormData.payment_day_deadline) : null
        }

        console.log('Modifying recurrent expense:', {
          modifySeries: modifyFormData.modifySeries,
          originalId: modifyFormData.originalId,
          recurrentData
        })

        if (modifyFormData.modifySeries && modifyFormData.originalId) {
          // Update the entire series
          console.log('Updating entire recurrent series...')
          const { data, error } = await supabase
            .from('recurrent_expenses')
            .update(recurrentData)
            .eq('id', modifyFormData.originalId)
            .eq('user_id', user.id)

          if (error) {
            // Revert the optimistic update on error
            setTransactions(prevTransactions => 
              prevTransactions.map(t => {
                if (t.id === modifyFormData.originalId) {
                  return {
                    ...t,
                    description: modifyFormData.description || t.description,
                    value: modifyFormData.value || t.value,
                    deadline: modifyFormData.payment_deadline || t.deadline
                  }
                }
                return t
              })
            )
            throw error
          }

          console.log('Recurrent expense updated successfully:', data)

          // Check if transactions were updated
          const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('source_id', modifyFormData.originalId)
            .eq('source_type', 'recurrent')
            .eq('user_id', user.id)

          if (transError) {
            console.error('Error checking transactions:', transError)
          } else {
            console.log('Transactions after update:', transactions)
          }
        } else {
          // Update individual transaction
          console.log('Updating individual transaction...')
          const { error } = await supabase
            .from('transactions')
            .update({
              description: modifyFormData.description,
              value: Number(modifyFormData.value),
              month: modifyFormData.month_from,
              year: modifyFormData.year_from,
              deadline: modifyFormData.payment_deadline || null
            })
            .eq('id', modifyFormData.originalId)
            .eq('user_id', user.id)

          if (error) {
            // Revert the optimistic update on error
            setTransactions(prevTransactions => 
              prevTransactions.map(t => {
                if (t.id === modifyFormData.originalId) {
                  return {
                    ...t,
                    description: modifyFormData.description || t.description,
                    value: modifyFormData.value || t.value,
                    deadline: modifyFormData.payment_deadline || t.deadline
                  }
                }
                return t
              })
            )
            throw error
          }
        }
      } else {
        const nonRecurrentData = {
          description: modifyFormData.description,
          year: modifyFormData.year,
          month: modifyFormData.month,
          value: Number(modifyFormData.value),
          payment_deadline: modifyFormData.payment_deadline || null
        }

        if (modifyFormData.originalId) {
          const { error } = await supabase
            .from('non_recurrent_expenses')
            .update(nonRecurrentData)
            .eq('id', modifyFormData.originalId)
            .eq('user_id', user.id)

          if (error) {
            // Revert the optimistic update on error
            setTransactions(prevTransactions => 
              prevTransactions.map(t => {
                if (t.id === modifyFormData.originalId) {
                  return {
                    ...t,
                    description: modifyFormData.description || t.description,
                    value: modifyFormData.value || t.value,
                    deadline: modifyFormData.payment_deadline || t.deadline
                  }
                }
                return t
              })
            )
            throw error
          }
        }
      }

      // Don't call onDataChange() since we're using optimistic updates
      // The optimistic update already provides immediate UI feedback
      console.log('✅ Modify operation completed - optimistic update maintained')
      
      // Reset form and close dialogs
      resetModifyForm()
      setShowModifyConfirmation(false)
      setModifyConfirmationData(null)
      
    } catch (error) {
      console.error('Error modifying expense:', error)
      setError(`Error al modificar gasto: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const resetModifyForm = () => {
    setModifyFormData(null)
    setShowModifyForm(false)
    setShowModifyConfirmation(false)
    setModifyConfirmationData(null)
  }

  // Attachment handlers
  const handleAttachmentUpload = (transaction: Transaction) => {
    setSelectedTransactionForAttachment(transaction)
    setShowAttachmentModal(true)
  }

  const handleAttachmentList = (transaction: Transaction) => {
    setSelectedTransactionForList(transaction)
    setShowAttachmentsList(true)
  }

  const handleAttachmentUploadComplete = (attachment: TransactionAttachment) => {
    // Update attachment counts
    setAttachmentCounts(prev => ({
      ...prev,
      [attachment.transaction_id]: (prev[attachment.transaction_id] || 0) + 1
    }))
    console.log('Attachment uploaded:', attachment)
  }

  const handleAttachmentDeleted = (attachmentId: number) => {
    // Refresh data after attachment deletion
    fetchData()
  }

  const handleSort = (field: 'description' | 'deadline' | 'status' | 'value') => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // If clicking a new field, set it as the sort field and default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusIcon = (transaction: Transaction) => {
    if (transaction.status === 'paid') {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    
    if (transaction.deadline && new Date(transaction.deadline) < new Date()) {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
    
    return null
  }

  const getStatusText = (transaction: Transaction) => {
    if (transaction.status === 'paid') return texts.paid
    if (transaction.deadline && new Date(transaction.deadline) < new Date()) return texts.overdue
    return texts.pending
  }

  const getStatusColor = (transaction: Transaction) => {
    if (transaction.status === 'paid') return 'bg-green-100 text-green-800'
    if (transaction.deadline && new Date(transaction.deadline) < new Date()) return 'bg-red-100 text-red-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteModalData, setDeleteModalData] = useState<{
    transactionId: number
    transaction: Transaction
    isRecurrent: boolean
  } | null>(null)

  // Modify modal state
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [modifyModalData, setModifyModalData] = useState<{
    transactionId: number
    transaction: Transaction
    isRecurrent: boolean
    modifySeries: boolean
  } | null>(null)

  // Modify form state
  const [showModifyForm, setShowModifyForm] = useState(false)
  const [modifyFormData, setModifyFormData] = useState<{
    type: ExpenseType
    description: string
    month_from: number
    month_to: number
    year_from: number
    year_to: number
    value: number
    payment_day_deadline: string
    month: number
    year: number
    payment_deadline: string
    originalId?: number
    modifySeries?: boolean
  } | null>(null)

  // Modify confirmation state
  const [showModifyConfirmation, setShowModifyConfirmation] = useState(false)
  const [modifyConfirmationData, setModifyConfirmationData] = useState<{
    type: ExpenseType
    description: string
    value: number
    period: string
    action: string
  } | null>(null)

  // Attachment modal state
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionForAttachment, setSelectedTransactionForAttachment] = useState<Transaction | null>(null)
  const [showAttachmentsList, setShowAttachmentsList] = useState(false)
  const [selectedTransactionForList, setSelectedTransactionForList] = useState<Transaction | null>(null)

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const monthAbbreviations = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ]

  // Available years for selection - easy to extend in the future
  const availableYears = [2025]

  // Helper function to format currency for display (rounded, no decimals)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  // Helper function to parse currency string back to number
  const parseCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '')
    return parseFloat(cleanValue) || 0
  }

  // Helper function to format currency for display while typing
  const formatCurrencyForInput = (value: string): string => {
    if (!value || value.trim() === '') return ''
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '')
    if (!cleanValue) return ''
    
    const numValue = parseFloat(cleanValue)
    if (isNaN(numValue)) return ''
    
    // Format with thousands separators
    return numValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  // Helper to format with dots as thousands separators
  const formatWithDots = (value: string): string => {
    if (!value) return ''
    // Remove non-digits except decimal
    let [int, dec] = value.replace(/[^\d.]/g, '').split('.')
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return dec !== undefined ? `${int}.${dec}` : int
  }

  // Helper function to get currency input value - just return the raw number as string
  const getCurrencyInputValue = (value: number): string => {
    if (value === 0) return ''
    return value.toString()
  }

  // Add movement modal state
  const [showAddMovementModal, setShowAddMovementModal] = useState(false)
  const [addMovementType, setAddMovementType] = useState<'recurrent' | 'non_recurrent' | null>(null)
  const [addMovementFormData, setAddMovementFormData] = useState({
    description: '',
    value: 0,
    payment_deadline: '',
    payment_day_deadline: ''
  })
  const [addMovementError, setAddMovementError] = useState<string | null>(null)
  const [addMovementLoading, setAddMovementLoading] = useState(false)
  const [isProcessingAddMovement, setIsProcessingAddMovement] = useState(false)

  // Add movement functions
  const handleAddMovement = () => {
    setShowAddMovementModal(true)
    setAddMovementType(null)
    setAddMovementFormData({
      description: '',
      value: 0,
      payment_deadline: '',
      payment_day_deadline: ''
    })
    setAddMovementError(null)
  }

  const handleAddMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('=== handleAddMovementSubmit CALLED ===')
    console.log('Event type:', e.type)
    console.log('Event target:', e.target)
    console.log('Current addMovementLoading:', addMovementLoading)
    console.log('Current isProcessingAddMovement:', isProcessingAddMovement)
    console.log('Stack trace:', new Error().stack)
    
    // Prevent multiple submissions
    if (addMovementLoading || isProcessingAddMovement) {
      console.log('=== PREVENTING DUPLICATE SUBMISSION ===')
      console.log('addMovementLoading:', addMovementLoading)
      console.log('isProcessingAddMovement:', isProcessingAddMovement)
      return
    }
    
    setAddMovementError(null)
    setAddMovementLoading(true)
    setIsProcessingAddMovement(true)

    // Validar máximo permitido por la base de datos
    if (addMovementFormData.value > 99999999) {
      setAddMovementError('El valor máximo permitido es $99,999,999')
      setAddMovementLoading(false)
      return
    }

    // Generate unique operation ID to prevent duplicates
    const operationId = `add_movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('=== STARTING ADD MOVEMENT ===', operationId)
    console.log('Form data:', addMovementFormData)
    console.log('Type:', addMovementType)
    console.log('User ID:', user?.id)
    console.log('Selected month/year:', selectedMonth, selectedYear)

    if (!addMovementType || !user) {
      setAddMovementError('Tipo de movimiento no seleccionado')
      setAddMovementLoading(false)
      return
    }

    try {
      if (addMovementType === 'recurrent') {
        console.log('=== ADDING RECURRENT EXPENSE ===', operationId)
        console.log('Value to insert:', addMovementFormData.value)
        
        // Handle recurrent expense
        const { data: recurrentExpense, error: recurrentError } = await supabase
          .from('recurrent_expenses')
          .insert({
            user_id: user.id,
            description: addMovementFormData.description,
            value: addMovementFormData.value,
            month_from: selectedMonth,
            month_to: 12, // Default to end of year
            year_from: selectedYear,
            year_to: selectedYear,
            payment_day_deadline: addMovementFormData.payment_day_deadline
          })
          .select()
          .single()

        if (recurrentError) {
          console.error('Recurrent expense error:', recurrentError)
          throw recurrentError
        }

        console.log('Recurrent expense created:', recurrentExpense)

        // Generate transactions for the current month
        const deadline = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${addMovementFormData.payment_day_deadline.padStart(2, '0')}`
        
        console.log('Creating transaction with deadline:', deadline)
        console.log('Transaction value:', addMovementFormData.value)
        
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            recurrent_expense_id: recurrentExpense.id,
            description: addMovementFormData.description,
            value: addMovementFormData.value,
            month: selectedMonth,
            year: selectedYear,
            deadline: deadline,
            status: 'pending'
          })

        if (transactionError) {
          console.error('Transaction error:', transactionError)
          throw transactionError
        }

        console.log('Recurrent transaction created successfully')

      } else {
        console.log('=== ADDING NON-RECURRENT EXPENSE ===', operationId)
        console.log('Value to insert:', addMovementFormData.value)
        
        // Handle non-recurrent expense
        const deadline = addMovementFormData.payment_deadline ? 
          new Date(addMovementFormData.payment_deadline).toISOString().split('T')[0] : null

        console.log('Creating non-recurrent expense record...')

        // First, create the non-recurrent expense record
        const { data: nonRecurrentExpense, error: nonRecurrentError } = await supabase
          .from('non_recurrent_expenses')
          .insert({
            user_id: user.id,
            description: addMovementFormData.description,
            year: selectedYear,
            month: selectedMonth,
            value: addMovementFormData.value,
            payment_deadline: deadline
          })
          .select()
          .single()

        if (nonRecurrentError) {
          console.error('Non-recurrent expense error:', nonRecurrentError)
          throw nonRecurrentError
        }

        console.log('Non-recurrent expense created:', nonRecurrentExpense)

        console.log('Creating non-recurrent transaction with deadline:', deadline)
        console.log('Transaction value:', addMovementFormData.value)

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            source_id: nonRecurrentExpense.id,
            source_type: 'non_recurrent',
            description: addMovementFormData.description,
            value: addMovementFormData.value,
            month: selectedMonth,
            year: selectedYear,
            deadline: deadline,
            status: 'pending'
          })

        if (transactionError) {
          console.error('Non-recurrent transaction error:', transactionError)
          throw transactionError
        }

        console.log('Non-recurrent transaction created successfully')
      }

      console.log('=== MOVEMENT ADDED SUCCESSFULLY ===', operationId)
      
      // Close modal and refresh data
      setShowAddMovementModal(false)
      setAddMovementType(null)
      setAddMovementFormData({
        description: '',
        value: 0,
        payment_deadline: '',
        payment_day_deadline: ''
      })
      
      // Don't call onDataChange here - let the parent component handle the refresh
      // This prevents duplicate refreshTrigger increments
      console.log('=== NOT calling onDataChange to avoid duplication ===', operationId)

    } catch (error) {
      console.error('=== ERROR ADDING MOVEMENT ===', operationId)
      console.error('Error details:', error)
      setAddMovementError(`Error al agregar el movimiento: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setAddMovementLoading(false)
      setIsProcessingAddMovement(false)
    }
  }

  const handleCancelAddMovement = () => {
    setShowAddMovementModal(false)
    setAddMovementType(null)
    setAddMovementFormData({
      description: '',
      value: 0,
      payment_deadline: '',
      payment_day_deadline: ''
    })
    setAddMovementError(null)
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{texts.thisMonth}</h1>
        <p className="text-gray-600 mt-2">{texts.dashboard}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{texts.errorOccurred}</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month/Year Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{texts.date}</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{texts.date}</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {months.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-8">
        <div className="bg-white p-3 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-4 w-4 lg:h-6 lg:w-6 text-blue-600" />
            </div>
            <div className="ml-2 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total del mes</p>
              <p className="text-base lg:text-2xl font-bold text-gray-900">{formatCurrency(monthlyStats.total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-1.5 lg:p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-4 w-4 lg:h-6 lg:w-6 text-green-600" />
            </div>
            <div className="ml-2 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{texts.paid}</p>
              <p className="text-base lg:text-2xl font-bold text-gray-900">{formatCurrency(monthlyStats.paid)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-1.5 lg:p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="h-4 w-4 lg:h-6 lg:w-6 text-yellow-600" />
            </div>
            <div className="ml-2 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{texts.pending}</p>
              <p className="text-base lg:text-2xl font-bold text-gray-900">{formatCurrency(monthlyStats.pending)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 lg:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-1.5 lg:p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-4 w-4 lg:h-6 lg:w-6 text-red-600" />
            </div>
            <div className="ml-2 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{texts.overdue}</p>
              <p className="text-base lg:text-2xl font-bold text-gray-900">{formatCurrency(monthlyStats.overdue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{texts.filterByType}</h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="all"
                checked={filterType === 'all'}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'recurrent' | 'non_recurrent')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700 cursor-pointer">{texts.allTypes}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="recurrent"
                checked={filterType === 'recurrent'}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'recurrent' | 'non_recurrent')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700 cursor-pointer">{texts.recurrentOnly}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="non_recurrent"
                checked={filterType === 'non_recurrent'}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'recurrent' | 'non_recurrent')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700 cursor-pointer">{texts.nonRecurrentOnly}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {texts.forMonth} {months[selectedMonth - 1]} {selectedYear}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">{texts.loading}</div>
        ) : finalSortedTransactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">{texts.empty.noTransactions}</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{texts.description}</span>
                        {sortField === 'description' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('deadline')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{texts.daysRemaining}</span>
                        {sortField === 'deadline' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{texts.status}</span>
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('value')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{texts.amount}</span>
                        {sortField === 'value' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.paid}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {finalSortedTransactions.map((transaction) => {
                    // Calculate days remaining
                    const getDaysRemaining = () => {
                      if (transaction.status === 'paid') return 0;
                      if (!transaction.deadline) return null;
                      
                      // Parse the date string the same way as displayed dates
                      const [year, month, day] = transaction.deadline.split('-').map(Number);
                      
                      // Create today's date in the same format
                      const today = new Date();
                      const todayYear = today.getFullYear();
                      const todayMonth = today.getMonth() + 1; // getMonth() returns 0-11
                      const todayDay = today.getDate();
                      
                      // Calculate days difference
                      const todayDate = new Date(todayYear, todayMonth - 1, todayDay); // month is 0-indexed
                      const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
                      
                      const diffTime = deadlineDate.getTime() - todayDate.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      return diffDays;
                    };
                    
                    const daysRemaining = getDaysRemaining();
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {transaction.source_type === 'recurrent' ? (
                                <Repeat className="h-4 w-4 text-blue-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                              <div className="flex items-center space-x-2 mt-1">
                                {transaction.deadline && (
                                  <span className="text-xs text-gray-500">
                                    {texts.due}: {(() => {
                                      // Parse the date string directly to avoid timezone issues
                                      const [year, month, day] = transaction.deadline.split('-').map(Number);
                                      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                                    })()}
                                  </span>
                                )}
                                {transaction.source_type === 'recurrent' && (
                                  (() => {
                                    const recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)
                                    if (recurrentExpense) {
                                      return (
                                        <>
                                          {transaction.deadline && <span className="text-xs text-gray-400">•</span>}
                                          <span className="text-xs text-gray-500">
                                            {texts.payingFrom} {monthAbbreviations[recurrentExpense.month_from - 1]} {recurrentExpense.year_from} {texts.to} {monthAbbreviations[recurrentExpense.month_to - 1]} {recurrentExpense.year_to}
                                          </span>
                                        </>
                                      )
                                    }
                                    return null
                                  })()
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {daysRemaining !== null ? (
                            <span className={`text-sm font-medium ${
                              daysRemaining === 0 ? 'text-gray-500' :
                              daysRemaining < 0 ? 'text-black' :
                              daysRemaining <= 7 ? 'text-black' :
                              'text-black'
                            }`}>
                              {transaction.status === 'paid' ? '-' :
                               daysRemaining === 0 ? '0' :
                               daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` :
                               daysRemaining}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(transaction))}>
                            {getStatusText(transaction)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={transaction.status === 'paid'}
                            onChange={(e) => {
                              console.log(`🔘 Desktop: Checkbox clicked for transaction ${transaction.id}, checked: ${e.target.checked}`)
                              handleCheckboxChange(transaction.id, e.target.checked)
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAttachmentList(transaction)}
                              className="text-gray-600 hover:text-gray-800 relative flex items-center justify-center"
                              title="View attachments"
                            >
                              <Paperclip className="h-4 w-4" />
                              {attachmentCounts[transaction.id] > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                                  {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => handleAttachmentUpload(transaction)}
                              className="text-green-600 hover:text-green-800"
                              title="Upload attachment"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleModifyTransaction(transaction.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modify transaction"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {finalSortedTransactions.map((transaction) => {
                // Calculate days remaining
                const getDaysRemaining = () => {
                  if (transaction.status === 'paid') return 0;
                  if (!transaction.deadline) return null;
                  
                  // Parse the date string the same way as displayed dates
                  const [year, month, day] = transaction.deadline.split('-').map(Number);
                  
                  // Create today's date in the same format
                  const today = new Date();
                  const todayYear = today.getFullYear();
                  const todayMonth = today.getMonth() + 1; // getMonth() returns 0-11
                  const todayDay = today.getDate();
                  
                  // Calculate days difference
                  const todayDate = new Date(todayYear, todayMonth - 1, todayDay); // month is 0-indexed
                  const deadlineDate = new Date(year, month - 1, day); // month is 0-indexed
                  
                  const diffTime = deadlineDate.getTime() - todayDate.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  return diffDays;
                };
                
                const daysRemaining = getDaysRemaining();
                
                return (
                  <div key={transaction.id} className="bg-white rounded-lg shadow-sm border p-4 mobile-card">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {transaction.source_type === 'recurrent' ? (
                          <Repeat className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{transaction.description}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {transaction.deadline && (
                              <span className="text-xs text-gray-500">
                                {texts.due}: {(() => {
                                  const [year, month, day] = transaction.deadline.split('-').map(Number);
                                  return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(transaction.value)}</div>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(transaction))}>
                          {getStatusText(transaction)}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-xs text-gray-500">Days Remaining:</span>
                        <div className="text-sm font-medium text-gray-900">
                          {daysRemaining !== null ? (
                            transaction.status === 'paid' ? '-' :
                            daysRemaining === 0 ? '0' :
                            daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` :
                            daysRemaining
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Type:</span>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {transaction.source_type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={transaction.status === 'paid'}
                          onChange={(e) => {
                            console.log(`🔘 Mobile: Checkbox clicked for transaction ${transaction.id}, checked: ${e.target.checked}`)
                            handleCheckboxChange(transaction.id, e.target.checked)
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-600 ml-1">Mark as paid</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAttachmentList(transaction)}
                          className="text-gray-600 hover:text-gray-800 relative flex items-center justify-center"
                          title="View attachments"
                        >
                          <Paperclip className="h-4 w-4" />
                          {attachmentCounts[transaction.id] > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                              {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleAttachmentUpload(transaction)}
                          className="text-green-600 hover:text-green-800"
                          title="Upload attachment"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleModifyTransaction(transaction.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modify transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Add Movement Button */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleAddMovement}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Movimiento
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Description:</span> {deleteModalData.transaction.description}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Value:</span> {formatCurrency(deleteModalData.transaction.value)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {deleteModalData.transaction.deadline ? (() => {
                    // Parse the date string directly to avoid timezone issues
                    const [year, month, day] = deleteModalData.transaction.deadline!.split('-').map(Number);
                    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                  })() : `${months[deleteModalData.transaction.month - 1]} ${deleteModalData.transaction.year}`}
                </p>
              </div>

              {deleteModalData.isRecurrent ? (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium mb-2">This is a recurrent expense transaction.</p>
                  <p className="text-sm text-blue-700">Choose what you want to delete:</p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">Are you sure you want to delete this transaction?</p>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              {deleteModalData.isRecurrent ? (
                <>
                  <button
                    onClick={() => handleConfirmDelete(true)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete Entire Series (All Related Transactions)
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(false)}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Delete Only This Transaction
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmDelete(false)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete Transaction
                </button>
              )}
              
              <button
                onClick={handleCancelDelete}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Confirmation Modal */}
      {showModifyModal && modifyModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Edit className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Modify Transaction</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Description:</span> {modifyModalData.transaction.description}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Value:</span> {formatCurrency(modifyModalData.transaction.value)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {modifyModalData.transaction.deadline ? (() => {
                    // Parse the date string directly to avoid timezone issues
                    const [year, month, day] = modifyModalData.transaction.deadline!.split('-').map(Number);
                    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
                  })() : `${months[modifyModalData.transaction.month - 1]} ${modifyModalData.transaction.year}`}
                </p>
              </div>

              {modifyModalData.isRecurrent ? (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium mb-2">This is a recurrent expense transaction.</p>
                  <p className="text-sm text-blue-700">Choose what you want to modify:</p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">Are you sure you want to modify this transaction?</p>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              {modifyModalData.isRecurrent ? (
                <>
                  <button
                    onClick={() => handleConfirmModify(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Modify Entire Series (All Related Transactions)
                  </button>
                  <button
                    onClick={() => handleConfirmModify(false)}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Modify Only This Transaction
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmModify(false)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Modify Transaction
                </button>
              )}
              
              <button
                onClick={handleCancelModify}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Movement Modal */}
      {showAddMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold">Agregar Movimiento</h2>
              <button
                onClick={handleCancelAddMovement}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {!addMovementType ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Selecciona el tipo de movimiento que quieres agregar:</p>
                
                <button
                  onClick={() => setAddMovementType('recurrent')}
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <Repeat className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Recurrente</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Gastos que se repiten mensualmente (arriendo, servicios, suscripciones)</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAddMovementType('non_recurrent')}
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">No Recurrente</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Gastos únicos (reparaciones, médicos, compras especiales)</p>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddMovementSubmit} className="space-y-4">
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setAddMovementType(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ← Volver a selección de tipo
                  </button>
                </div>

                {addMovementError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {addMovementError}
                  </div>
                )}

                {addMovementType === 'recurrent' ? (
                  // Recurrent Expense Form
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={addMovementFormData.description}
                        onChange={(e) => setAddMovementFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor ($)</label>
                        <input
                          type="text"
                          value={getCurrencyInputValue(addMovementFormData.value)}
                          onChange={(e) => {
                            let rawValue = e.target.value.replace(/[^0-9]/g, '')
                            if (rawValue.length > 8) rawValue = rawValue.slice(0, 8)
                            const numericValue = rawValue ? parseInt(rawValue, 10) : 0
                            setAddMovementFormData(prev => ({ 
                              ...prev, 
                              value: numericValue
                            }))
                          }}
                          placeholder="$1,200.00"
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Día de Pago (1-31)</label>
                        <input
                          type="text"
                          value={addMovementFormData.payment_day_deadline}
                          onChange={(e) => setAddMovementFormData(prev => ({ ...prev, payment_day_deadline: e.target.value }))}
                          placeholder="15"
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Nota:</strong> Este gasto recurrente se creará para {months[selectedMonth - 1]} {selectedYear} y se extenderá hasta diciembre {selectedYear}.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Non-Recurrent Expense Form
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={addMovementFormData.description}
                        onChange={(e) => setAddMovementFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor ($)</label>
                        <input
                          type="text"
                          value={getCurrencyInputValue(addMovementFormData.value)}
                          onChange={(e) => {
                            let rawValue = e.target.value.replace(/[^0-9]/g, '')
                            if (rawValue.length > 8) rawValue = rawValue.slice(0, 8)
                            const numericValue = rawValue ? parseInt(rawValue, 10) : 0
                            setAddMovementFormData(prev => ({ 
                              ...prev, 
                              value: numericValue
                            }))
                          }}
                          placeholder="$500.00"
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          value={addMovementFormData.payment_deadline}
                          onChange={(e) => setAddMovementFormData(prev => ({ ...prev, payment_deadline: e.target.value }))}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>Nota:</strong> Este gasto se agregará para {months[selectedMonth - 1]} {selectedYear}.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelAddMovement}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addMovementLoading || isProcessingAddMovement}
                    onClick={() => {
                      console.log('=== SUBMIT BUTTON CLICKED ===')
                      console.log('addMovementLoading:', addMovementLoading)
                      console.log('isProcessingAddMovement:', isProcessingAddMovement)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addMovementLoading || isProcessingAddMovement ? 'Agregando...' : 'Agregar Movimiento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showAttachmentModal && selectedTransactionForAttachment && (
        <FileUploadModal
          isOpen={showAttachmentModal}
          onClose={() => {
            setShowAttachmentModal(false)
            setSelectedTransactionForAttachment(null)
          }}
          transactionId={selectedTransactionForAttachment.id}
          userId={user.id}
          onUploadComplete={handleAttachmentUploadComplete}
        />
      )}

      {/* Attachments List Modal */}
      {showAttachmentsList && selectedTransactionForList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Attachments for: {selectedTransactionForList.description}
              </h2>
              <button
                onClick={() => {
                  setShowAttachmentsList(false)
                  setSelectedTransactionForList(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <TransactionAttachments
              transactionId={selectedTransactionForList.id}
              userId={user.id}
              onAttachmentDeleted={handleAttachmentDeleted}
            />
          </div>
        </div>
      )}
    </div>
  )
} 