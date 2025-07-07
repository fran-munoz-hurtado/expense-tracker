'use client'

import { useState, useEffect } from 'react'
import { Paperclip, Eye, Download, Trash2, X, FileText, Image, File } from 'lucide-react'
import { supabase, type TransactionAttachment } from '@/lib/supabase'
import { texts } from '@/lib/translations'

interface TransactionAttachmentsProps {
  transactionId: number
  userId: number
  onAttachmentDeleted?: (attachmentId: number) => void
}

export default function TransactionAttachments({ 
  transactionId, 
  userId, 
  onAttachmentDeleted 
}: TransactionAttachmentsProps) {
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<TransactionAttachment | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    loadAttachments()
  }, [transactionId])

  const loadAttachments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('transaction_attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
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
    if (!confirm(`¿Estás seguro de que quieres eliminar "${attachment.file_name}"?`)) {
      return
    }
    
    setDeleting(attachment.id)
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('transaction-attachments')
        .remove([attachment.file_path])
      
      if (storageError) {
        throw new Error(`Error de almacenamiento: ${storageError.message}`)
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('id', attachment.id)
      
      if (dbError) {
        throw new Error(`Error de base de datos: ${dbError.message}`)
      }
      
      // Update local state
      setAttachments(prev => prev.filter(a => a.id !== attachment.id))
      onAttachmentDeleted?.(attachment.id)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar archivo adjunto')
    } finally {
      setDeleting(null)
    }
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
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
    return <File className="h-4 w-4 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        {texts.loading}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>{texts.empty.noAttachments}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {getFileIcon(attachment.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {attachment.file_name}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>{formatDate(attachment.uploaded_at)}</span>
                  {attachment.description && (
                    <span className="italic">"{attachment.description}"</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePreview(attachment)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={texts.files.viewFile}
              >
                <Eye className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => handleDownload(attachment)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={texts.files.downloadFile}
              >
                <Download className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => handleDelete(attachment)}
                disabled={deleting === attachment.id}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title={texts.delete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewAttachment && previewAttachment.mime_type.startsWith('image/') && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => {
                setPreviewAttachment(null)
                URL.revokeObjectURL(previewAttachment.file_path)
              }}
              className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewAttachment.file_path}
              alt={previewAttachment.file_name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="mt-2 text-center text-white">
              <p className="font-medium">{previewAttachment.file_name}</p>
              {previewAttachment.description && (
                <p className="text-sm opacity-75">{previewAttachment.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 