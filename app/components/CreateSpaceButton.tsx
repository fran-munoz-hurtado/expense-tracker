'use client'

import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { useGroupStore } from '@/lib/store/groupStore'

interface CreateSpaceButtonProps {
  user: User
  onSuccess?: () => void
  className?: string
}

const BTN_CLASSES =
  'inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-b from-sky-600 to-sky-700 text-white rounded-lg font-medium text-sm font-sans border border-sky-700/50 shadow-[0_4px_14px_rgba(2,132,199,0.35),0_2px_6px_rgba(0,0,0,0.08)] hover:from-sky-700 hover:to-sky-800 hover:shadow-[0_6px_20px_rgba(2,132,199,0.4),0_3px_8px_rgba(0,0,0,0.12)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] active:scale-[0.99] transition-all duration-200'

export default function CreateSpaceButton({ user, onSuccess, className }: CreateSpaceButtonProps) {
  const { createGroup } = useGroupStore()
  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleOpen = () => {
    setShowModal(true)
    setNewGroupName('')
    setError(null)
  }

  const handleClose = () => {
    setShowModal(false)
    setNewGroupName('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setIsCreating(true)
    setError(null)
    const result = await createGroup(user.id, newGroupName.trim())
    setIsCreating(false)
    if (result.success) {
      handleClose()
      onSuccess?.()
    } else {
      setError(result.error || 'Error al crear')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className ?? BTN_CLASSES}
        aria-label="Crea tu espacio"
      >
        <Users className="h-4 w-4" />
        Crea tu espacio
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" onClick={handleClose} />
          <section
            className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 z-10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-sky-50 rounded-full p-1.5">
                  <Users className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 font-sans">Crear espacio</h2>
                  <p className="text-sm text-gray-500 font-sans">Comparte finanzas con familia o equipo</p>
                </div>
              </div>
              <div>
                <label htmlFor="create-space-name" className="block text-sm font-medium text-gray-700 font-sans mb-1">
                  Nombre del espacio
                </label>
                <input
                  id="create-space-name"
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej: Familia Cardona, Gastos mamá"
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm placeholder-gray-400"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newGroupName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50 font-sans transition-colors"
                >
                  {isCreating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
