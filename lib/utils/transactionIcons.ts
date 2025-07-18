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
): 'SAVINGS_TROPHY' | 'GOAL_TARGET' | 'TICKET_TAG' | 'REPEAT' {
  // SAVINGS: Expenses with category "Ahorro"
  if (transaction.type === 'expense' && transaction.category === 'Ahorro') {
    return 'SAVINGS_TROPHY'
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
 * Using the exact colors from the modal as the source of truth
 * @param transaction - The transaction object
 * @param iconType - The icon type returned by getTransactionIconType
 * @returns CSS class string for the icon color
 */
export function getTransactionIconColor(
  transaction: Transaction, 
  iconType: string
): string {
  switch (iconType) {
    case 'SAVINGS_TROPHY':
      return 'text-[#3d9f65]'
    case 'GOAL_TARGET':
      return 'text-[#5d7760]'
    case 'TICKET_TAG':
      // Both income and expense use the same color in the modal
      return 'text-[#5d7760]'
    case 'REPEAT':
      // Both income and expense use the same color in the modal
      return 'text-[#5d7760]'
    default:
      return 'text-[#5d7760]'
  }
}

/**
 * Gets the appropriate background color class for a transaction icon container
 * Using the exact colors from the modal as the source of truth
 * @param transaction - The transaction object
 * @param iconType - The icon type returned by getTransactionIconType
 * @returns CSS class string for the background color
 */
export function getTransactionIconBackground(
  transaction: Transaction, 
  iconType: string
): string {
  switch (iconType) {
    case 'SAVINGS_TROPHY':
      return 'bg-[#e0f6e8]'
    case 'GOAL_TARGET':
      return 'bg-[#fdf5d3]'
    case 'TICKET_TAG':
      // Income types use blue background, expense types use yellow background
      return transaction.type === 'income' ? 'bg-[#eaf3fb]' : 'bg-[#fdf5d3]'
    case 'REPEAT':
      // Income types use blue background, expense types use yellow background
      return transaction.type === 'income' ? 'bg-[#eaf3fb]' : 'bg-[#fdf5d3]'
    default:
      return transaction.type === 'income' ? 'bg-[#eaf3fb]' : 'bg-[#fdf5d3]'
  }
}

/**
 * Gets the special shadow and border effects for all transaction icons
 * Creates enhanced volume and depth effect while preserving existing colors
 * @param transaction - The transaction object
 * @param iconType - The icon type returned by getTransactionIconType
 * @returns CSS class string for the shadow and border effects
 */
export function getTransactionIconShadow(
  transaction: Transaction, 
  iconType: string
): string {
  // More pronounced "medal" effect with visible volume and depth
  const baseEffect = 'shadow-[0px_4px_12px_rgba(0,0,0,0.18),inset_0px_2px_4px_rgba(255,255,255,0.9),inset_0px_-3px_6px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.12)]'
  
  // Add extra glow for savings transactions
  if (iconType === 'SAVINGS_TROPHY') {
    return `${baseEffect} shadow-[0_0_16px_rgba(61,159,101,0.4),0px_4px_12px_rgba(0,0,0,0.18),inset_0px_2px_4px_rgba(255,255,255,0.9),inset_0px_-3px_6px_rgba(0,0,0,0.12)]`
  }
  
  return baseEffect
} 