'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText, Repeat, CheckCircle, AlertCircle, X, Paperclip } from 'lucide-react'
import { supabase, type Transaction, type RecurrentExpense, type NonRecurrentExpense, type User, type TransactionAttachment } from '@/lib/supabase'
import { fetchUserTransactions, fetchUserExpenses, fetchMonthlyStats, fetchAttachmentCounts, measureQueryPerformance, clearUserCache } from '@/lib/dataUtils'
import { cn } from '@/lib/utils'
import FileUploadModal from './FileUploadModal'
import TransactionAttachments from './TransactionAttachments'

type ExpenseType = 'recurrent' | 'non_recurrent' | null

interface DashboardViewProps {
  navigationParams?: { month?: number; year?: number } | null
  user: User
}

export default function DashboardView({ navigationParams, user }: DashboardViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurrentExpenses, setRecurrentExpenses] = useState<RecurrentExpense[]>([])
  const [nonRecurrentExpenses, setNonRecurrentExpenses] = useState<NonRecurrentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(navigationParams?.year || new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(navigationParams?.month || new Date().getMonth() + 1)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'recurrent' | 'non_recurrent'>('all')
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  
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
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const monthAbbreviations = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  // Available years for selection - easy to extend in the future
  const availableYears = [2025]

  // Helper function to format currency for display (rounded, no decimals)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
    return numValue.toLocaleString('en-US', {
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

  useEffect(() => {
    fetchData()
  }, [])

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
      console.error('Error fetching data:', error)
      setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Filter transactions for selected month/year
  const filteredTransactions = transactions.filter(transaction => 
    transaction.year === selectedYear && transaction.month === selectedMonth
  )

  // Apply type filter
  const typeFilteredTransactions = filteredTransactions.filter(transaction => {
    if (filterType === 'all') return true
    return transaction.source_type === filterType
  })

  // Sort transactions by deadline (closest first) and then by status (pending first)
  const sortedTransactions = [...typeFilteredTransactions].sort((a, b) => {
    // First, sort by status (pending first)
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1
    }
    
    // Then sort by deadline (closest first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    
    // If one has deadline and other doesn't, prioritize the one with deadline
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    
    // If neither has deadline, sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Calculate statistics for selected month
  const monthlyStats = {
    total: sortedTransactions.reduce((sum, transaction) => sum + transaction.value, 0),
    paid: sortedTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.value, 0),
    pending: sortedTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.value, 0),
    overdue: sortedTransactions.filter(t => {
      if (t.status === 'paid' || !t.deadline) return false
      return new Date(t.deadline) < new Date()
    }).reduce((sum, t) => sum + t.value, 0)
  }

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
      console.log(`Updating transaction ${transactionId} checkbox to: ${isChecked}`)
      
      // Determine the new status based on checkbox and due date
      const transaction = transactions.find(t => t.id === transactionId)
      if (!transaction) return

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
      
      const { data, error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Supabase error (status update):', error)
        setError(`Error updating status: ${error.message}`)
        throw error
      }

      console.log('Status update successful:', data)

      // Refresh data to ensure UI is in sync with database
      await fetchData()
      
    } catch (error) {
      console.error('Error updating status:', error)
      setError(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      if (transaction.source_type === 'recurrent' && deleteSeries) {
        // Delete the entire recurrent series
        const { error } = await supabase
          .from('recurrent_expenses')
          .delete()
          .eq('id', transaction.source_id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Delete only this transaction
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId)
          .eq('user_id', user.id)

        if (error) throw error
      }

      await fetchData()
    } catch (error) {
      console.error('Error deleting:', error)
      setError(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      setError(`Failed to set up modify form: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
            console.error('Error updating recurrent expense:', error)
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

          if (error) throw error
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

          if (error) throw error
        }
      }

      // Refresh data
      await fetchData()
      
      // Reset form and close dialogs
      resetModifyForm()
      setShowModifyConfirmation(false)
      setModifyConfirmationData(null)
      
    } catch (error) {
      console.error('Error modifying expense:', error)
      setError(`Failed to modify expense: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    // Refresh attachment counts by refetching data
    fetchData()
    console.log('Attachment deleted:', attachmentId)
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
    if (transaction.status === 'paid') return 'Paid'
    if (transaction.deadline && new Date(transaction.deadline) < new Date()) return 'Overdue'
    return 'Pending'
  }

  const getStatusColor = (transaction: Transaction) => {
    if (transaction.status === 'paid') return 'bg-green-100 text-green-800'
    if (transaction.deadline && new Date(transaction.deadline) < new Date()) return 'bg-red-100 text-red-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">This Month</h1>
        <p className="text-gray-600 mt-2">Monthly overview of your expenses</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Database Error</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
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
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total</p>
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
              <p className="text-xs lg:text-sm font-medium text-gray-600">Paid</p>
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
              <p className="text-xs lg:text-sm font-medium text-gray-600">Pending</p>
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
              <p className="text-xs lg:text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-base lg:text-2xl font-bold text-gray-900">{formatCurrency(monthlyStats.overdue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Type</h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="all"
                checked={filterType === 'all'}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'recurrent' | 'non_recurrent')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700 cursor-pointer">All Expenses</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="recurrent"
                checked={filterType === 'recurrent'}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'recurrent' | 'non_recurrent')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700 cursor-pointer">Recurrent Only</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="non_recurrent"
                checked={filterType === 'non_recurrent'}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'recurrent' | 'non_recurrent')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700 cursor-pointer">Non-Recurrent Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Transactions for {months[selectedMonth - 1]} {selectedYear}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : sortedTransactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No transactions for this month</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTransactions.map((transaction) => {
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
                                    Due: {(() => {
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
                                            Paying from {monthAbbreviations[recurrentExpense.month_from - 1]} {recurrentExpense.year_from} to {monthAbbreviations[recurrentExpense.month_to - 1]} {recurrentExpense.year_to}
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
                              {daysRemaining === 0 ? '0' :
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
                            onChange={(e) => handleCheckboxChange(transaction.id, e.target.checked)}
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
              {sortedTransactions.map((transaction) => {
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
                                Due: {(() => {
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
                          onChange={(e) => handleCheckboxChange(transaction.id, e.target.checked)}
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

      {/* Modify Form Modal */}
      {showModifyForm && modifyFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {modifyFormData.modifySeries 
                  ? `Modify ${modifyFormData.type === 'recurrent' ? 'Recurrent' : 'Non-Recurrent'} Series`
                  : 'Modify Transaction'
                }
              </h2>
              <button
                onClick={resetModifyForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleModifyFormSubmit} className="space-y-4">
              {modifyFormData.modifySeries ? (
                // Full form for series modification
                modifyFormData.type === 'recurrent' ? (
                  // Recurrent Expense Form
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={modifyFormData.description}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Month</label>
                        <select
                          value={modifyFormData.month_from}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month_from: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Month</label>
                        <select
                          value={modifyFormData.month_to}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month_to: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Year</label>
                        <select
                          value={modifyFormData.year_from}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year_from: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Year</label>
                        <select
                          value={modifyFormData.year_to}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year_to: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                        <input
                          type="text"
                          value={getCurrencyInputValue(modifyFormData.value)}
                          onChange={(e) => setModifyFormData(prev => prev ? { 
                            ...prev, 
                            value: parseCurrency(e.target.value)
                          } : null)}
                          placeholder="$1,200.00"
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Day (1-31)</label>
                        <input
                          type="text"
                          value={modifyFormData.payment_day_deadline}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_day_deadline: e.target.value } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Non-Recurrent Expense Form
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={modifyFormData.description}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select
                          value={modifyFormData.month}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, month: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select
                          value={modifyFormData.year}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, year: Number(e.target.value) } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {availableYears.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                        <input
                          type="text"
                          value={getCurrencyInputValue(modifyFormData.value)}
                          onChange={(e) => setModifyFormData(prev => prev ? { 
                            ...prev, 
                            value: parseCurrency(e.target.value)
                          } : null)}
                          placeholder="$500.00"
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Deadline</label>
                        <input
                          type="date"
                          value={modifyFormData.payment_deadline}
                          onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                          className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Simple form for individual transaction modification
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={modifyFormData.description}
                      onChange={(e) => setModifyFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                      <input
                        type="text"
                        value={getCurrencyInputValue(modifyFormData.value)}
                        onChange={(e) => setModifyFormData(prev => prev ? { 
                          ...prev, 
                          value: parseCurrency(e.target.value)
                        } : null)}
                        placeholder="$500.00"
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Deadline</label>
                      <input
                        type="date"
                        value={modifyFormData.payment_deadline}
                        onChange={(e) => setModifyFormData(prev => prev ? { ...prev, payment_deadline: e.target.value } : null)}
                        className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetModifyForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modify Confirmation Modal */}
      {showModifyConfirmation && modifyConfirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Confirm Modification</h3>
            
            <div className="space-y-3 mb-6">
              <div>
                <span className="font-medium">Action:</span> {modifyConfirmationData.action}
              </div>
              <div>
                <span className="font-medium">Type:</span> {modifyConfirmationData.type === 'recurrent' ? 'Recurrent' : 'Non-Recurrent'}
              </div>
              <div>
                <span className="font-medium">Description:</span> {modifyConfirmationData.description}
              </div>
              <div>
                <span className="font-medium">Value:</span> {formatCurrency(modifyConfirmationData.value)}
              </div>
              <div>
                <span className="font-medium">Period:</span> {modifyConfirmationData.period}
              </div>
              <div className="bg-yellow-50 p-3 rounded-md">
                <span className="font-medium text-yellow-800">
                  Are you sure you want to {modifyConfirmationData.action}?
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModifyConfirmation(false)
                  setModifyConfirmationData(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmModifySubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
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