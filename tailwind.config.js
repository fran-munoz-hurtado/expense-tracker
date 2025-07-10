/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'from-yellow-100', 'to-yellow-200', 'border-yellow-300', 'bg-yellow-100', 'text-yellow-800',
    'from-blue-50', 'to-blue-100', 'border-blue-200', 'bg-blue-100', 'text-blue-800',
    'from-blue-200', 'to-blue-400', 'from-blue-300', 'to-blue-500', 'from-blue-400', 'to-blue-600', 'from-blue-500', 'to-blue-700',
    'bg-blue-600', 'text-blue-600', 'text-blue-700', 'text-blue-900',
    'bg-yellow-200', 'text-yellow-700', 'text-yellow-900',
    'bg-[#101828]', 'border-[#101828]', 'text-white',
    // Agrega aquí cualquier otro color dinámico que uses
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // App-specific colors
        income: {
          primary: "hsl(var(--income-primary))",
          secondary: "hsl(var(--income-secondary))",
          light: "hsl(var(--income-light))",
          bg: "hsl(var(--income-bg))",
          "bg-light": "hsl(var(--income-bg-light))",
          border: "hsl(var(--income-border))",
          text: "hsl(var(--income-text))",
        },
        expense: {
          primary: "hsl(var(--expense-primary))",
          secondary: "hsl(var(--expense-secondary))",
          light: "hsl(var(--expense-light))",
          bg: "hsl(var(--expense-bg))",
          "bg-light": "hsl(var(--expense-bg-light))",
          border: "hsl(var(--expense-border))",
          text: "hsl(var(--expense-text))",
        },
        balance: {
          primary: "hsl(var(--balance-primary))",
          secondary: "hsl(var(--balance-secondary))",
          light: "hsl(var(--balance-light))",
          bg: "hsl(var(--balance-bg))",
          "bg-light": "hsl(var(--balance-bg-light))",
          border: "hsl(var(--balance-border))",
          text: "hsl(var(--balance-text))",
        },
        status: {
          paid: "hsl(var(--status-paid))",
          pending: "hsl(var(--status-pending))",
          overdue: "hsl(var(--status-overdue))",
        },
        button: {
          primary: "hsl(var(--button-primary))",
          secondary: "hsl(var(--button-secondary))",
          hover: "hsl(var(--button-hover))",
        },
        icon: {
          income: "hsl(var(--icon-income))",
          expense: "hsl(var(--icon-expense))",
          balance: "hsl(var(--icon-balance))",
        },
        filter: {
          active: "hsl(var(--filter-active))",
          inactive: "hsl(var(--filter-inactive))",
        },
        modal: {
          success: "hsl(var(--modal-success))",
          warning: "hsl(var(--modal-warning))",
          info: "hsl(var(--modal-info))",
        },
      },
    },
  },
  plugins: [],
} 