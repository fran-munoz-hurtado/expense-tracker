'use client'

import { type User } from '@/lib/supabase'

interface MisAhorrosViewProps {
  user: User
  navigationParams?: any
}

export default function MisAhorrosView({ user, navigationParams }: MisAhorrosViewProps) {
  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark">Mis ahorros</h2>
          <p className="text-sm text-green-dark">Revisa y organiza aquí tus transacciones de ahorro</p>
        </div>

        {/* Aquí se irá agregando el contenido en siguientes pasos */}
      </div>
    </div>
  )
} 