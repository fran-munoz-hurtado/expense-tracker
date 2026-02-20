/**
 * Centralized translations for the application.
 *
 * This file contains all text strings used throughout the application.
 * For section titles, use SECTION_TITLES for easy customization.
 */

export const translations = {
  // App general
  appTitle: 'Controla',
  loading: 'Cargando...',
  saving: 'Guardando...',
  save: 'Guardar',
  cancel: 'Cancelar',
  delete: 'Eliminar',
  errorOccurred: 'Ocurrió un error',
  
  // Navigation
  thisMonth: 'Mis cuentas',
  allExpenses: 'Balance general',
  misMetas: 'Mis objetivos',
  dashboard: 'Dashboard',
  yearlySummary: 'Resumen Anual',
  
  // Dashboard
  totalBalance: 'Total General',
  totalExpenses: 'Total de Gastos',
  totalIncome: 'Total de Ingresos',
  pendingPayments: 'Pagos Pendientes',
  paidExpenses: 'Gastos Pagados',
  overdueExpenses: 'Gastos Vencidos',
  
  // Monthly totals
  monthlyTotal: 'Total del mes',
  alreadyPaid: 'Ya pagado',
  stillPending: 'Falta pagar',
  overdueAmount: 'Se pasó la fecha',
  
  // New financial overview totals
  monthlyIncomeTotal: 'Total Ingresos del mes',
  monthlyExpensesTotal: 'Total Gastos del mes',
  cuantoQueda: 'CuantoQueda',
  
  // Transactions
  addTransaction: 'Añadir movimiento',
  editTransaction: 'Editar Transacción',
  deleteTransaction: 'Eliminar Transacción',
  transactions: 'Transacciones',
  description: 'Descripción',
  assignedTo: 'Asignado',
  assignToSeriesTitle: '¿Asignar a toda la serie?',
  assignToSeriesMessage: 'Este movimiento es recurrente. ¿Quieres asignar a {{name}} solo en este mes o en todos los meses de la serie?',
  assignOnlyThis: 'Solo este mes',
  assignEntireSeries: 'Toda la serie',
  amount: 'Monto',
  date: 'Fecha',
  status: 'Estado',
  category: 'Categoría',
  type: 'Tipo',
  
  // Status
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Se pasó la fecha',
  
  // Types
  expense: 'Gasto',
  income: 'Ingreso',
  recurrent: 'Mensual',
  nonRecurrent: 'Único',
  
  // Categories
  food: 'Comida',
  transportation: 'Transporte',
  entertainment: 'Entretenimiento',
  utilities: 'Servicios',
  healthcare: 'Salud',
  education: 'Educación',
  shopping: 'Compras',
  other: 'Otro',
  
  // Goals
  isGoal: 'Es Meta',
  goal: 'Meta',
  
  // Notes
  notes: 'Notas',
  notesPlaceholder: 'Añade notas opcionales (máx. 500 caracteres)',

  // Abonos (partial payments)
  abonar: 'Abonar',
  abono: 'Abono',
  abonos: 'Abonos',
  addAbono: 'Agregar abono',
  amountToAbonar: 'Monto a abonar',
  abonoDate: 'Fecha del abono',
  totalAbonado: 'Total abonado',
  abonoExceedsValue: 'El total de abonos supera el valor del gasto.',
  abonoExceedsConfirm: '¿Deseas actualizar el valor total a {total} y marcarlo como pagado?',
  abonoSaved: 'Abono registrado',
  noAbonosYet: 'Aún no hay abonos',
  editAbono: 'Editar abono',
  deleteAbono: 'Eliminar abono',

  // Attachments
  attachments: 'Adjuntos',
  uploadFile: 'Subir Archivo',
  uploading: 'Subiendo...',
  
  // Modals
  confirmDelete: 'Confirmar Eliminación',
  confirmModify: 'Confirmar Modificación',
  areYouSure: '¿Estás seguro?',
  
  // Errors
  invalidAmount: 'Monto inválido',
  invalidDate: 'Fecha inválida',
  requiredField: 'Este campo es requerido',
  
  // Success
  savedSuccessfully: 'Guardado exitosamente',
  deletedSuccessfully: 'Eliminado exitosamente',
  
  // Months
  january: 'Enero',
  february: 'Febrero',
  march: 'Marzo',
  april: 'Abril',
  may: 'Mayo',
  june: 'Junio',
  july: 'Julio',
  august: 'Agosto',
  september: 'Septiembre',
  october: 'Octubre',
  november: 'Noviembre',
  december: 'Diciembre',
  
  // Additional fields for compatibility
  month: 'Mes',
  email: 'Correo Electrónico',
  password: 'Contraseña',
  logout: 'Cerrar Sesión',
  actions: 'Acciones',
  due: 'Vencimiento',
  payingFrom: 'Pagando desde',
  to: 'hasta',
  daysRemaining: 'Días Restantes',
  forMonth: 'Para el mes de',
  
  // Empty states
  empty: {
    noTransactions: 'No hay transacciones',
    noAttachments: 'No hay adjuntos'
  },
  
  // Profile
  profile: {
    name: 'Nombre',
    lastName: 'Apellido',
    updateProfile: 'Actualizar Perfil',
    debugSection: 'Sección de Debug',
    username: 'Nombre de usuario'
  },
  
  // Authentication
  login: 'Iniciar Sesión',
  createAccount: 'Crear Cuenta',
  haveAccount: '¿Ya tienes una cuenta?',
  noAccount: "¿No tienes una cuenta?",
  
  // Files
  files: {
    uploadPaymentProof: 'Subir Comprobante de Pago',
    dragAndDrop: 'Arrastra y suelta archivos aquí, o',
    chooseFile: 'Elegir archivo',
    supportedFormats: 'Formatos soportados: PDF, JPG, PNG',
    maxFileSize: 'Tamaño máximo: 5MB',
    description: 'Descripción',
    descriptionPlaceholder: 'Descripción del archivo...',
    uploadFile: 'Subir Archivo',
    viewFile: 'Ver Archivo',
    downloadFile: 'Descargar Archivo',
    unsupportedFileType: 'Tipo de archivo no soportado',
    fileTooLarge: 'El archivo es muy grande',
    uploadFailed: 'Error al subir',
    databaseError: 'Error de base de datos'
  },
  
  // Optional
  optional: 'Opcional'
} as const

// Alias for backward compatibility
export const texts = translations

// Section titles for easy customization
export const SECTION_TITLES = {
  MONTH_CONTROL: 'Mis cuentas',
  GENERAL_OVERVIEW: 'Balance general',
} as const; 