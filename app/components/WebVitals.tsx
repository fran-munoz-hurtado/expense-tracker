'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { GA_MEASUREMENT_ID } from '@/lib/analytics'

/**
 * Envía Core Web Vitals a GA4 para monitoreo de rendimiento y SEO.
 * Google usa estas métricas como señal de ranking.
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }
  })
  return null
}
