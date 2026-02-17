'use client'
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { clearUserCache } from '@/lib/dataUtils'

// Data synchronization context interface
interface DataSyncContextType {
  dataVersion: number
  refreshData: (userId?: string, operation?: string) => void // UUID
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

  const refreshData = useCallback((userId?: string, operation?: string) => {
    console.log(`🔄 DataSync: Refreshing data${userId ? ` for user ${userId}` : ''}${operation ? ` after ${operation}` : ''}`)
    
    // Clear cache if userId is provided
    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      try {
        clearUserCache(userId)
        console.log(`🗑️ DataSync: Cleared cache for user ${userId}`)
      } catch (error) {
        console.error('❌ DataSync: Error clearing cache:', error)
      }
    } else if (userId) {
      console.warn('⚠️ DataSync: Invalid userId provided:', userId)
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
  effect: (isRetry?: boolean) => void | (() => void),
  dependencies: React.DependencyList = []
) => {
  const { dataVersion, lastOperation } = useDataSync()

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 useDataSyncEffect: Triggered (version: ${dataVersion}${lastOperation ? `, operation: ${lastOperation}` : ''})`)
    }
    
    // Execute the effect immediately (not a retry)
    const cleanup = effect(false)
    
    // If the last operation was create_transaction, modify_transaction, or delete_transaction, schedule a retry to ensure data is synchronized
    if (lastOperation === 'create_transaction' || lastOperation === 'modify_transaction' || lastOperation === 'delete_transaction') {
      const retryTimeout = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[zustand] Retry: re-executing effect after delay for ${lastOperation}...`)
        }
        
        // Execute the effect again indicating it's a retry
        effect(true) // Pass true for isRetry
      }, 400)
      
      // Return cleanup function that clears both the original cleanup and the retry timeout
      return () => {
        if (cleanup && typeof cleanup === 'function') {
          cleanup()
        }
        clearTimeout(retryTimeout)
      }
    }
    
    // Return original cleanup if no retry is needed
    return cleanup
  }, [dataVersion, lastOperation, ...dependencies])
} 