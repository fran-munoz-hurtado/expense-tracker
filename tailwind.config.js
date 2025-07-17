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
    // Typography classes for safelist
    'text-display-large', 'text-display-medium', 'text-display-small',
    'text-headline-large', 'text-headline-medium', 'text-headline-small',
    'text-title-large', 'text-title-medium', 'text-title-small',
    'text-body-large', 'text-body-medium', 'text-body-small',
    'text-label-large', 'text-label-medium', 'text-label-small',
    // New color tokens for safelist
    'bg-green-primary', 'text-green-primary', 'text-green-dark', 'bg-green-light',
    'bg-beige', 'bg-neutral-bg', 'bg-neutral-light', 'border-border-light',
    'text-gray-text', 'text-gray-dark', 'bg-warning-bg', 'text-warning-yellow',
    'bg-error-bg', 'text-error-red', 'bg-info-bg', 'text-info-blue',
    'hover:bg-[#77b16e]', 'active:bg-[#5d9f67]', 'shadow-soft', 'rounded-mdplus',
  ],
  theme: {
    extend: {
      // 🎨 CuandoQueda Color Palette - Calm Green & Sand
      colors: {
        // Base Palette - Calm Green & Sand
        green: {
          primary: '#88c57f',     // Main actions, "paid" status, CTA
          dark: '#5d7760',        // Icons, muted headings
          light: '#dff0d8',       // Paid badge background
        },
        beige: '#e3e4db',         // Sidebar background, neutral elements
        neutral: {
          bg: '#f9f9f7',          // App background (non-white, soft)
          light: '#f4f4f0',       // Very soft containers (if needed)
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          light: '#d4d4cd',       // Card and input borders
        },
        gray: {
          text: '#666666',        // Secondary text
          dark: '#1a1a1a',        // Primary readable text (not pure black)
        },
        warning: {
          yellow: '#f7c17b',      // "Falta pagar" text
          bg: '#fff3cd',          // Yellow tag background
        },
        error: {
          red: '#d9534f',         // "Se pasó la fecha" text
          bg: '#f2dede',          // Red tag background
        },
        info: {
          blue: '#4682b4',        // Optional info text
          bg: '#e3f6f5',          // Optional info background
        },
        
        // Existing colors preserved...
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

      // MODERN TYPOGRAPHY SYSTEM
      // Based on Google Material Design 3, Apple HIG, Spotify & Uber best practices
      fontFamily: {
        // Primary system fonts stack (parametrizable via CSS variables)
        'primary': 'var(--font-primary)',
        'display': 'var(--font-display)', 
        'mono': 'var(--font-mono)',
        
        // Fallback system fonts
        'system': [
          '-apple-system', 
          'BlinkMacSystemFont', 
          'Segoe UI', 
          'Roboto', 
          'Helvetica Neue', 
          'Arial', 
          'sans-serif'
        ],
        
        // Specific brand-inspired stacks
        'inter': ['Inter', 'var(--font-primary)'],
        'sf-pro': ['SF Pro Display', 'SF Pro Text', '-apple-system', 'var(--font-primary)'],
        'roboto': ['Roboto', 'var(--font-primary)'],
        // Adding Inter as primary sans font as requested
        sans: ['Inter', 'sans-serif'],
      },

      // Modern font sizes using rem for scalability (Material Design 3 scale)
      fontSize: {
        // Display styles (large headlines)
        'display-large': ['var(--font-size-display-large, 3.5rem)', {
          lineHeight: 'var(--line-height-display-large, 1.15)',
          letterSpacing: 'var(--letter-spacing-display-large, -0.025em)',
          fontWeight: 'var(--font-weight-display-large, 400)',
        }],
        'display-medium': ['var(--font-size-display-medium, 2.8125rem)', {
          lineHeight: 'var(--line-height-display-medium, 1.16)',
          letterSpacing: 'var(--letter-spacing-display-medium, -0.025em)',
          fontWeight: 'var(--font-weight-display-medium, 400)',
        }],
        'display-small': ['var(--font-size-display-small, 2.25rem)', {
          lineHeight: 'var(--line-height-display-small, 1.22)',
          letterSpacing: 'var(--letter-spacing-display-small, -0.025em)',
          fontWeight: 'var(--font-weight-display-small, 400)',
        }],

        // Headline styles
        'headline-large': ['var(--font-size-headline-large, 2rem)', {
          lineHeight: 'var(--line-height-headline-large, 1.25)',
          letterSpacing: 'var(--letter-spacing-headline-large, -0.025em)',
          fontWeight: 'var(--font-weight-headline-large, 600)',
        }],
        'headline-medium': ['var(--font-size-headline-medium, 1.75rem)', {
          lineHeight: 'var(--line-height-headline-medium, 1.29)',
          letterSpacing: 'var(--letter-spacing-headline-medium, -0.025em)',
          fontWeight: 'var(--font-weight-headline-medium, 600)',
        }],
        'headline-small': ['var(--font-size-headline-small, 1.5rem)', {
          lineHeight: 'var(--line-height-headline-small, 1.33)',
          letterSpacing: 'var(--letter-spacing-headline-small, -0.025em)',
          fontWeight: 'var(--font-weight-headline-small, 600)',
        }],

        // Title styles
        'title-large': ['var(--font-size-title-large, 1.375rem)', {
          lineHeight: 'var(--line-height-title-large, 1.27)',
          letterSpacing: 'var(--letter-spacing-title-large, -0.025em)',
          fontWeight: 'var(--font-weight-title-large, 500)',
        }],
        'title-medium': ['var(--font-size-title-medium, 1.125rem)', {
          lineHeight: 'var(--line-height-title-medium, 1.33)',
          letterSpacing: 'var(--letter-spacing-title-medium, -0.025em)',
          fontWeight: 'var(--font-weight-title-medium, 500)',
        }],
        'title-small': ['var(--font-size-title-small, 0.875rem)', {
          lineHeight: 'var(--line-height-title-small, 1.43)',
          letterSpacing: 'var(--letter-spacing-title-small, 0.025em)',
          fontWeight: 'var(--font-weight-title-small, 500)',
        }],

        // Body text styles
        'body-large': ['var(--font-size-body-large, 1rem)', {
          lineHeight: 'var(--line-height-body-large, 1.5)',
          letterSpacing: 'var(--letter-spacing-body-large, 0em)',
          fontWeight: 'var(--font-weight-body-large, 400)',
        }],
        'body-medium': ['var(--font-size-body-medium, 0.875rem)', {
          lineHeight: 'var(--line-height-body-medium, 1.43)',
          letterSpacing: 'var(--letter-spacing-body-medium, 0.025em)',
          fontWeight: 'var(--font-weight-body-medium, 400)',
        }],
        'body-small': ['var(--font-size-body-small, 0.75rem)', {
          lineHeight: 'var(--line-height-body-small, 1.33)',
          letterSpacing: 'var(--letter-spacing-body-small, 0.025em)',
          fontWeight: 'var(--font-weight-body-small, 400)',
        }],

        // Label styles (for buttons, form labels, etc.)
        'label-large': ['var(--font-size-label-large, 0.875rem)', {
          lineHeight: 'var(--line-height-label-large, 1.43)',
          letterSpacing: 'var(--letter-spacing-label-large, 0.025em)',
          fontWeight: 'var(--font-weight-label-large, 500)',
        }],
        'label-medium': ['var(--font-size-label-medium, 0.75rem)', {
          lineHeight: 'var(--line-height-label-medium, 1.33)',
          letterSpacing: 'var(--letter-spacing-label-medium, 0.05em)',
          fontWeight: 'var(--font-weight-label-medium, 500)',
        }],
        'label-small': ['var(--font-size-label-small, 0.6875rem)', {
          lineHeight: 'var(--line-height-label-small, 1.45)',
          letterSpacing: 'var(--letter-spacing-label-small, 0.05em)',
          fontWeight: 'var(--font-weight-label-small, 500)',
        }],

        // Legacy sizes for backward compatibility
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },

      // Modern font weights
      fontWeight: {
        'thin': 'var(--font-weight-thin, 100)',
        'extralight': 'var(--font-weight-extralight, 200)',
        'light': 'var(--font-weight-light, 300)',
        'normal': 'var(--font-weight-normal, 400)',
        'medium': 'var(--font-weight-medium, 500)',
        'semibold': 'var(--font-weight-semibold, 600)',
        'bold': 'var(--font-weight-bold, 700)',
        'extrabold': 'var(--font-weight-extrabold, 800)',
        'black': 'var(--font-weight-black, 900)',
      },

      // Modern line heights
      lineHeight: {
        'none': '1',
        'tight': 'var(--line-height-tight, 1.25)',
        'snug': 'var(--line-height-snug, 1.375)',
        'normal': 'var(--line-height-normal, 1.5)',
        'relaxed': 'var(--line-height-relaxed, 1.625)',
        'loose': 'var(--line-height-loose, 2)',
        // Specific line heights for typography scale
        'display': 'var(--line-height-display, 1.15)',
        'headline': 'var(--line-height-headline, 1.25)',
        'title': 'var(--line-height-title, 1.33)',
        'body': 'var(--line-height-body, 1.5)',
        'label': 'var(--line-height-label, 1.43)',
      },

      // Modern letter spacing
      letterSpacing: {
        'tighter': 'var(--letter-spacing-tighter, -0.05em)',
        'tight': 'var(--letter-spacing-tight, -0.025em)',
        'normal': 'var(--letter-spacing-normal, 0em)',
        'wide': 'var(--letter-spacing-wide, 0.025em)',
        'wider': 'var(--letter-spacing-wider, 0.05em)',
        'widest': 'var(--letter-spacing-widest, 0.1em)',
      },

      // Adding new design tokens as requested
      boxShadow: {
        soft: '0 1px 3px rgba(0, 0, 0, 0.05)', // Soft hover or card shadow
      },

      borderRadius: {
        mdplus: '10px', // Rounded tags or soft corners
      },
    },
  },
  plugins: [],
} 