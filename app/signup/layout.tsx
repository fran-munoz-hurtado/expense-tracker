import type { Metadata } from 'next'
import { texts } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: `Crea tu cuenta en ${texts.appTitle}. Organiza tus ingresos y obligaciones en minutos.`,
  robots: { index: false, follow: true },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
