// Traducciones en español para la aplicación de seguimiento de gastos
// Enfoque: Motivacional, familiar pero respetuoso, para usuarios colombianos

export const texts = {
  // Títulos principales
  appTitle: "Control de Gastos",
  dashboard: "Panel Principal",
  transactions: "Movimientos",
  settings: "Configuración",
  
  // Autenticación
  login: "Iniciar Sesión",
  logout: "Cerrar Sesión",
  signUp: "Registrarse",
  email: "Correo electrónico",
  password: "Contraseña",
  confirmPassword: "Confirmar contraseña",
  forgotPassword: "¿Olvidaste tu contraseña?",
  loginWithGoogle: "Continuar con Google",
  loginWithGithub: "Continuar con GitHub",
  noAccount: "¿No tienes cuenta?",
  haveAccount: "¿Ya tienes cuenta?",
  createAccount: "Crear cuenta",
  
  // Mensajes de bienvenida y motivación
  welcomeMessage: "¡Bienvenido a tu control de gastos!",
  welcomeSubtitle: "Empieza a tomar el control de tu dinero de manera sencilla",
  motivationMessage: "Cada movimiento que registres te acerca más a tus metas financieras",
  startTracking: "Empezar a registrar",
  
  // Dashboard y estadísticas
  totalBalance: "Saldo Total",
  totalIncome: "Ingresos Totales",
  totalExpenses: "Gastos Totales",
  thisMonth: "Este mes",
  lastMonth: "Mes pasado",
  thisYear: "Este año",
  lastYear: "Año pasado",
  
  // Transacciones
  addTransaction: "Agregar Movimiento",
  editTransaction: "Editar Movimiento",
  deleteTransaction: "Eliminar Movimiento",
  transactionType: "Tipo de Movimiento",
  income: "Ingreso",
  expense: "Gasto",
  amount: "Monto",
  description: "Descripción",
  category: "Categoría",
  date: "Fecha",
  time: "Hora",
  notes: "Notas",
  attachments: "Archivos adjuntos",
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
  recurrentOnly: "Solo Recurrentes",
  nonRecurrentOnly: "Solo No Recurrentes",
  forMonth: "Movimientos para",
  daysRemaining: "Días Restantes",
  status: "Estado",
  actions: "Acciones",
  due: "Vence",
  payingFrom: "Pagando desde",
  to: "hasta",
  allExpenses: "Todos los Gastos",
  yearlySummary: "Resumen anual por mes y tipo",
  month: "Mes",
  recurrent: "Recurrentes",
  nonRecurrent: "No Recurrentes",
  optional: "opcional",
  
  // Categorías
  categories: {
    food: "Alimentación",
    transportation: "Transporte",
    entertainment: "Entretenimiento",
    shopping: "Compras",
    health: "Salud",
    education: "Educación",
    housing: "Vivienda",
    utilities: "Servicios",
    salary: "Salario",
    freelance: "Trabajo independiente",
    investment: "Inversión",
    gift: "Regalo",
    other: "Otro"
  },
  
  // Mensajes de estado
  loading: "Cargando...",
  saving: "Guardando...",
  deleting: "Eliminando...",
  uploading: "Subiendo...",
  processing: "Procesando...",
  
  // Mensajes de éxito
  transactionAdded: "¡Movimiento agregado exitosamente!",
  transactionUpdated: "¡Movimiento actualizado!",
  transactionDeleted: "¡Movimiento eliminado!",
  fileUploaded: "¡Archivo subido correctamente!",
  changesSaved: "¡Cambios guardados!",
  
  // Mensajes de error
  errorOccurred: "Ocurrió un error",
  tryAgain: "Inténtalo de nuevo",
  invalidEmail: "Correo electrónico inválido",
  invalidPassword: "Contraseña inválida",
  passwordsDontMatch: "Las contraseñas no coinciden",
  requiredField: "Este campo es obligatorio",
  invalidAmount: "Monto inválido",
  fileTooLarge: "El archivo es muy grande",
  unsupportedFile: "Tipo de archivo no soportado",
  
  // Confirmaciones
  confirmDelete: "¿Estás seguro de que quieres eliminar este movimiento?",
  confirmLogout: "¿Estás seguro de que quieres cerrar sesión?",
  unsavedChanges: "Tienes cambios sin guardar. ¿Quieres salir sin guardar?",
  
  // Botones
  save: "Guardar",
  cancel: "Cancelar",
  delete: "Eliminar",
  edit: "Editar",
  add: "Agregar",
  close: "Cerrar",
  back: "Volver",
  next: "Siguiente",
  previous: "Anterior",
  search: "Buscar",
  filter: "Filtrar",
  clear: "Limpiar",
  download: "Descargar",
  upload: "Subir",
  
  // Filtros y búsqueda
  searchTransactions: "Buscar movimientos...",
  filterByCategory: "Filtrar por categoría",
  filterByDate: "Filtrar por fecha",
  filterByType: "Filtrar por tipo",
  allCategories: "Todas las categorías",
  allTypes: "Todos los tipos",
  
  // Mensajes motivacionales
  motivation: {
    noTransactions: "¡Empieza tu viaje financiero! Registra tu primer movimiento",
    lowBalance: "¡No te desanimes! Revisa tus gastos y ajusta tu presupuesto",
    goodProgress: "¡Excelente trabajo! Sigues bien encaminado",
    greatProgress: "¡Increíble! Estás tomando el control de tus finanzas",
    perfectProgress: "¡Espectacular! Eres un ejemplo de disciplina financiera"
  },
  
  // Mensajes de ayuda
  help: {
    addTransaction: "Haz clic en 'Agregar Movimiento' para registrar tus ingresos o gastos",
    categorizeTransaction: "Asigna una categoría para organizar mejor tus movimientos",
    trackProgress: "Revisa regularmente tu panel para ver tu progreso",
    setGoals: "Establece metas financieras para mantenerte motivado"
  },
  
  // Mensajes de validación
  validation: {
    amountRequired: "El monto es obligatorio",
    amountPositive: "El monto debe ser mayor a 0",
    descriptionRequired: "La descripción es obligatoria",
    categoryRequired: "La categoría es obligatoria",
    dateRequired: "La fecha es obligatoria",
    emailRequired: "El correo electrónico es obligatorio",
    passwordRequired: "La contraseña es obligatoria",
    passwordMinLength: "La contraseña debe tener al menos 6 caracteres"
  },
  
  // Mensajes de estado vacío
  empty: {
    noTransactions: "Aún no tienes movimientos registrados",
    noTransactionsFilter: "No se encontraron movimientos con los filtros aplicados",
    noAttachments: "No hay archivos adjuntos",
    noCategories: "No hay categorías disponibles"
  },
  
  // Mensajes de archivos
  files: {
    uploadFile: "Subir archivo",
    dragAndDrop: "Arrastra y suelta archivos aquí",
    orClickToSelect: "o haz clic para seleccionar",
    maxFileSize: "Tamaño máximo: 5MB",
    supportedFormats: "Formatos soportados: PDF, JPG, PNG",
    fileUploaded: "Archivo subido correctamente",
    fileDeleted: "Archivo eliminado",
    downloadFile: "Descargar archivo",
    viewFile: "Ver archivo",
    unsupportedFileType: "Tipo de archivo no soportado. Por favor sube imágenes (JPEG, PNG, GIF, WebP), PDFs o documentos de Office.",
    fileTooLarge: "El archivo es muy grande. Tamaño máximo: 10MB.",
    uploadFailed: "Error al subir",
    databaseError: "Error de base de datos",
    uploadPaymentProof: "Subir Comprobante de Pago",
    chooseFile: "Seleccionar Archivo",
    description: "Descripción",
    descriptionPlaceholder: "ej. Recibo, Factura, Extracto bancario"
  },
  
  // Mensajes de navegación
  navigation: {
    home: "Inicio",
    dashboard: "Panel",
    transactions: "Movimientos",
    reports: "Reportes",
    settings: "Configuración",
    help: "Ayuda"
  },
  
  // Mensajes de configuración
  config: {
    preferences: "Preferencias",
    notifications: "Notificaciones",
    security: "Seguridad",
    currency: "Moneda",
    language: "Idioma",
    theme: "Tema",
    darkMode: "Modo oscuro",
    lightMode: "Modo claro",
    autoMode: "Automático"
  },
  
  // Mensajes de reportes
  reports: {
    monthlyReport: "Reporte Mensual",
    yearlyReport: "Reporte Anual",
    categoryBreakdown: "Desglose por Categorías",
    spendingTrends: "Tendencias de Gastos",
    incomeAnalysis: "Análisis de Ingresos",
    exportData: "Exportar Datos",
    generateReport: "Generar Reporte"
  },
  
  // Mensajes de notificaciones
  notifications: {
    newTransaction: "Nuevo movimiento registrado",
    budgetAlert: "Alerta de presupuesto",
    goalAchieved: "¡Meta alcanzada!",
    reminder: "Recordatorio: Registra tus movimientos"
  },
  
  // Mensajes de perfil
  profile: {
    personalInfo: "Información Personal",
    name: "Nombre",
    lastName: "Apellido",
    phone: "Teléfono",
    address: "Dirección",
    updateProfile: "Actualizar Perfil",
    changePassword: "Cambiar Contraseña",
    deleteAccount: "Eliminar Cuenta"
  }
};

// Función helper para obtener textos con fallback
export const getText = (key: string, fallback?: string): string => {
  const keys = key.split('.');
  let value: any = texts;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return fallback || key;
    }
  }
  
  return typeof value === 'string' ? value : fallback || key;
};

// Función para obtener categorías
export const getCategories = () => texts.categories;

// Función para obtener mensajes motivacionales
export const getMotivationMessage = (balance: number): string => {
  if (balance === 0) return texts.motivation.noTransactions;
  if (balance < 0) return texts.motivation.lowBalance;
  if (balance < 1000000) return texts.motivation.goodProgress;
  if (balance < 5000000) return texts.motivation.greatProgress;
  return texts.motivation.perfectProgress;
}; 