'use client'

import { useState, useEffect } from 'react'
import { Paperclip, Eye, Download, Trash2, X, FileText, Image, File } from 'lucide-react'
import { supabase, type TransactionAttachment } from '@/lib/supabase'
import { texts } from '@/lib/translations'

interface TransactionAttachmentsProps {
  transactionId: number
  userId: string // UUID
  groupId?: string | null // cuando es transacción de grupo, no filtrar por user_id
  onAttachmentChange?: () => void
  onAttachmentDeleted?: (attachmentId: number) => void
  onAddAttachment?: () => void
}

export default function TransactionAttachments({ 
  transactionId, 
  userId, 
  groupId,
  onAttachmentDeleted,
  onAddAttachment
}: TransactionAttachmentsProps) {
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<TransactionAttachment | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<TransactionAttachment | null>(null)

  useEffect(() => {
    loadAttachments()
  }, [transactionId, groupId])

  const loadAttachments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase.from('transaction_attachments').select('*').eq('transaction_id', transactionId)
      if (!groupId) query = query.eq('user_id', userId)
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setAttachments(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar archivos adjuntos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (attachment: TransactionAttachment) => {
    setAttachmentToDelete(attachment)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!attachmentToDelete) return

    setDeleting(attachmentToDelete.id)
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('transaction-attachments')
        .remove([attachmentToDelete.file_path])
      
      if (storageError) {
        throw new Error(`Error de almacenamiento: ${storageError.message}`)
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('id', attachmentToDelete.id)
      
      if (dbError) {
        throw new Error(`Error de base de datos: ${dbError.message}`)
      }
      
      // Update local state
      setAttachments(prev => prev.filter(a => a.id !== attachmentToDelete.id))
      onAttachmentDeleted?.(attachmentToDelete.id)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar archivo adjunto')
    } finally {
      setDeleting(null)
      setShowDeleteModal(false)
      setAttachmentToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setAttachmentToDelete(null)
  }

  const handleDownload = async (attachment: TransactionAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('transaction-attachments')
        .download(attachment.file_path)
      
      if (error) {
        throw error
      }
      
      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar archivo')
    }
  }

  const handlePreview = async (attachment: TransactionAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('transaction-attachments')
        .download(attachment.file_path)
      
      if (error) {
        throw error
      }
      
      // For images, create object URL for preview
      if (attachment.mime_type.startsWith('image/')) {
        const url = URL.createObjectURL(data)
        setPreviewAttachment({ ...attachment, file_path: url })
      } else {
        // For other files, trigger download
        handleDownload(attachment)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al previsualizar archivo')
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-green-primary" />
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-green-primary" />
    return <File className="h-5 w-5 text-green-primary" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-3 text-center text-sm text-gray-500">
        Cargando archivos...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-red-500 text-xs">{error}</p>
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <>
        <div className="p-3 text-center text-gray-500">
          <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full mx-auto mb-2">
            <Paperclip className="h-4 w-4 text-green-primary" />
          </div>
          <p className="text-sm font-normal">No hay archivos adjuntos para esta transacción</p>
        </div>
        
        {/* Add Files Button */}
        {onAddAttachment && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-center">
            <button
              onClick={onAddAttachment}
              className="bg-green-primary hover:bg-green-dark text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Agregar archivos
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {getFileIcon(attachment.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {attachment.file_name}
                </p>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>{formatDate(attachment.uploaded_at)}</span>
                  {attachment.description && (
                    <span className="italic truncate">"{attachment.description}"</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePreview(attachment)}
                className="p-1.5 text-gray-400 hover:text-green-primary transition-colors rounded-md hover:bg-green-light"
                title="Ver archivo"
              >
                <Eye className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => handleDownload(attachment)}
                className="p-1.5 text-gray-400 hover:text-green-primary transition-colors rounded-md hover:bg-green-light"
                title="Descargar archivo"
              >
                <Download className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => handleDelete(attachment)}
                disabled={deleting === attachment.id}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50 disabled:opacity-50"
                title="Eliminar archivo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Files Button */}
      {onAddAttachment && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-center">
          <button
            onClick={onAddAttachment}
            className="bg-green-primary hover:bg-green-dark text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Agregar archivos
          </button>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewAttachment && previewAttachment.mime_type.startsWith('image/') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative max-w-4xl max-h-[90vh] p-4 bg-white rounded-xl shadow-2xl border border-gray-200">
            <button
              onClick={() => {
                setPreviewAttachment(null)
                URL.revokeObjectURL(previewAttachment.file_path)
              }}
              className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-sm text-white rounded-full hover:bg-black/40 transition-all shadow-md"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col items-center gap-4">
              <img
                src={previewAttachment.file_path}
                alt={previewAttachment.file_name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-gray-200"
              />
              <div className="text-center bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="font-medium text-gray-900 mb-1">{previewAttachment.file_name}</p>
                {previewAttachment.description && (
                  <p className="text-sm text-gray-600 italic">"{previewAttachment.description}"</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && attachmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay borroso y semitransparente */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
          <section className="relative bg-white rounded-xl p-0 w-full max-w-sm shadow-2xl border border-gray-200 flex flex-col items-stretch">
            <button
              onClick={handleCancelDelete}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-5 flex flex-col gap-4 items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-2">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Confirmar Eliminación</h2>
              <p className="text-gray-700 text-sm font-medium mb-4 text-center">¿Estás seguro de que quieres eliminar este archivo?</p>
              
              {/* Información del archivo */}
              <div className="w-full bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {getFileIcon(attachmentToDelete.mime_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Archivo:</span>
                      <span className="text-sm text-gray-900 font-semibold truncate ml-2">{attachmentToDelete.file_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Tamaño:</span>
                      <span className="text-sm text-gray-900 font-semibold">{formatFileSize(attachmentToDelete.file_size)}</span>
                    </div>
                    {attachmentToDelete.description && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Descripción:</span>
                        <span className="text-sm text-gray-900 font-semibold truncate ml-2">"{attachmentToDelete.description}"</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-red-800 font-medium">Esta acción no se puede deshacer</p>
                    <p className="text-xs text-red-700 mt-1">El archivo se eliminará permanentemente</p>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="w-full space-y-3">
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting === attachmentToDelete.id}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting === attachmentToDelete.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Eliminando...
                    </div>
                  ) : (
                    'Eliminar Archivo'
                  )}
                </button>
                
                <button
                  onClick={handleCancelDelete}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
} 