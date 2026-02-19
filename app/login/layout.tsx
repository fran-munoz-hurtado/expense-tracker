import type { Metadata } from 'next'
import { texts } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: `Accede a tu cuenta de ${texts.appTitle}. Controla tus gastos e ingresos desde cualquier dispositivo.`,
  robots: { index: false, follow: true },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
