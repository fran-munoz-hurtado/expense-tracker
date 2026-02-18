import type { Metadata } from 'next'
import { texts } from '@/lib/translations'
import GruposClient from './GruposClient'

export const metadata: Metadata = {
  title: `Gestión de grupos | ${texts.appTitle}`,
  description: `Administra los grupos en los que participas. Comparte finanzas con familia o equipo.`,
  robots: { index: true, follow: true },
}

export default function GruposPage() {
  return <GruposClient />
}
