'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, File, Trash2, Eye, Download } from 'lucide-react'
import { supabase, type TransactionAttachment, type FileUploadResponse } from '@/lib/supabase'
import { texts } from '@/lib/translations'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  transactionId: number
  userId: number
  onUploadComplete: (attachment: TransactionAttachment) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

export default function FileUploadModal({ 
  isOpen, 
  onClose, 
  transactionId, 
  userId, 
  onUploadComplete 
}: FileUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [])

  const handleFileSelect = (file: File) => {
    setError(null)
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(texts.files.unsupportedFileType)
      return
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(texts.files.fileTooLarge)
      return
    }
    
    setSelectedFile(file)
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    setError(null)
    
    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${userId}/${transactionId}/${fileName}`
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('transaction-attachments')
        .upload(filePath, selectedFile)
      
      if (uploadError) {
        throw new Error(`${texts.files.uploadFailed}: ${uploadError.message}`)
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('transaction-attachments')
        .getPublicUrl(filePath)
      
      // Save attachment metadata to database
      const attachmentData = {
        transaction_id: transactionId,
        user_id: userId,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        file_type: fileExt || '',
        mime_type: selectedFile.type,
        description: description || null
      }
      
      const { data: attachment, error: dbError } = await supabase
        .from('transaction_attachments')
        .insert([attachmentData])
        .select()
        .single()
      
      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from('transaction-attachments')
          .remove([filePath])
        throw new Error(`${texts.files.databaseError}: ${dbError.message}`)
      }
      
      // Success
      onUploadComplete(attachment)
      handleClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.files.uploadFailed)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setPreview(null)
    setDescription('')
    setError(null)
    setIsDragging(false)
    onClose()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-6 w-6 text-green-primary" />
    if (fileType === 'application/pdf') return <FileText className="h-6 w-6 text-green-primary" />
    return <File className="h-6 w-6 text-green-primary" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay borroso y semitransparente */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
      <section className="relative bg-white rounded-xl p-0 w-full max-w-md shadow-sm border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full">
              <Upload className="h-4 w-4 text-green-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">Subir Archivo</h2>
              <p className="text-sm text-gray-500">Adjunta documentos a esta transacción</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            {!selectedFile ? (
              // File selection area
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging 
                    ? 'border-green-primary bg-green-light' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 text-green-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Arrastra y suelta tu archivo aquí
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  Soporta JPG, PNG, PDF, Word, Excel
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Tamaño máximo: 10MB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-primary hover:bg-green-dark text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
                >
                  Seleccionar Archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              // File preview and upload
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(selectedFile.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {preview && (
                    <div className="mt-3">
                      <img 
                        src={preview} 
                        alt="Vista previa" 
                        className="max-w-full max-h-32 rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el contenido del archivo..."
                    className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 bg-white focus:border-green-primary focus:ring-2 focus:ring-green-light transition-all placeholder-gray-400"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-500 text-xs">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-green-primary hover:bg-green-dark text-white rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Subiendo...
                      </div>
                    ) : (
                      'Subir Archivo'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
} 