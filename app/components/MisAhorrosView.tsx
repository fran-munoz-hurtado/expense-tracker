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
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Mis ahorros</h1>
          <p className="text-muted-foreground text-sm">
            Revisa y organiza aquí tus transacciones de ahorro
          </p>

          {/* Aquí se irá agregando el contenido en siguientes pasos */}
        </div>
      </div>
    </div>
  )
} 