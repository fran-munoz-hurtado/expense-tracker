'use client'

import React, { useState } from 'react'
import { X, Paperclip } from 'lucide-react'
import { type User, type Transaction, type TransactionAttachment } from '@/lib/supabase'
import { fetchAttachmentCounts } from '@/lib/dataUtils'
import { useDataSync } from '@/lib/hooks/useDataSync'
import FileUploadModal from '@/components/FileUploadModal'
import TransactionAttachments from '@/components/TransactionAttachments'

interface AttachmentClipProps {
  transaction: Transaction
  className?: string
}

export function useAttachments(user: User) {
  const { refreshData } = useDataSync()
  
  // Attachment states
  const [attachmentCounts, setAttachmentCounts] = useState<Record<number, number>>({})
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedTransactionForAttachment, setSelectedTransactionForAttachment] = useState<Transaction | null>(null)
  const [showAttachmentsList, setShowAttachmentsList] = useState(false)
  const [selectedTransactionForList, setSelectedTransactionForList] = useState<Transaction | null>(null)

  // Load attachment counts for a list of transactions
  const loadAttachmentCounts = async (transactions: Transaction[]) => {
    if (transactions && transactions.length > 0) {
      const transactionIds = transactions.map((t: Transaction) => t.id)
      const attachmentCountsData = await fetchAttachmentCounts(user, transactionIds)
      setAttachmentCounts(attachmentCountsData)
    }
  }

  // Handlers
  const handleAttachmentUpload = (transaction: Transaction) => {
    setSelectedTransactionForAttachment(transaction)
    setShowAttachmentModal(true)
    // Close the attachments list modal if it's open
    setShowAttachmentsList(false)
  }

  const handleAttachmentList = (transaction: Transaction) => {
    setSelectedTransactionForList(transaction)
    setShowAttachmentsList(true)
  }

  const handleAttachmentUploadComplete = (attachment: TransactionAttachment) => {
    // Update attachment counts
    setAttachmentCounts(prev => ({
      ...prev,
      [attachment.transaction_id]: (prev[attachment.transaction_id] || 0) + 1
    }))
    
    // Reopen the attachments list modal to show the updated list
    if (selectedTransactionForAttachment) {
      setSelectedTransactionForList(selectedTransactionForAttachment)
      setShowAttachmentsList(true)
    }
    
    console.log('Attachment uploaded:', attachment)
  }

  const handleAttachmentDeleted = (attachmentId: number) => {
    // This will be handled by the TransactionAttachments component
    // We just need to refresh the attachment counts
    console.log('Attachment deleted:', attachmentId)
  }

  // Attachment clip component
  const AttachmentClip = ({ transaction, className = "" }: AttachmentClipProps) => {
    return (
      <button
        onClick={() => handleAttachmentList(transaction)}
        className={`text-gray-600 hover:text-gray-800 relative flex items-center justify-center ${className}`}
        title="Ver archivos adjuntos"
      >
        <Paperclip className="h-4 w-4" />
        {attachmentCounts[transaction.id] > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-warning-bg text-gray-700 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-normal">
            {attachmentCounts[transaction.id] > 9 ? '9+' : attachmentCounts[transaction.id]}
          </span>
        )}
      </button>
    )
  }

  // Modals component
  const AttachmentModals = () => {
    return (
      <>
        {/* File Upload Modal */}
        {showAttachmentModal && selectedTransactionForAttachment && (
          <FileUploadModal
            isOpen={showAttachmentModal}
            onClose={() => {
              setShowAttachmentModal(false)
              setSelectedTransactionForAttachment(null)
            }}
            transactionId={selectedTransactionForAttachment.id}
            userId={user.id}
            onUploadComplete={handleAttachmentUploadComplete}
          />
        )}

        {/* Attachments List Modal */}
        {showAttachmentsList && selectedTransactionForList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay borroso y semitransparente */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all" aria-hidden="true"></div>
            <section className="relative bg-white rounded-xl p-0 w-full max-w-md shadow-sm border border-gray-200 flex flex-col items-stretch max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowAttachmentsList(false)
                  setSelectedTransactionForList(null)
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-light rounded-full">
                    <Paperclip className="h-4 w-4 text-green-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Archivos Adjuntos</h2>
                    <p className="text-sm text-gray-500">Para: {selectedTransactionForList.description}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <TransactionAttachments
                    transactionId={selectedTransactionForList.id}
                    userId={user.id}
                    onAttachmentDeleted={handleAttachmentDeleted}
                    onAddAttachment={() => handleAttachmentUpload(selectedTransactionForList)}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </>
    )
  }

  return {
    attachmentCounts,
    loadAttachmentCounts,
    handleAttachmentUpload,
    handleAttachmentList,
    handleAttachmentUploadComplete,
    handleAttachmentDeleted,
    AttachmentClip,
    AttachmentModals
  }
} 