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
  containerSize?: string // New optional prop for container size
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
  showBackground = true,
  containerSize
}: TransactionIconProps) {
  const iconType = getTransactionIconType(transaction, recurrentGoalMap)
  const iconColor = getTransactionIconColor(transaction, iconType)
  const iconBackground = getTransactionIconBackground(transaction, iconType)
  const iconShadow = getTransactionIconShadow(transaction, iconType)
  
  // Calculate container size based on icon size if not explicitly provided
  const getContainerSize = () => {
    if (containerSize) return containerSize
    
    // Map icon sizes to appropriate container sizes
    if (size.includes('w-4 h-4')) return 'w-6 h-6'
    if (size.includes('w-5 h-5')) return 'w-9 h-9'
    if (size.includes('w-6 h-6')) return 'w-11 h-11'
    
    // Default fallback
    return 'w-9 h-9'
  }
  
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
      <div className={`${getContainerSize()} rounded-full flex items-center justify-center ${iconBackground} ${iconShadow}`}>
        {iconElement()}
      </div>
    )
  }
  
  return iconElement()
} 