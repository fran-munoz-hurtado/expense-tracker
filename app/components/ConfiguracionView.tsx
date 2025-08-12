'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Shield, HelpCircle, AlertTriangle, X } from 'lucide-react'
import { type User as UserType } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { clearUserCache } from '@/lib/dataUtils'
import { useDataSync } from '@/lib/hooks/useDataSync'
import { texts } from '@/lib/translations'
import React from 'react'

interface ConfiguracionViewProps {
  user: UserType
  navigationParams?: any
}

export default function ConfiguracionView({ user, navigationParams }: ConfiguracionViewProps) {
  const { refreshData } = useDataSync()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleDeleteAllData = async () => {
    setIsDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Consultar transaction_attachments para obtener todos los file_path del usuario
      const { data: attachments, error: attachmentsError } = await supabase
        .from('transaction_attachments')
        .select('file_path')
        .eq('user_id', user.id)

      if (attachmentsError) {
        throw new Error(`Error consultando archivos adjuntos: ${attachmentsError.message}`)
      }

      // 2. Eliminar archivos físicos del bucket de Supabase Storage
      if (attachments && attachments.length > 0) {
        const filePaths = attachments.map(att => att.file_path)
        const { error: storageError } = await supabase.storage
          .from('transaction-attachments')
          .remove(filePaths)

        if (storageError) {
          console.warn('Error eliminando archivos del storage:', storageError)
          // Continuamos con la eliminación de datos aunque falle el storage
        }
      }

      // 3. Eliminar todos los registros de transaction_attachments del usuario
      const { error: attachmentDeleteError } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('user_id', user.id)

      if (attachmentDeleteError) {
        throw new Error(`Error eliminando registros de archivos adjuntos: ${attachmentDeleteError.message}`)
      }

      // 4. Eliminar directamente todas las transactions del usuario (no confiar en triggers)
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)

      if (transactionsError) {
        throw new Error(`Error eliminando transacciones: ${transactionsError.message}`)
      }

      // 5. Eliminar todas las entradas de non_recurrent_expenses del usuario
      const { error: nonRecurrentError } = await supabase
        .from('non_recurrent_expenses')
        .delete()
        .eq('user_id', user.id)

      if (nonRecurrentError) {
        throw new Error(`Error eliminando gastos únicos: ${nonRecurrentError.message}`)
      }

      // 6. Eliminar todas las entradas de recurrent_expenses del usuario
      const { error: recurrentError } = await supabase
        .from('recurrent_expenses')
        .delete()
        .eq('user_id', user.id)

      if (recurrentError) {
        throw new Error(`Error eliminando gastos recurrentes: ${recurrentError.message}`)
      }

      // 7. Sincronización global para actualizar todas las vistas inmediatamente
      clearUserCache(user.id)
      refreshData(user.id, 'delete_all_data')

      setSuccess('Todas las transacciones y archivos han sido eliminados exitosamente')
      setShowDeleteModal(false)

    } catch (err) {
      console.error('Error eliminando datos:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar los datos')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteModal = () => {
    setError(null)
    setSuccess(null)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false)
    }
  }
  
  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark font-sans">Configuración</h2>
          <p className="text-sm text-green-dark font-sans">Gestiona tu cuenta, tus datos y herramientas avanzadas desde aquí.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Mensajes de éxito o error */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-800 font-sans">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 font-sans">{error}</p>
            </div>
          )}
          
          {/* Primera sección - Reset de cuenta */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-full">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Reset de cuenta
              </h3>
              <p className="text-xs text-gray-500 font-sans mb-4">
                Elimina todas tus transacciones y archivos. Esta acción no se puede deshacer.
              </p>
              
              <button
                onClick={openDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-sans text-sm"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar todas mis transacciones'}
              </button>
            </div>
          </div>

          {/* Segunda sección */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-full">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Título sección 2
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Contenido en desarrollo
              </p>
            </div>
          </div>

          {/* Tercera sección */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-full">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Título sección 3
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Contenido en desarrollo
              </p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Modal de confirmación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-dark font-sans">¿Estás seguro?</h2>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 font-sans mb-4">
                Esta acción eliminará permanentemente todas tus transacciones y archivos. No se puede revertir.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-red-800 font-medium">Esta acción no se puede deshacer</p>
                    <p className="text-xs text-red-700 mt-1">Se eliminarán todas las transacciones, gastos recurrentes, gastos únicos y archivos adjuntos</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAllData}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 