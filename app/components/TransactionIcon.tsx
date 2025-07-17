import { Transaction } from '@/lib/supabase'
import { Repeat } from 'lucide-react'
import { renderCustomIcon } from '@/lib/utils/iconRenderer'
import { 
  getTransactionIconType, 
  getTransactionIconColor, 
  getTransactionIconBackground,
  getTransactionIconShadow
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
 * Uses exact colors from the modal as the source of truth
 */
export default function TransactionIcon({
  transaction,
  recurrentGoalMap,
  size = "w-5 h-5",
  showBackground = true
}: TransactionIconProps) {
  const iconType = getTransactionIconType(transaction, recurrentGoalMap)
  const iconColor = getTransactionIconColor(transaction, iconType)
  const iconBackground = getTransactionIconBackground(transaction, iconType)
  const iconShadow = getTransactionIconShadow(transaction, iconType)
  
  const iconElement = () => {
    switch (iconType) {
      case 'SAVINGS_TROPHY':
        return renderCustomIcon('SAVINGS_TROPHY', `${size} ${iconColor}`)
      
      case 'GOAL_TARGET':
        return renderCustomIcon('GOAL_TARGET', `${size} ${iconColor}`)
      
      case 'TICKET_TAG':
        return renderCustomIcon('TICKET_TAG', `${size} ${iconColor}`)
      
      case 'REPEAT':
        return <Repeat className={`${size} ${iconColor}`} />
      
      default:
        return <Repeat className={`${size} ${iconColor}`} />
    }
  }
  
  if (showBackground) {
    return (
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBackground} ${iconShadow}`}>
        {iconElement()}
      </div>
    )
  }
  
  return iconElement()
} 