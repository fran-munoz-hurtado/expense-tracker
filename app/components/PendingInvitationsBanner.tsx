'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, X, Check } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { fetchPendingInvitations, acceptInvitationByGroupId, rejectInvitation } from '@/lib/services/invitationService'
import type { PendingInvitation } from '@/lib/services/invitationService'
import { useGroupStore } from '@/lib/store/groupStore'
import { ROUTES } from '@/lib/routes'

interface PendingInvitationsBannerProps {
  user: User
}

export default function PendingInvitationsBanner({ user }: PendingInvitationsBannerProps) {
  const router = useRouter()
  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [actionGroupId, setActionGroupId] = useState<string | null>(null)
  const [showRejectConfirm, setShowRejectConfirm] = useState<PendingInvitation | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      const list = await fetchPendingInvitations(user.id)
      if (!cancelled) setInvitations(list)
      if (!cancelled) setIsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const handleAccept = async (inv: PendingInvitation) => {
    setActionGroupId(inv.group_id)
    const result = await acceptInvitationByGroupId(inv.group_id)
    setActionGroupId(null)
    if (result.success) {
      setInvitations((prev) => prev.filter((i) => i.group_id !== inv.group_id))
      await fetchGroups(user.id)
      router.push(ROUTES.misCuentasGrupoDetail(inv.group_id))
    }
  }

  const handleRejectClick = (inv: PendingInvitation) => {
    setShowRejectConfirm(inv)
  }

  const handleRejectConfirm = async () => {
    if (!showRejectConfirm) return
    const inv = showRejectConfirm
    setShowRejectConfirm(null)
    setActionGroupId(inv.group_id)
    const result = await rejectInvitation(inv.group_id)
    setActionGroupId(null)
    if (result.success) {
      setInvitations((prev) => prev.filter((i) => i.group_id !== inv.group_id))
    }
  }

  const handleDismiss = () => setDismissed(true)

  if (isLoading || invitations.length === 0 || dismissed) return null

  return (
    <>
      <div className="bg-red-900 border-b border-red-800 px-3 py-2">
        <div className="max-w-2xl mx-auto sm:mx-0">
          {/* Flex: icono, texto, botones pegados. Texto min-w-0 para truncar. Botones tamaño texto */}
          <div className="flex items-center gap-2 min-w-0 py-1.5">
            <Users className="h-4 w-4 text-white/90 shrink-0" />
            <span className="block m-0 py-0 text-sm font-medium text-white font-sans truncate min-w-0 min-h-[1.5em] leading-[1.5em]">
              {invitations.length === 1
                ? `Has sido invitado al grupo "${invitations[0].group_name}"`
                : `Tienes ${invitations.length} invitaciones pendientes`}
            </span>
            {invitations.map((inv) => (
              <div key={inv.group_id} className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAccept(inv)}
                  disabled={actionGroupId !== null}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors touch-manipulation p-0"
                  aria-label="Aceptar"
                >
                  <Check className="h-4 w-4 stroke-[2.5] flex-shrink-0" />
                </button>
                <button
                  onClick={() => handleRejectClick(inv)}
                  disabled={actionGroupId !== null}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors touch-manipulation p-0"
                  aria-label="Rechazar"
                >
                  <X className="h-4 w-4 stroke-[2.5] flex-shrink-0" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showRejectConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            aria-hidden="true"
            onClick={() => setShowRejectConfirm(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 font-sans mb-2">¿Estás seguro?</h3>
            <p className="text-sm text-gray-600 font-sans mb-4">
              Si rechazas la invitación a &quot;{showRejectConfirm.group_name}&quot;, dejarás de verla y tendrías que
              ser invitado de nuevo para unirte.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 font-sans"
              >
                Sí, rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
