import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { clearUserCache } from '@/lib/dataUtils'

// Data synchronization context interface
interface DataSyncContextType {
  dataVersion: number
  refreshData: (userId?: number, operation?: string) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
  lastOperation: string | null
  setLastOperation: (operation: string | null) => void
}

// Create the context with a default value
const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined)

// Provider component
interface DataSyncProviderProps {
  children: ReactNode
}

export const DataSyncProvider: React.FC<DataSyncProviderProps> = ({ children }) => {
  const [dataVersion, setDataVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [lastOperation, setLastOperation] = useState<string | null>(null)

  const refreshData = useCallback((userId?: number, operation?: string) => {
    console.log(`🔄 DataSync: Refreshing data${userId ? ` for user ${userId}` : ''}${operation ? ` after ${operation}` : ''}`)
    
    // Clear cache if userId is provided
    if (userId) {
      try {
        clearUserCache(userId)
        console.log(`🗑️ DataSync: Cleared cache for user ${userId}`)
      } catch (error) {
        console.error('❌ DataSync: Error clearing cache:', error)
      }
    }

    // Increment data version to trigger re-fetches
    setDataVersion(prev => {
      const newVersion = prev + 1
      console.log(`📈 DataSync: Incremented data version to ${newVersion}`)
      return newVersion
    })

    // Set the last operation for tracking
    if (operation) {
      setLastOperation(operation)
      console.log(`📝 DataSync: Set last operation to "${operation}"`)
    }
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const value: DataSyncContextType = {
    dataVersion,
    refreshData,
    isLoading,
    setLoading,
    lastOperation,
    setLastOperation
  }

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  )
}

// Hook to use the data sync context
export const useDataSync = () => {
  const context = useContext(DataSyncContext)
  if (context === undefined) {
    throw new Error('useDataSync must be used within a DataSyncProvider')
  }
  return context
}

// Hook for components that need to react to data changes
export const useDataSyncEffect = (
  effect: () => void | (() => void),
  dependencies: React.DependencyList = []
) => {
  const { dataVersion, lastOperation } = useDataSync()

  useEffect(() => {
    console.log(`🔄 useDataSyncEffect: Triggered by data version ${dataVersion}${lastOperation ? ` (operation: ${lastOperation})` : ''}`)
    console.log(`🔄 useDataSyncEffect: Dependencies:`, dependencies)
    console.log(`🔄 useDataSyncEffect: Executing effect...`)
    return effect()
  }, [dataVersion, lastOperation, ...dependencies])
} 