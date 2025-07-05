'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, File, Trash2, Eye, Download } from 'lucide-react'
import { supabase, type TransactionAttachment, type FileUploadResponse } from '@/lib/supabase'

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
      setError('File type not supported. Please upload images (JPEG, PNG, GIF, WebP), PDFs, or Office documents.')
      return
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size too large. Maximum size is 10MB.')
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
        throw new Error(`Upload failed: ${uploadError.message}`)
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
        throw new Error(`Database error: ${dbError.message}`)
      }
      
      // Success
      onUploadComplete(attachment)
      handleClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
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
    if (fileType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />
    if (fileType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />
    return <File className="h-8 w-8 text-gray-500" />
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Upload Payment Proof</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!selectedFile ? (
          // File selection area
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your file here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: Images (JPEG, PNG, GIF, WebP), PDF, Word, Excel
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Maximum file size: 10MB
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Choose File
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
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedFile.type)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              
              {preview && (
                <div className="mt-4">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="max-w-full max-h-48 rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Receipt, Invoice, Bank statement"
                className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 