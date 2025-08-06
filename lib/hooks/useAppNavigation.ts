import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { NavigationService, type AppRoute } from '@/lib/navigation'

// Global cache to prevent duplicate parsing logs from multiple hook instances for same URL
const parsedUrlCache = new Map<string, boolean>()

// State interface for navigation
interface NavigationState {
  currentRoute: AppRoute
  isLoading: boolean
  error: string | null
}

// Hook for managing application navigation state
export function useAppNavigation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Use ref to track previous route type to prevent unnecessary logs
  const prevRouteTypeRef = useRef<string>('home')
  
  // Create a key that changes when URL changes to force re-renders
  const urlKey = useMemo(() => {
    return `${pathname}?${searchParams.toString()}`
  }, [pathname, searchParams])
  
  // Initialize navigation service
  const navigationService = useMemo(() => new NavigationService(router), [router])
  
  // Navigation state
  const [state, setState] = useState<NavigationState>({
    currentRoute: { type: 'home' },
    isLoading: false,
    error: null
  })

  // Parse current route from URL - this will re-run when urlKey changes
  const currentRoute = useMemo(() => {
    const route = navigationService.parseRoute(searchParams)
    
    // Only log from one instance to prevent duplicate logs
    if (process.env.NODE_ENV === 'development' && !parsedUrlCache.get(urlKey)) {
      console.log('🔄 useAppNavigation: Parsing route from URL:', urlKey)
      console.log('🔄 useAppNavigation: Parsed route:', route)
      parsedUrlCache.set(urlKey, true)
      
      // Reset flag after a short delay to allow fresh logs on real navigation changes
      setTimeout(() => {
        parsedUrlCache.delete(urlKey)
      }, 100)
    }
    
    return route
  }, [navigationService, searchParams, urlKey])

  // Update state when route changes
  useEffect(() => {
    // Only log if route type actually changed to prevent noise
    const currentRouteType = currentRoute.type
    const prevRouteType = prevRouteTypeRef.current
    
    if (process.env.NODE_ENV === 'development' && prevRouteType !== currentRouteType) {
      console.log(`🔄 useAppNavigation: Route changed from ${prevRouteType} to ${currentRouteType}`)
    }
    
    // Update the ref with current route type
    prevRouteTypeRef.current = currentRouteType
    
    setState(prev => ({
      ...prev,
      currentRoute,
      error: null
    }))
  }, [currentRoute])

  // Navigation functions
  const navigateToDashboard = useCallback(async (month: number, year: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToDashboard(month, year)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  const navigateToGeneralDashboard = useCallback(async (year: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToGeneralDashboard(year)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  const navigateToDebug = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToDebug()
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  const navigateToMisMetas = useCallback(async (year?: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToMisMetas(year)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  const navigateToCategories = useCallback(async (year?: number, month?: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToCategories(year, month)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  const navigateToHome = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToHome()
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  const navigateToComoVamos = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToComoVamos()
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  const navigateToMisAhorros = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigateToMisAhorros()
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  // Generic navigation function
  const navigate = useCallback(async (route: AppRoute) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await navigationService.navigate(route)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [navigationService])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    currentRoute: state.currentRoute,
    isLoading: state.isLoading,
    error: state.error,
    
    // Navigation functions
    navigateToDashboard,
    navigateToGeneralDashboard,
    navigateToDebug,
    navigateToMisMetas,
    navigateToCategories,
    navigateToHome,
    navigateToComoVamos,
    navigateToMisAhorros,
    navigate,
    
    // Utility functions
    clearError,
    
    // Service instance for advanced usage
    navigationService
  }
} 