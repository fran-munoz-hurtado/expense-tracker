import type { Metadata } from 'next'
import Link from 'next/link'
import { texts } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'Cómo funciona',
  description: 'Aprende a usar Controla en cuatro pasos. Crea tu cuenta, comparte espacios con familia o equipo, agrega gastos e ingresos y sabe cuánto te queda cada mes.',
  openGraph: {
    title: 'Cómo funciona | Controla',
    description: 'Aprende a usar Controla: control de gastos, espacios compartidos, presupuesto mensual.',
  },
  alternates: {
    canonical: '/como-funciona',
  },
}

const faqs = [
  {
    q: '¿Cómo empiezo con Controla?',
    a: 'Crea tu cuenta con Google o email en segundos. Luego crea o únete a un espacio (personal, con pareja, roomies o equipo) y empieza a agregar gastos e ingresos. En tiempo real verás cuánto te queda por pagar.',
  },
  {
    q: '¿Qué son los espacios compartidos?',
    a: 'Son lugares que puedes compartir con familia, roomies o equipo. Todos los miembros ven las finanzas del espacio y pueden agregar o editar transacciones. Ideal para casa compartida, finanzas en pareja o proyectos.',
  },
  {
    q: '¿Es gratis?',
    a: 'Sí. Puedes empezar gratis, sin tarjeta de crédito. Controla está pensado para que organices tus finanzas sin complicaciones.',
  },
  {
    q: '¿Puedo tener gastos recurrentes y únicos?',
    a: 'Sí. Gastos recurrentes (alquiler, servicios) y gastos únicos (compras puntuales). También ingresos, objetivos y ahorros. Todo organizado por mes y año.',
  },
]

export default function ComoFuncionaPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  }

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">
            ← Volver a inicio
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-6">
            Cómo funciona {texts.appTitle}
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            En cuatro pasos simples empiezas a tener el control de tus finanzas.
          </p>

          <ol className="space-y-8 mb-16">
            <li>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Crea tu cuenta</h2>
              <p className="text-gray-600">Regístrate con Google o email en segundos. Sin complicaciones.</p>
            </li>
            <li>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Crea o únete a espacios compartidos</h2>
              <p className="text-gray-600 mb-2">
                Espacios son lugares que puedes compartir con familia, roomies o equipo. Todos ven y colaboran en las finanzas del hogar o proyecto.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                <li>Casa o apartamento compartido</li>
                <li>Finanzas en pareja</li>
                <li>Proyectos o equipos</li>
              </ul>
            </li>
            <li>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Agrega gastos e ingresos</h2>
              <p className="text-gray-600">Recurrentes o únicos. Con fechas, categorías y plazos de pago.</p>
            </li>
            <li>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Sabe cuánto queda</h2>
              <p className="text-gray-600">Ve en tiempo real qué pagaste y qué falta por pagar. Organizado por mes.</p>
            </li>
          </ol>

          <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
            Preguntas frecuentes
          </h2>
          <dl className="space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <dt className="text-lg font-semibold text-gray-900">{q}</dt>
                <dd className="mt-2 text-gray-600">{a}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}
            >
              Empezar gratis
            </Link>
          </div>
        </div>
    </main>
  )
}
