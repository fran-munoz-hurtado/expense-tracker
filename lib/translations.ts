export const translations = {
  // App general
  appTitle: 'Expense Tracker',
  loading: 'Loading...',
  saving: 'Saving...',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  errorOccurred: 'An error occurred',
  
  // Navigation
  thisMonth: 'This Month',
  allExpenses: 'All Expenses',
  dashboard: 'Dashboard',
  yearlySummary: 'Yearly Summary',
  
  // Dashboard
  totalBalance: 'Total Balance',
  totalExpenses: 'Total Expenses',
  totalIncome: 'Total Income',
  pendingPayments: 'Pending Payments',
  paidExpenses: 'Paid Expenses',
  overdueExpenses: 'Overdue Expenses',
  
  // Transactions
  addTransaction: 'Add Transaction',
  editTransaction: 'Edit Transaction',
  deleteTransaction: 'Delete Transaction',
  transactions: 'Transactions',
  description: 'Description',
  amount: 'Amount',
  date: 'Date',
  status: 'Status',
  category: 'Category',
  type: 'Type',
  
  // Status
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
  
  // Types
  expense: 'Expense',
  income: 'Income',
  recurrent: 'Recurrent',
  nonRecurrent: 'Non-Recurrent',
  
  // Categories
  food: 'Food',
  transportation: 'Transportation',
  entertainment: 'Entertainment',
  utilities: 'Utilities',
  healthcare: 'Healthcare',
  education: 'Education',
  shopping: 'Shopping',
  other: 'Other',
  
  // Goals
  isGoal: 'Is Goal',
  goal: 'Goal',
  
  // Attachments
  attachments: 'Attachments',
  uploadFile: 'Upload File',
  uploading: 'Uploading...',
  
  // Modals
  confirmDelete: 'Confirm Delete',
  confirmModify: 'Confirm Modify',
  areYouSure: 'Are you sure?',
  
  // Errors
  invalidAmount: 'Invalid amount',
  invalidDate: 'Invalid date',
  requiredField: 'This field is required',
  
  // Success
  savedSuccessfully: 'Saved successfully',
  deletedSuccessfully: 'Deleted successfully',
  
  // Months
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  june: 'June',
  july: 'July',
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  
  // Additional fields for compatibility
  month: 'Month',
  email: 'Email',
  password: 'Password',
  logout: 'Logout',
  actions: 'Actions',
  due: 'Due',
  payingFrom: 'Paying from',
  to: 'to',
  daysRemaining: 'Days Remaining',
  forMonth: 'For the month of',
  
  // Empty states
  empty: {
    noTransactions: 'No transactions',
    noAttachments: 'No attachments'
  },
  
  // Profile
  profile: {
    name: 'Name',
    lastName: 'Last Name',
    updateProfile: 'Update Profile'
  },
  
  // Authentication
  login: 'Login',
  createAccount: 'Create Account',
  haveAccount: 'Already have an account?',
  noAccount: "Don't have an account?",
  
  // Files
  files: {
    uploadPaymentProof: 'Upload Payment Proof',
    dragAndDrop: 'Drag and drop files here, or',
    chooseFile: 'Choose a file',
    supportedFormats: 'Supported formats: PDF, JPG, PNG',
    maxFileSize: 'Max file size: 5MB',
    description: 'Description',
    descriptionPlaceholder: 'File description...',
    uploadFile: 'Upload File',
    viewFile: 'View File',
    downloadFile: 'Download File',
    unsupportedFileType: 'Unsupported file type',
    fileTooLarge: 'File is too large',
    uploadFailed: 'Upload failed',
    databaseError: 'Database error'
  },
  
  // Optional
  optional: 'Optional'
} as const

// Alias for backward compatibility
export const texts = translations 