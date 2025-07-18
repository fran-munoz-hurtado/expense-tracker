# Guía para Cambiar Nombres de Secciones

## Ubicación Centralizada

Los nombres de las secciones principales están definidos de manera centralizada en el archivo:

```
lib/translations.ts
```

## Secciones Principales

### 1. Mis cuentas (antes "Control del Mes")
- **Clave**: `thisMonth`
- **Ubicación**: Línea ~20 en `lib/translations.ts`
- **Función**: Dashboard mensual con transacciones específicas del mes seleccionado

### 2. Balance general (antes "Todos los Gastos")
- **Clave**: `allExpenses`
- **Ubicación**: Línea ~21 en `lib/translations.ts`
- **Función**: Resumen anual por mes y tipo de gasto

### 3. ¿En qué gasto? (antes "Por Categorías")
- **Clave**: `label` en Sidebar
- **Ubicación**: Línea ~40 en `app/components/Sidebar.tsx`
- **Función**: Análisis de gastos organizados por categoría

### 4. Mis objetivos (antes "Mis Metas")
- **Clave**: `misMetas`
- **Ubicación**: Línea ~22 en `lib/translations.ts`
- **Función**: Gestión y monitoreo de metas financieras

## Cómo Cambiar los Nombres

### Paso 1: Editar el archivo de traducciones
Abre `lib/translations.ts` y busca las siguientes líneas:

```typescript
// Dashboard y estadísticas - lenguaje más cercano
totalBalance: "Total del Mes",
totalIncome: "Cuánto entra",
totalExpenses: "Cuánto sale",
thisMonth: "Mis cuentas",        // ← Cambiar aquí
lastMonth: "Mes pasado",
thisYear: "Este año",
// ... más líneas
allExpenses: "Balance general",     // ← Cambiar aquí
misMetas: "Mis objetivos",        // ← Cambiar aquí
```

### Paso 2: Editar el Sidebar (para "¿En qué gasto?")
Abre `app/components/Sidebar.tsx` y busca:

```typescript
{
  id: 'categories',
  label: '¿En qué gasto?',    // ← Cambiar aquí
  icon: FolderOpen,
  description: 'Analiza tus gastos organizados por categoría'
},
```

### Paso 3: Verificar cambios
Los nombres se actualizarán automáticamente en:
- 🧭 Sidebar de navegación
- 📊 Títulos de las páginas
- 🔗 Referencias internas
- 📱 Tooltips y ayudas

### Ejemplos de Uso Anterior

```typescript
// ANTES (versión antigua)
export const translations = {
  // Navigation  
  thisMonth: "Control del Mes",
  allExpenses: "Panorama General",
  misMetas: "Mis metas",
  // ... resto del archivo
}

// Sidebar antes
{
  id: 'categories',
  label: 'Por Categorías',
  // ...
}
```

```typescript
// DESPUÉS (versión actual)
export const translations = {
  // Navigation  
  thisMonth: "Mis cuentas",
  allExpenses: "Balance general", 
  misMetas: "Mis objetivos",
  // ... resto del archivo
}

// Sidebar después
{
  id: 'categories',
  label: '¿En qué gasto?',
  // ...
}
```

### Impacto de los Cambios

✅ **Automaticamente actualizados:**
- Sidebar de navegación
- Títulos de páginas
- Referencias en tooltips
- Logs de depuración

⚠️ **Require actualización manual:**
- Comentarios en el código
- Documentación adicional
- Archivos de configuración externos 