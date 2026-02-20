import type { Metadata } from 'next'
import { texts } from '@/lib/translations'
import GruposClient from './GruposClient'

export const metadata: Metadata = {
  title: `Mis espacios | ${texts.appTitle}`,
  description: `Administra los grupos en los que participas. Comparte finanzas con familia o equipo.`,
  robots: { index: false, follow: false },
}

export default function GruposPage() {
  return <GruposClient />
}
