import type { Metadata, Viewport } from 'next'
import { Quicksand, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { texts } from '@/lib/translations'
import { DataSyncProvider } from '@/lib/hooks/useDataSync'
import SessionRefreshHandler from './components/SessionRefreshHandler'

// ========================================
// MODERN FONT CONFIGURATION
// Using Quicksand as primary and display font
// ========================================

// Primary font - Quicksand (modern, friendly sans-serif)
const quicksand = Quicksand({ 
  subsets: ['latin'],
  variable: '--font-quicksand',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont', 
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif'
  ]
})

// Monospace font - JetBrains Mono (modern alternative to SF Mono)
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  fallback: [
    'SF Mono',
    'Monaco',
    'Inconsolata',
    'Roboto Mono',
    'Droid Sans Mono',
    'Cascadia Code',
    'Fira Code',
    'Ubuntu Mono',
    'monospace'
  ]
})

export const metadata: Metadata = {
  title: texts.appTitle,
  description: 'Modern expense tracker with beautiful typography - Track your monthly expenses and incomes with a beautiful, accessible interface',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: texts.appTitle,
  },
  // SEO improvements
  keywords: ['expense tracker', 'budget management', 'financial planning', 'modern UI'],
  authors: [{ name: 'Expense Tracker Team' }],
  openGraph: {
    title: texts.appTitle,
    description: 'Modern expense tracker with beautiful typography',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
  colorScheme: 'light dark', // Support for dark mode
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      className={`${quicksand.variable} ${jetbrainsMono.variable}`}
      style={{
        // Set CSS variables for our parametrizable typography system
        '--font-primary': quicksand.style.fontFamily,
        '--font-display': quicksand.style.fontFamily,
        '--font-mono': jetbrainsMono.style.fontFamily,
      } as React.CSSProperties}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={texts.appTitle} />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Note: next/font/google handles font loading automatically, but keeping preconnect for performance */}
        
        {/* Theme color for browsers */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
      </head>
      <body className="font-primary antialiased">
        <SessionRefreshHandler />
        <DataSyncProvider>{children}</DataSyncProvider>
      </body>
    </html>
  )
} 