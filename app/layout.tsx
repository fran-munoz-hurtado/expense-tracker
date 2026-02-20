import type { Metadata, Viewport } from 'next'
import { Quicksand, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { texts } from '@/lib/translations'
import { DataSyncProvider } from '@/lib/hooks/useDataSync'
import SessionRefreshHandler from './components/SessionRefreshHandler'
import GoogleAnalytics from './components/GoogleAnalytics'
import WebVitals from './components/WebVitals'

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

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://controla.click'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${texts.appTitle} — Control de gastos e ingresos`,
    template: `%s | ${texts.appTitle}`,
  },
  description: 'Controla tus gastos e ingresos mensuales. Organiza tus finanzas personales, crea espacios compartidos con familia o equipo. App gratis para presupuesto y ahorro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: texts.appTitle,
  },
  keywords: ['control de gastos', 'finanzas personales', 'presupuesto mensual', 'ahorro', 'gastos e ingresos', 'controla', 'espacios compartidos', 'presupuesto familiar'],
  authors: [{ name: 'Controla', url: baseUrl }],
  creator: 'Controla',
  openGraph: {
    title: `${texts.appTitle} — Control de gastos e ingresos`,
    description: 'Controla tus gastos e ingresos. Organiza finanzas personales o comparte espacios con familia o equipo. Gratis.',
    type: 'website',
    locale: 'es_CO',
    url: baseUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${texts.appTitle} — Control de gastos e ingresos`,
    description: 'Controla tus gastos e ingresos. Organiza finanzas o comparte espacios. Gratis.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
      lang="es" 
      className={`${quicksand.variable} ${jetbrainsMono.variable}`}
      style={{
        // Set CSS variables for our parametrizable typography system
        '--font-primary': quicksand.style.fontFamily,
        '--font-display': quicksand.style.fontFamily,
        '--font-mono': jetbrainsMono.style.fontFamily,
      } as React.CSSProperties}
    >
      <head>
        {/* Google Analytics - debe cargar pronto para que GA reconozca la instalación */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
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
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        )}
        {/* JSON-LD: Organization + WebApplication para rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  name: texts.appTitle,
                  url: baseUrl,
                  description: 'App para control de gastos e ingresos. Finanzas personales y espacios compartidos.',
                },
                {
                  '@type': 'WebApplication',
                  name: texts.appTitle,
                  url: baseUrl,
                  applicationCategory: 'FinanceApplication',
                  operatingSystem: 'Web',
                  description: 'Controla tus gastos e ingresos mensuales. Organiza finanzas personales o comparte espacios con familia o equipo.',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'COP',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-primary antialiased">
        <GoogleAnalytics />
        <WebVitals />
        <SessionRefreshHandler />
        <DataSyncProvider>{children}</DataSyncProvider>
      </body>
    </html>
  )
} 