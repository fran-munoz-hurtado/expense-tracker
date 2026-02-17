import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

/**
 * /mis-cuentas → redirect to current month for SEO-friendly deep linking.
 */
export default function MisCuentasRedirect() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  redirect(ROUTES.misCuentasMonth(year, month))
}
