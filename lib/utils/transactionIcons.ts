import { Transaction } from '@/lib/supabase'

/**
 * Determines which icon should be displayed for a transaction based on its properties
 * @param transaction - The transaction object
 * @param recurrentGoalMap - Map of recurrent expense IDs that are goals
 * @returns The icon type string to be used with renderCustomIcon or icon components
 */
export function getTransactionIconType(
  transaction: Transaction, 
  recurrentGoalMap: Record<number, boolean>
): 'SAVINGS_PIG' | 'GOAL_TARGET' | 'TICKET_TAG' | 'REPEAT' {
  // SAVINGS: Expenses with category "Ahorro"
  if (transaction.type === 'expense' && transaction.category === 'Ahorro') {
    return 'SAVINGS_PIG'
  }
  
  // GOALS: Recurrent expenses that are marked as goals
  if (transaction.source_type === 'recurrent' && 
      transaction.type === 'expense' && 
      recurrentGoalMap[transaction.source_id]) {
    return 'GOAL_TARGET'
  }
  
  // SINGLE MOVEMENTS: Non-recurrent transactions (both expense and income)
  if (transaction.source_type === 'non_recurrent') {
    return 'TICKET_TAG'
  }
  
  // RECURRENT: All other recurrent transactions
  return 'REPEAT'
}

/**
 * Gets the appropriate CSS color class for a transaction icon
 * @param transaction - The transaction object
 * @param iconType - The icon type returned by getTransactionIconType
 * @returns CSS class string for the icon color
 */
export function getTransactionIconColor(
  transaction: Transaction, 
  iconType: string
): string {
  switch (iconType) {
    case 'SAVINGS_PIG':
      return 'text-green-600'
    case 'GOAL_TARGET':
      return 'text-yellow-700' // Same as expense icons
    case 'TICKET_TAG':
      // Use transaction type color for single movements
      return transaction.type === 'expense' ? 'text-yellow-700' : 'text-blue-600'
    case 'REPEAT':
      // Use transaction type color for recurrent movements
      return transaction.type === 'expense' ? 'text-yellow-700' : 'text-blue-600'
    default:
      return 'text-gray-600'
  }
}

/**
 * Gets the appropriate background color class for a transaction icon container
 * @param transaction - The transaction object
 * @param iconType - The icon type returned by getTransactionIconType
 * @returns CSS class string for the background color
 */
export function getTransactionIconBackground(
  transaction: Transaction, 
  iconType: string
): string {
  switch (iconType) {
    case 'SAVINGS_PIG':
      return 'bg-green-100'
    case 'GOAL_TARGET':
      return 'bg-yellow-100' // Same as expense background
    case 'TICKET_TAG':
      // Use transaction type background for single movements
      return transaction.type === 'expense' ? 'bg-yellow-100' : 'bg-blue-100'
    case 'REPEAT':
      // Use transaction type background for recurrent movements
      return transaction.type === 'expense' ? 'bg-yellow-100' : 'bg-blue-100'
    default:
      return 'bg-gray-100'
  }
} 