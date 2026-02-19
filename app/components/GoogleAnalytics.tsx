'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { GA_MEASUREMENT_ID, isGAEnabled, pageview } from '@/lib/analytics'

export default function GoogleAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    if (!isGAEnabled() || !pathname) return
    pageview(pathname)
  }, [pathname])

  if (!isGAEnabled()) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
