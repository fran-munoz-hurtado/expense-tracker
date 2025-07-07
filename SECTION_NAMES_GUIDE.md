# Guía para Cambiar Nombres de Secciones

## Ubicación Centralizada

Los nombres de las secciones principales están definidos de manera centralizada en el archivo:

```
lib/translations.ts
```

## Secciones Principales

### 1. Control del Mes (antes "Este Mes")
- **Clave**: `thisMonth`
- **Ubicación**: Línea ~35 en `lib/translations.ts`
- **Función**: Dashboard mensual con transacciones específicas del mes seleccionado

### 2. Panorama General (antes "Todos los Gastos")
- **Clave**: `allExpenses`
- **Ubicación**: Línea ~75 en `lib/translations.ts`
- **Función**: Resumen anual por mes y tipo de gasto

## Cómo Cambiar los Nombres

### Paso 1: Editar el archivo de traducciones
Abre `lib/translations.ts` y busca las siguientes líneas:

```typescript
// Dashboard y estadísticas - lenguaje más cercano
totalBalance: "Total del Mes",
totalIncome: "Cuánto entra",
totalExpenses: "Cuánto sale",
thisMonth: "Control del Mes",        // ← Cambiar aquí
lastMonth: "Mes pasado",
thisYear: "Este año",
lastYear: "Año pasado",

// ... más código ...

allExpenses: "Panorama General",     // ← Cambiar aquí
yearlySummary: "Resumen anual por mes y tipo",
```

### Paso 2: Cambiar los valores
Simplemente modifica los valores entre comillas:

```typescript
// Ejemplo de cambio
thisMonth: "Mi Vista Mensual",       // Nuevo nombre
allExpenses: "Resumen Anual",        // Nuevo nombre
```

### Paso 3: Guardar y verificar
1. Guarda el archivo
2. El servidor se recargará automáticamente
3. Verifica que los cambios aparezcan en la interfaz

## Ventajas de esta Implementación

✅ **Centralizado**: Todos los nombres están en un solo lugar
✅ **Fácil de mantener**: No hay nombres hardcodeados en componentes
✅ **Consistente**: Todos los componentes usan las mismas traducciones
✅ **Escalable**: Fácil agregar nuevos idiomas en el futuro
✅ **Sin rompimientos**: Los cambios no afectan la funcionalidad

## Estructura de Archivos

```
lib/
├── translations.ts          # ← Nombres centralizados aquí
├── services/
│   └── NavigationService.ts # Usa las traducciones
└── hooks/
    └── useAppNavigation.ts  # Usa las traducciones

app/
├── components/
│   ├── Sidebar.tsx         # Usa las traducciones
│   ├── DashboardView.tsx   # Usa las traducciones
│   └── GeneralDashboardView.tsx # Usa las traducciones
└── page.tsx                # Usa las traducciones
```

## Ejemplos de Cambios

### Cambio Simple
```typescript
// Antes
thisMonth: "Control del Mes",
allExpenses: "Panorama General",

// Después
thisMonth: "Mi Mes",
allExpenses: "Vista General",
```

### Cambio con Emojis
```typescript
// Antes
thisMonth: "Control del Mes",
allExpenses: "Panorama General",

// Después
thisMonth: "📊 Control del Mes",
allExpenses: "📈 Panorama General",
```

### Cambio Más Descriptivo
```typescript
// Antes
thisMonth: "Control del Mes",
allExpenses: "Panorama General",

// Después
thisMonth: "Vista Mensual Detallada",
allExpenses: "Resumen Anual Completo",
```

## Notas Importantes

- **No hardcodear**: Nunca pongas los nombres directamente en los componentes
- **Usar traducciones**: Siempre usa `texts.thisMonth` y `texts.allExpenses`
- **Consistencia**: Mantén el mismo estilo de lenguaje en toda la app
- **Testing**: Verifica que los cambios funcionen en todas las vistas

## Troubleshooting

### Si los cambios no aparecen:
1. Verifica que guardaste el archivo
2. Revisa que el servidor se recargó
3. Limpia el caché del navegador
4. Reinicia el servidor si es necesario

### Si hay errores:
1. Verifica la sintaxis TypeScript
2. Asegúrate de que las comillas estén correctas
3. Revisa que no haya caracteres especiales problemáticos 