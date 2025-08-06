import type { Metadata, Viewport } from 'next'
import { Inter, Roboto, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { texts } from '@/lib/translations'

// ========================================
// MODERN FONT CONFIGURATION
// Based on Google Material Design, Apple HIG, Spotify & Uber
// ========================================

// Primary font - Inter (Google's choice, used by Uber)
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
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

// Display font - Roboto (Google Material Design)
const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
  weight: ['300', '400', '500', '700', '900'],
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
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
      className={`${inter.variable} ${roboto.variable} ${jetbrainsMono.variable}`}
      style={{
        // Set CSS variables for our parametrizable typography system
        '--font-primary': inter.style.fontFamily,
        '--font-display': roboto.style.fontFamily,
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
        
        {/* Load fonts via stylesheets for better compatibility */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" />
        
        {/* Theme color for browsers */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
      </head>
      <body className="font-primary antialiased">{children}</body>
    </html>
  )
} 