import type { Metadata } from 'next'
import { texts } from '@/lib/translations'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cómo empezar con Controla',
    description: 'En cuatro pasos empiezas a controlar tus gastos e ingresos.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Crea tu cuenta',
        text: 'Regístrate con Google o email en segundos.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Crea o únete a espacios compartidos',
        text: 'Lugares que puedes compartir con familia, roomies o equipo. Todos ven y colaboran en las finanzas del espacio.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Agrega gastos e ingresos',
        text: 'Recurrentes o únicos. Con fechas y categorías.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Sabe cuánto queda',
        text: 'Ve en tiempo real qué pagaste y qué falta por pagar.',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      {children}
    </>
  )
}
