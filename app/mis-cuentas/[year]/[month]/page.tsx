import type { Metadata } from 'next'
import { texts } from '@/lib/translations'
import MisCuentasClient from './MisCuentasClient'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

type PageProps = {
  params: Promise<{ year: string; month: string }>
  searchParams: Promise<{ tipo?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, month } = await params
  const yearNum = parseInt(year, 10)
  const monthNum = parseInt(month, 10)
  const monthName = MONTH_NAMES[monthNum - 1] || month
  const title = `Mis cuentas - ${monthName} ${yearNum} | ${texts.appTitle}`
  const description = `Gastos e ingresos de ${monthName} ${yearNum}. Controla tus finanzas mensuales con ${texts.appTitle}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical: `/mis-cuentas/${year}/${month}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function MisCuentasPage({ params, searchParams }: PageProps) {
  const { year, month } = await params
  const { tipo } = await searchParams
  const yearNum = parseInt(year, 10)
  const monthNum = parseInt(month, 10)
  return (
    <MisCuentasClient
      year={yearNum}
      month={monthNum}
      filterParam={tipo ?? undefined}
    />
  )
}
