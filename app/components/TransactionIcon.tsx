import { Transaction } from '@/lib/supabase'
import { Repeat } from 'lucide-react'
import { renderCustomIcon } from '@/lib/utils/iconRenderer'
import { 
  getTransactionIconType, 
  getTransactionIconColor, 
  getTransactionIconBackground 
} from '@/lib/utils/transactionIcons'

interface TransactionIconProps {
  transaction: Transaction
  recurrentGoalMap: Record<number, boolean>
  size?: string
  showBackground?: boolean
}

/**
 * Renders the appropriate icon for a transaction based on its type and properties
 * Centralizes all icon logic and ensures consistency across all views
 */
export default function TransactionIcon({
  transaction,
  recurrentGoalMap,
  size = "w-4 h-4",
  showBackground = true
}: TransactionIconProps) {
  const iconType = getTransactionIconType(transaction, recurrentGoalMap)
  const iconColor = getTransactionIconColor(transaction, iconType)
  const iconBackground = getTransactionIconBackground(transaction, iconType)
  
  const iconElement = () => {
    switch (iconType) {
      case 'SAVINGS_PIG':
        return renderCustomIcon('SAVINGS_PIG', `${size} ${iconColor}`)
      
      case 'GOAL_TARGET':
        return renderCustomIcon('GOAL_TARGET', `${size} ${iconColor}`)
      
      case 'TICKET_TAG':
        return renderCustomIcon('TICKET_TAG', `${size} ${iconColor}`)
      
      case 'REPEAT':
        return <Repeat className={`${size} ${iconColor}`} />
      
      default:
        return <Repeat className={`${size} text-gray-600`} />
    }
  }
  
  if (showBackground) {
    return (
      <div className={`p-1.5 rounded-full ${iconBackground}`}>
        {iconElement()}
      </div>
    )
  }
  
  return iconElement()
} 