import type { Metadata } from 'next'
import Link from 'next/link'
import PrivacyPolicyContent from '@/app/components/PrivacyPolicyContent'

export const metadata: Metadata = {
  title: 'Política de Tratamiento de Datos',
  description: 'Política de Tratamiento de Datos Personales de Controla. Ley 1581 de 2012 (Colombia).',
  openGraph: {
    title: 'Política de Tratamiento de Datos | Controla',
    description: 'Política de Tratamiento de Datos Personales de Controla.',
  },
  alternates: {
    canonical: '/privacidad',
  },
}

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">
          ← Volver a inicio
        </Link>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Política de Tratamiento de Datos
          </h1>
          <PrivacyPolicyContent />
        </div>
      </div>
    </main>
  )
}
