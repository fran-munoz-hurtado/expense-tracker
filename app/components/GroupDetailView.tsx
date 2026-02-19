'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Calendar, User, Receipt, X, LogOut, UserMinus, Trash2 } from 'lucide-react'
import { type User as AppUser } from '@/lib/supabase'
import { buildMisCuentasUrl, ROUTES } from '@/lib/routes'
import {
  fetchGroupDetail,
  fetchGroupMembers,
  fetchGroupStats,
  leaveGroup,
  removeMember,
  deleteGroup,
  type GroupDetail,
  type GroupMemberInfo,
  type GroupStats
} from '@/lib/services/groupService'
import { inviteMember } from '@/lib/services/invitationService'
import { useGroupStore } from '@/lib/store/groupStore'
import { analytics } from '@/lib/analytics'

interface GroupDetailViewProps {
  groupId: string
  user?: AppUser
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending_invitation: 'Invitación pendiente',
  deactivated: 'Desactivado'
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  member: 'Miembro'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
}

export default function GroupDetailView({ groupId, user }: GroupDetailViewProps) {
  const router = useRouter()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [members, setMembers] = useState<GroupMemberInfo[]>([])
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<GroupMemberInfo | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { fetchGroups, setCurrentGroupId } = useGroupStore()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [groupData, membersData, statsData] = await Promise.all([
          fetchGroupDetail(groupId),
          fetchGroupMembers(groupId),
          fetchGroupStats(groupId)
        ])
        if (cancelled) return
        if (!groupData) {
          setError('Grupo no encontrado')
          return
        }
        setGroup(groupData)
        setMembers(membersData)
        setStats(statsData)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [groupId])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleVerTransacciones = () => {
    router.push(buildMisCuentasUrl(currentYear, currentMonth, { grupo: groupId }))
  }

  const handleVolver = () => {
    router.push(ROUTES.misCuentasGrupos)
  }

  const isAdmin = user ? members.some((m) => m.user_id === user.id && m.role === 'admin') : false
  const isMember = user ? members.some((m) => m.user_id === user.id && m.role === 'member') : false
  const isCreator = user && group ? group.created_by === user.id : false

  const handleOpenInvite = () => {
    setShowInviteModal(true)
    setInviteEmail('')
    setInviteError(null)
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !user) return
    setIsInviting(true)
    setInviteError(null)
    const result = await inviteMember(groupId, inviteEmail.trim())
    setIsInviting(false)
    if (result.success) {
      analytics.inviteMember()
      setShowInviteModal(false)
      setInviteEmail('')
      const [groupData, membersData] = await Promise.all([
        fetchGroupDetail(groupId),
        fetchGroupMembers(groupId)
      ])
      if (groupData) setGroup(groupData)
      setMembers(membersData || [])
    } else {
      setInviteError(result.error || 'Error al invitar')
    }
  }

  const handleLeaveClick = () => setShowLeaveConfirm(true)
  const handleLeaveConfirm = async () => {
    setIsLeaving(true)
    const result = await leaveGroup(groupId)
    setIsLeaving(false)
    setShowLeaveConfirm(false)
    if (result.success) {
      await fetchGroups(user!.id)
      setCurrentGroupId(null)
      router.push(ROUTES.misCuentasGrupos)
    }
  }

  const getMemberDisplayName = (m: GroupMemberInfo) =>
    m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.email || m.user_id

  const handleRemoveClick = (m: GroupMemberInfo) => setMemberToRemove(m)
  const handleRemoveConfirm = async () => {
    if (!memberToRemove || !group) return
    setIsRemoving(true)
    const result = await removeMember(groupId, memberToRemove.user_id)
    setIsRemoving(false)
    setMemberToRemove(null)
    if (result.success) {
      const membersData = await fetchGroupMembers(groupId)
      setMembers(membersData || [])
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
    setDeleteError(null)
  }
  const handleDeleteConfirm = async () => {
    if (!group) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteGroup(groupId)
    setIsDeleting(false)
    if (result.success) {
      setShowDeleteConfirm(false)
      await fetchGroups(user!.id)
      setCurrentGroupId(null)
      router.push(ROUTES.misCuentasGrupos)
    } else {
      setDeleteError(result.error || 'Error al eliminar')
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-gray-50">
        <div className="px-4 lg:px-8 py-3 bg-white border-b border-gray-200">
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-primary mx-auto mb-4" />
            <p className="text-sm text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-gray-50">
        <div className="px-4 lg:px-8 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => router.push(ROUTES.misCuentasGrupos)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a grupos
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">{error || 'Grupo no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Barra superior */}
      <div className="px-4 lg:px-8 py-3 bg-white border-b border-gray-200">
        <button
          onClick={handleVolver}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 shrink-0 w-fit"
          aria-label="Volver a grupos"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver</span>
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 px-4 lg:px-8 pb-6 lg:pb-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Tarjeta: Título, Ver transacciones y Resumen financiero */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-screen relative left-1/2 -ml-[50vw] lg:w-full lg:left-0 lg:ml-0">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <h2 className="text-base font-semibold text-gray-dark font-sans">
                {group.name}
              </h2>
              <button
                type="button"
                onClick={handleVerTransacciones}
                className="text-sm text-blue-600 hover:text-blue-800 underline font-medium font-sans"
              >
                Ver transacciones
              </button>
            </div>
            <h3 className="text-sm font-medium text-gray-dark font-sans mb-3">
              Resumen financiero
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-sans bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200 shadow-[0_4px_14px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]">
              <span className="text-gray-500">Ingresos:</span>
              <span className="font-medium text-gray-800 tabular-nums">
                {stats ? formatCurrency(stats.totalIncome) : '—'}
              </span>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span className="text-gray-500">Gastos:</span>
              <span className="font-medium text-gray-800 tabular-nums">
                {stats ? formatCurrency(stats.totalExpense) : '—'}
              </span>
            </div>
          </div>

          {/* Tarjeta: Información del grupo */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-screen relative left-1/2 -ml-[50vw] lg:w-full lg:left-0 lg:ml-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h3 className="text-sm font-medium text-gray-dark font-sans">
                Información del grupo
              </h3>
              {isMember && (
                <button
                  type="button"
                  onClick={handleLeaveClick}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors w-fit"
                >
                  <LogOut className="h-4 w-4" />
                  Salir del grupo
                </button>
              )}
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-500">Creado:</span>
                <span className="font-medium text-gray-900">{formatDate(group.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-500">Creado por:</span>
                <span className="font-medium text-gray-900">{group.creator_name || '—'}</span>
              </div>
            </dl>
          </div>

          {/* Tarjeta: Miembros */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-screen relative left-1/2 -ml-[50vw] lg:w-full lg:left-0 lg:ml-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h3 className="text-sm font-medium text-gray-dark font-sans">
                Miembros
              </h3>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenInvite}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-md transition-colors w-fit"
                >
                  <UserPlus className="h-4 w-4" />
                  Invitar miembros
                </button>
              )}
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No hay miembros en este grupo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Nombre
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Rol
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {getMemberDisplayName(m)}
                            </span>
                            {isAdmin && m.user_id !== user?.id && m.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveClick(m)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                                title="Sacar del grupo"
                                aria-label={`Sacar a ${getMemberDisplayName(m)} del grupo`}
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {ROLE_LABELS[m.role] || m.role}
                        </td>
                        <td className="px-2 py-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {STATUS_LABELS[m.status] || m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Botón Eliminar espacio (solo creador) */}
          {isCreator && (
            <div className="bg-white rounded-xl shadow-sm p-4 w-screen relative left-1/2 -ml-[50vw] lg:w-full lg:left-0 lg:ml-0">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors w-full justify-center border border-red-200"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar este espacio
              </button>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setShowInviteModal(false)}
          />
          <section
            className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 z-10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <form onSubmit={handleInviteSubmit} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-sky-50 rounded-full p-1.5">
                  <UserPlus className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 font-sans">Invitar miembro</h2>
                  <p className="text-sm text-gray-500 font-sans">
                    Introduce el correo de la persona (debe estar registrada)
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 font-sans mb-1">
                  Correo electrónico
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm placeholder-gray-400"
                />
              </div>
              {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50 font-sans"
                >
                  {isInviting ? 'Enviando...' : 'Invitar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => !isLeaving && setShowLeaveConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 font-sans mb-2">¿Estás seguro?</h3>
            <p className="text-sm text-gray-600 font-sans mb-4">
              Al salir del grupo dejarás de ver sus transacciones y no podrás volver a entrar
              a menos que te inviten de nuevo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={isLeaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-sans disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLeaveConfirm}
                disabled={isLeaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 font-sans disabled:opacity-50"
              >
                {isLeaving ? 'Saliendo...' : 'Sí, salir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {memberToRemove && group && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => !isRemoving && setMemberToRemove(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 font-sans mb-2">¿Estás seguro?</h3>
            <p className="text-sm text-gray-600 font-sans mb-4">
              ¿Estás seguro que quieres sacar a <strong>{getMemberDisplayName(memberToRemove)}</strong> del grupo <strong>{group.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-sans disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRemoveConfirm}
                disabled={isRemoving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 font-sans disabled:opacity-50"
              >
                {isRemoving ? 'Sacando...' : 'Sí, sacar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && group && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 font-sans mb-2">¿Estás seguro?</h3>
            <p className="text-sm text-gray-600 font-sans mb-4">
              ¿Estás seguro que quieres eliminar el espacio <strong>{group.name}</strong>? Si aceptas, se borrarán todas las transacciones, adjuntos, abonos e información del espacio, y los miembros dejarán de tener acceso.
            </p>
            {deleteError && <p className="text-sm text-red-600 font-sans mb-4">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-sans disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 font-sans disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
