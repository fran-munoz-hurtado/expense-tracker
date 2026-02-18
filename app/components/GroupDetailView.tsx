'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Calendar, User, Receipt } from 'lucide-react'
import { type User as AppUser } from '@/lib/supabase'
import { buildMisCuentasUrl, ROUTES } from '@/lib/routes'
import {
  fetchGroupDetail,
  fetchGroupMembers,
  fetchGroupStats,
  type GroupDetail,
  type GroupMemberInfo,
  type GroupStats
} from '@/lib/services/groupService'
import GroupBadge from './GroupBadge'

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 lg:px-8 py-3 bg-white border-b border-gray-200 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleVolver}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 shrink-0"
            aria-label="Volver a grupos"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base lg:text-lg font-semibold text-gray-dark font-sans truncate">
              {group.name}
            </h2>
            {user && (
              <>
                <div className="lg:hidden">
                  <GroupBadge user={user} variant="light" />
                </div>
                <div className="hidden lg:flex">
                  <GroupBadge user={user} variant="light" />
                </div>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleVerTransacciones}
          className="flex items-center gap-2 px-3 py-2 bg-green-primary text-white rounded-md text-sm font-medium hover:bg-[#5d7760] transition-colors shrink-0"
        >
          <Receipt className="h-4 w-4" />
          Ver transacciones
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 px-4 lg:px-8 pb-6 lg:pb-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Tarjeta: Totales - mismo formato que sección transacciones */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-screen relative left-1/2 -ml-[50vw] lg:w-full lg:left-0 lg:ml-0">
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
            <h3 className="text-sm font-medium text-gray-dark font-sans mb-3">
              Información del grupo
            </h3>
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
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-primary hover:bg-green-50 rounded-md transition-colors w-fit"
                disabled
                title="Próximamente"
              >
                <UserPlus className="h-4 w-4" />
                Invitar miembros
              </button>
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
                          <span className="font-medium text-gray-900">
                            {m.first_name && m.last_name
                              ? `${m.first_name} ${m.last_name}`
                              : m.email || m.user_id}
                          </span>
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
        </div>
      </div>
    </div>
  )
}
