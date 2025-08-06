import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// Define all possible routes in the application
export type AppRoute = 
  | { type: 'home' }
  | { type: 'como-vamos' }
  | { type: 'dashboard'; month: number; year: number }
  | { type: 'general-dashboard'; year: number }
  | { type: 'debug' }
  | { type: 'mis-metas'; year?: number }
  | { type: 'categories'; year?: number; month?: number }
  | { type: 'mis-ahorros' }

// Navigation configuration for each route
export const ROUTE_CONFIG = {
  home: {
    path: '/',
    params: {}
  },
  'como-vamos': {
    path: '/',
    params: ['view']
  },
  dashboard: {
    path: '/',
    params: ['view', 'month', 'year']
  },
  'general-dashboard': {
    path: '/',
    params: ['year']
  },
  debug: {
    path: '/',
    params: ['view']
  },
  'mis-metas': {
    path: '/',
    params: ['view', 'year']
  },
  'categories': {
    path: '/',
    params: ['view', 'year', 'month']
  },
  'mis-ahorros': {
    path: '/',
    params: ['view']
  }
} as const

// Navigation service class following SOLID principles
export class NavigationService {
  private router: AppRouterInstance

  constructor(router: AppRouterInstance) {
    this.router = router
  }

  /**
   * Navigate to a specific route with proper URL construction
   * @param route - The route to navigate to
   * @param options - Navigation options
   */
  async navigate(route: AppRoute, options: { 
    replace?: boolean; 
    scroll?: boolean;
  } = {}): Promise<void> {
    const { replace = false, scroll = false } = options
    
    try {
      const url = this.buildUrl(route)
      
      if (replace) {
        await this.router.replace(url, { scroll })
      } else {
        await this.router.push(url, { scroll })
      }
    } catch (error) {
      console.error('❌ Navigation error:', error)
      throw new Error(`Failed to navigate to ${route.type}`)
    }
  }

  /**
   * Build URL from route object
   * @param route - The route to build URL for
   * @returns The constructed URL
   */
  private buildUrl(route: AppRoute): string {
    const params = new URLSearchParams()
    
    switch (route.type) {
      case 'home':
        return '/'
        
      case 'como-vamos':
        params.set('view', 'como-vamos')
        return `/?${params.toString()}`
        
      case 'dashboard':
        params.set('view', 'dashboard')
        params.set('month', route.month.toString())
        params.set('year', route.year.toString())
        return `/?${params.toString()}`
        
      case 'general-dashboard':
        params.set('year', route.year.toString())
        return `/?${params.toString()}`
        
      case 'debug':
        params.set('view', 'debug')
        return `/?${params.toString()}`
      
      case 'mis-metas':
        params.set('view', 'mis-metas')
        if (route.year) {
          params.set('year', route.year.toString())
        }
        return `/?${params.toString()}`
      
      case 'categories':
        params.set('view', 'categories')
        if (route.year) {
          params.set('year', route.year.toString())
        }
        if (route.month) {
          params.set('month', route.month.toString())
        }
        return `/?${params.toString()}`
      
      case 'mis-ahorros':
        params.set('view', 'mis-ahorros')
        return `/?${params.toString()}`
      
      default:
        throw new Error(`Unknown route type: ${(route as any).type}`)
    }
  }

  /**
   * Parse current URL and return route object
   * @param searchParams - URL search parameters
   * @returns Parsed route object
   */
  parseRoute(searchParams: URLSearchParams): AppRoute {
    const view = searchParams.get('view')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Default to home if no parameters
    if (!view && !month && !year) {
      return { type: 'home' }
    }

    // Parse dashboard route - must have view=dashboard AND month AND year
    if (view === 'dashboard' && month && year) {
      return {
        type: 'dashboard',
        month: parseInt(month),
        year: parseInt(year)
      }
    }

    // Parse debug route
    if (view === 'debug') {
      return { type: 'debug' }
    }

    // Parse como-vamos route
    if (view === 'como-vamos') {
      return { type: 'como-vamos' }
    }

    // Parse mis-metas route
    if (view === 'mis-metas') {
      return {
        type: 'mis-metas',
        year: year ? parseInt(year) : undefined
      }
    }

    // Parse general-dashboard route - only year parameter, no view or month
    if (!view && !month && year) {
      return {
        type: 'general-dashboard',
        year: parseInt(year)
      }
    }

    // If we have month and year but no view, treat as dashboard
    if (month && year && !view) {
      return {
        type: 'dashboard',
        month: parseInt(month),
        year: parseInt(year)
      }
    }

    // Parse categories route
    if (view === 'categories') {
      return {
        type: 'categories',
        year: year ? parseInt(year) : undefined,
        month: month ? parseInt(month) : undefined
      }
    }

    // Parse mis-ahorros route
    if (view === 'mis-ahorros') {
      return { type: 'mis-ahorros' }
    }

    // Fallback to home
    return { type: 'home' }
  }

  /**
   * Navigate to dashboard with specific month and year
   * @param month - Month number (1-12)
   * @param year - Year number
   */
  async navigateToDashboard(month: number, year: number): Promise<void> {
    await this.navigate({ type: 'dashboard', month, year })
  }

  /**
   * Navigate to general dashboard with specific year
   * @param year - Year number
   */
  async navigateToGeneralDashboard(year: number): Promise<void> {
    console.log('🔄 NavigationService.navigateToGeneralDashboard called with year:', year)
    await this.navigate({ type: 'general-dashboard', year })
    console.log('✅ NavigationService.navigateToGeneralDashboard completed')
  }

  /**
   * Navigate to debug view
   */
  async navigateToDebug(): Promise<void> {
    await this.navigate({ type: 'debug' })
  }

  /**
   * Navigate to mis-metas view
   * @param year - Optional year parameter
   */
  async navigateToMisMetas(year?: number): Promise<void> {
    await this.navigate({ type: 'mis-metas', year })
  }

  /**
   * Navigate to categories view
   * @param year - Optional year parameter
   * @param month - Optional month parameter
   */
  async navigateToCategories(year?: number, month?: number): Promise<void> {
    await this.navigate({ type: 'categories', year, month })
  }

  /**
   * Navigate to mis-ahorros view
   */
  async navigateToMisAhorros(): Promise<void> {
    await this.navigate({ type: 'mis-ahorros' })
  }

  /**
   * Navigate to home
   */
  async navigateToHome(): Promise<void> {
    await this.navigate({ type: 'home' })
  }

  /**
   * Navigate to como-vamos view
   */
  async navigateToComoVamos(): Promise<void> {
    await this.navigate({ type: 'como-vamos' })
  }
}

// Hook for using navigation service
export function useNavigation(router: AppRouterInstance): NavigationService {
  return new NavigationService(router)
} 