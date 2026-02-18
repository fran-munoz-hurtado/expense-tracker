import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { texts } from '@/lib/translations'
import { parseMisCuentasSlug } from '@/lib/routes'
import MisCuentasClient from '../MisCuentasClient'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

type PageProps = {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ tipo?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const parsed = parseMisCuentasSlug(slug)
  if (!parsed) {
    return { title: texts.appTitle }
  }
  const { year, month, groupId } = parsed
  const monthName = MONTH_NAMES[month - 1] || String(month)
  const title = `Mis cuentas - ${monthName} ${year} | ${texts.appTitle}`
  const description = `Gastos e ingresos de ${monthName} ${year}. Controla tus finanzas mensuales con ${texts.appTitle}.`
  const canonical = groupId
    ? `/mis-cuentas/${groupId}/${year}/${month}`
    : `/mis-cuentas/${year}/${month}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function MisCuentasSlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tipo } = await searchParams
  const parsed = parseMisCuentasSlug(slug)

  if (!parsed) {
    notFound()
  }

  const { year, month, groupId } = parsed
  return (
    <MisCuentasClient
      groupId={groupId}
      year={year}
      month={month}
      filterParam={tipo ?? undefined}
    />
  )
}
