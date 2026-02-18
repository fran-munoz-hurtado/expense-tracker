import type { Metadata } from 'next'
import { texts } from '@/lib/translations'
import GrupoDetailClient from './GrupoDetailClient'

type PageProps = {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupId } = await params
  return {
    title: `Detalle del grupo | ${texts.appTitle}`,
    description: `Información detallada del grupo: miembros, transacciones y más.`,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/mis-cuentas/grupos/${groupId}`,
    },
  }
}

export default async function GrupoDetailPage({ params }: PageProps) {
  const { groupId } = await params
  return <GrupoDetailClient groupId={groupId} />
}
