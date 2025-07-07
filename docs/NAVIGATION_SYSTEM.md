# 🧭 Sistema de Navegación - Arquitectura y Estándares

## 📋 **Resumen Ejecutivo**

Este documento describe el sistema de navegación escalable implementado en la aplicación de seguimiento de gastos, siguiendo los más altos estándares técnicos y patrones de diseño modernos.

## 🏗️ **Arquitectura del Sistema**

### **1. Patrón de Diseño: Service Layer + Custom Hook**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Components    │───▶│  useAppNavigation │───▶│ NavigationService│
│                 │    │   (Custom Hook)   │    │   (Service)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **2. Principios SOLID Aplicados**

- **Single Responsibility**: Cada clase/hook tiene una responsabilidad específica
- **Open/Closed**: Fácil extensión sin modificar código existente
- **Dependency Inversion**: Dependencias inyectadas, no hardcodeadas

## 🔧 **Componentes del Sistema**

### **1. NavigationService (`lib/navigation.ts`)**

**Responsabilidades:**
- Construcción de URLs
- Parsing de rutas
- Manejo de navegación programática

**Características:**
- ✅ Type-safe con TypeScript
- ✅ Manejo de errores robusto
- ✅ Logging para debugging
- ✅ Métodos específicos para cada ruta

```typescript
// Ejemplo de uso
const navigationService = new NavigationService(router)
await navigationService.navigateToDashboard(7, 2025)
```

### **2. useAppNavigation Hook (`lib/hooks/useAppNavigation.ts`)**

**Responsabilidades:**
- Estado de navegación
- Integración con React
- Manejo de loading states
- Error handling

**Características:**
- ✅ Estado centralizado
- ✅ Callbacks memoizados
- ✅ Loading states automáticos
- ✅ Error handling consistente

```typescript
// Ejemplo de uso
const { 
  currentRoute, 
  navigateToDashboard, 
  isLoading, 
  error 
} = useAppNavigation()
```

## 🛣️ **Sistema de Rutas**

### **Tipos de Ruta Definidos**

```typescript
type AppRoute = 
  | { type: 'home' }
  | { type: 'dashboard'; month: number; year: number }
  | { type: 'general-dashboard'; year: number }
  | { type: 'debug' }
```

### **Configuración de Rutas**

```typescript
const ROUTE_CONFIG = {
  home: { path: '/', params: {} },
  dashboard: { path: '/', params: ['view', 'month', 'year'] },
  'general-dashboard': { path: '/', params: ['year'] },
  debug: { path: '/', params: ['view'] }
}
```

## 🚀 **Cómo Agregar Nuevas Secciones**

### **Paso 1: Definir el Tipo de Ruta**

```typescript
// En lib/navigation.ts
type AppRoute = 
  | { type: 'home' }
  | { type: 'dashboard'; month: number; year: number }
  | { type: 'general-dashboard'; year: number }
  | { type: 'debug' }
  | { type: 'new-section'; param1: string; param2: number } // ← Nueva ruta
```

### **Paso 2: Agregar Configuración**

```typescript
const ROUTE_CONFIG = {
  // ... rutas existentes
  'new-section': {
    path: '/',
    params: ['view', 'param1', 'param2']
  }
}
```

### **Paso 3: Implementar en NavigationService**

```typescript
// En el método buildUrl()
case 'new-section':
  params.set('view', 'new-section')
  params.set('param1', route.param1)
  params.set('param2', route.param2.toString())
  return `/?${params.toString()}`

// En el método parseRoute()
if (view === 'new-section' && param1 && param2) {
  return {
    type: 'new-section',
    param1,
    param2: parseInt(param2)
  }
}

// Agregar método específico
async navigateToNewSection(param1: string, param2: number): Promise<void> {
  await this.navigate({ type: 'new-section', param1, param2 })
}
```

### **Paso 4: Agregar al Hook**

```typescript
// En useAppNavigation.ts
const navigateToNewSection = useCallback(async (param1: string, param2: number) => {
  setState(prev => ({ ...prev, isLoading: true, error: null }))
  
  try {
    await navigationService.navigateToNewSection(param1, param2)
  } catch (error) {
    setState(prev => ({ 
      ...prev, 
      error: error instanceof Error ? error.message : 'Navigation failed' 
    }))
  } finally {
    setState(prev => ({ ...prev, isLoading: false }))
  }
}, [navigationService])

// Agregar al return
return {
  // ... otros métodos
  navigateToNewSection,
}
```

### **Paso 5: Implementar en el Componente Principal**

```typescript
// En app/page.tsx
const renderView = () => {
  switch (navigation.currentRoute.type) {
    // ... casos existentes
    case 'new-section':
      return (
        <NewSectionView 
          param1={navigation.currentRoute.param1}
          param2={navigation.currentRoute.param2}
          user={user}
        />
      )
  }
}
```

## 📊 **Ventajas del Sistema**

### **1. Escalabilidad**
- ✅ Fácil agregar nuevas secciones
- ✅ Patrón consistente
- ✅ Configuración centralizada

### **2. Mantenibilidad**
- ✅ Código limpio y organizado
- ✅ Separación de responsabilidades
- ✅ Testing friendly

### **3. Performance**
- ✅ Memoización automática
- ✅ Re-renders optimizados
- ✅ Lazy loading ready

### **4. Developer Experience**
- ✅ Type safety completo
- ✅ IntelliSense support
- ✅ Error handling consistente

## 🔍 **Debugging y Logging**

### **Logs Automáticos**
```typescript
console.log(`🔄 Navigating to: ${url}`)
console.error('Navigation error:', error)
```

### **Estado de Navegación**
```typescript
const { currentRoute, isLoading, error } = useAppNavigation()
console.log('Current route:', currentRoute)
console.log('Loading:', isLoading)
console.log('Error:', error)
```

## 🧪 **Testing**

### **Testing del Service**
```typescript
describe('NavigationService', () => {
  it('should build correct URL for dashboard', () => {
    const service = new NavigationService(mockRouter)
    const url = service.buildUrl({ type: 'dashboard', month: 7, year: 2025 })
    expect(url).toBe('/?view=dashboard&month=7&year=2025')
  })
})
```

### **Testing del Hook**
```typescript
describe('useAppNavigation', () => {
  it('should navigate to dashboard', async () => {
    const { result } = renderHook(() => useAppNavigation())
    await act(async () => {
      await result.current.navigateToDashboard(7, 2025)
    })
    expect(result.current.currentRoute).toEqual({
      type: 'dashboard',
      month: 7,
      year: 2025
    })
  })
})
```

## 📈 **Métricas y Monitoreo**

### **Métricas Recomendadas**
- Tiempo de navegación
- Tasa de errores de navegación
- Rutas más utilizadas
- Performance de parsing de URLs

### **Implementación**
```typescript
// En NavigationService
async navigate(route: AppRoute, options = {}): Promise<void> {
  const startTime = performance.now()
  
  try {
    // ... navegación
    const endTime = performance.now()
    console.log(`Navigation took ${endTime - startTime}ms`)
  } catch (error) {
    // ... error handling
  }
}
```

## 🎯 **Conclusión**

Este sistema de navegación proporciona:

1. **Escalabilidad**: Fácil agregar nuevas secciones
2. **Mantenibilidad**: Código limpio y organizado
3. **Performance**: Optimizado para React
4. **Developer Experience**: Type-safe y bien documentado
5. **Testing**: Fácil de testear
6. **Debugging**: Logs y estado visibles

El sistema sigue las mejores prácticas de Next.js y React, proporcionando una base sólida para el crecimiento futuro de la aplicación. 