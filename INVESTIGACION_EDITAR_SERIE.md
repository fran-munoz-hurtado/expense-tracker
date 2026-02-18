# Investigación: Flujo "Editar Serie" - Toda la Serie no avanza

## Resumen del flujo actual

### 1. Usuario hace clic en "Editar"
- **Origen**: `handleModifyTransaction(transaction.id)` desde el dropdown de opciones (desktop o mobile)
- **Ubicación**: Líneas 2080 (desktop), 2237 (mobile)

### 2. handleModifyTransaction (línea 809)
- Busca `transaction` en `transactions` (del store Zustand)
- Si `source_type === 'non_recurrent'`: va directo al formulario (`setShowModifyForm(true)`)
- Si `source_type === 'recurrent'`: 
  - `modifyModalTransactionRef.current = transaction`
  - Resetea: `showModifyForm`, `modifyFormData`, `showModifyConfirmation`, etc.
  - `setModifyModalData({ transactionId, transaction, isRecurrent, modifySeries: false })`
  - `setShowModifyModal(true)`

### 3. Se muestra el modal de elección
- **Condición**: `showModifyModal && modifyModalData`
- **Contenido**: "Toda la Serie" | "Solo Esta Transacción" | "Cancelar"
- **Botón "Toda la Serie"**: `onMouseDown` → `handleConfirmModify(true)`

### 4. handleConfirmModify(true) (línea 863)
- Obtiene `transaction` de `modifyModalTransactionRef.current ?? modifyModalData?.transaction`
- Si no hay transaction → `return` (no hace nada)
- Busca `recurrentExpense = recurrentExpenses.find(re => re.id === transaction.source_id)`
- Si no encuentra → `setError('Original recurrent expense not found')` y `return`
- Si encuentra: `setModifyFormData({...})`, `setShowModifyModal(false)`, `setModifyModalData(null)`, `setShowModifyForm(true)`

### 5. Se debería mostrar el formulario
- **Condición**: `showModifyForm && modifyFormData`
- Si ambas son true, se renderiza el formulario de "Modificar Serie Recurrente"

---

## Estados involucrados

| Estado | Tipo | Uso |
|--------|------|-----|
| `modifyModalTransactionRef` | useRef | Transaction actual para evitar closure stale |
| `showModifyModal` | useState | Muestra modal Toda la Serie / Solo Esta |
| `modifyModalData` | useState | { transactionId, transaction, isRecurrent } |
| `showModifyForm` | useState | Muestra formulario de edición |
| `modifyFormData` | useState | Datos del formulario (descripción, rango, valor, etc.) |
| `recurrentExpenses` | useState | Lista de recurrent_expenses (de fetchUserExpenses) |

---

## Posibles causas del fallo

### A) El handler no se ejecuta
- **Causa**: Un elemento intercepta el evento (overlay, otro modal, CSS).
- **Evidencia**: Si añadimos `alert('handler')` al inicio de handleConfirmModify y no aparece, el handler no se ejecuta.

### B) transaction es null/undefined
- **Causa**: `modifyModalTransactionRef.current` y `modifyModalData?.transaction` son null.
- **Por qué**: El ref o el estado se limpian antes del clic.

### C) recurrentExpense no se encuentra
- **Causa**: `recurrentExpenses.find(re => re.id === transaction.source_id)` devuelve undefined.
- **Posibles motivos**:
  - `recurrentExpenses` está vacío (fetchData no ha terminado o falló).
  - `transaction.source_id` no coincide con ningún `re.id` (p. ej. tipos distintos).
- **Evidencia**: Se llama a `setError('Original recurrent expense not found')`.

### D) setState no provoca re-render
- Poco probable: React suele re-renderizar ante cambios de estado.

### E) Otro modal encima
- Modales con `z-index` mayor o que se renderizan después podrían tapar el modal de elección.
- **Orden de modales** (orden en DOM): Delete → Modify (elección) → Modify Form → Extend → Apply → Modify Confirmation...
- **Z-index**: Modify (elección) = 100, Modify Form = 50.

---

## Dependencias de datos

- **transactions**: Zustand store, filtradas por mes/año.
- **recurrentExpenses**: `fetchData()` → `fetchUserExpenses(user)` → todas las recurrent del usuario.
- **fetchData**: Se ejecuta en `useEffect` cuando cambia `[fetchData]`.
- **fetchData** depende de: `[user, selectedMonth, selectedYear, transactions]`.
- Si `transactions` cambia, fetchData se vuelve a ejecutar y puede sobrescribir `recurrentExpenses`.

---

## Próximo paso sugerido

Añadir un `console.log` o `alert` temporal al inicio de `handleConfirmModify` para comprobar:
1. Si el handler se ejecuta.
2. Los valores de `transaction`, `modifyModalTransactionRef.current`, `recurrentExpense`.

Si el handler no se ejecuta → problema de eventos/CSS.
Si se ejecuta pero `recurrentExpense` es undefined → problema de datos (`recurrentExpenses` vacío o `source_id` incorrecto).
