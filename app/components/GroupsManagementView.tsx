'use client'

import { useRouter } from 'next/navigation'
import { Users, ChevronRight } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { useGroupStore, type Group } from '@/lib/store/groupStore'
import { ROUTES } from '@/lib/routes'
import CreateSpaceButton from './CreateSpaceButton'

interface GroupsManagementViewProps {
  user?: User
}

export default function GroupsManagementView({ user }: GroupsManagementViewProps) {
  const router = useRouter()
  const { groups, currentGroupId, isLoading } = useGroupStore()

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const handleGroupClick = (g: Group) => {
    router.push(ROUTES.misCuentasGrupoDetail(g.id))
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Barra superior - misma estructura que DashboardView */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 lg:px-8 py-3 bg-white border-b border-gray-200 gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:flex-wrap gap-3 lg:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <h2 className="text-base lg:text-lg font-semibold text-gray-dark font-sans">Gestión de grupos</h2>
          </div>
        </div>
        {user && <CreateSpaceButton user={user} />}
      </div>

      {/* Main Content - mismo canvas que transacciones */}
      <div className="flex-1 px-4 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 w-screen relative left-1/2 -ml-[50vw] lg:w-full lg:left-0 lg:ml-0">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Tus grupos
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Grupos en los que participas. Haz clic en Ver para ver el detalle del grupo.
              </p>
            </div>
            {isLoading ? (
              <div className="text-center py-8 text-green-dark font-sans">Cargando...</div>
            ) : groups.length === 0 ? (
              <div className="text-center px-4 py-8">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-green-primary" />
                </div>
                <h3 className="text-base font-medium text-gray-500 mb-2 font-sans opacity-80">
                  No perteneces a ningún grupo aún
                </h3>
                <p className="text-sm text-gray-400 font-sans opacity-60 mb-6">
                  Crea un grupo o pide que te inviten para compartir finanzas
                </p>
                {user && <CreateSpaceButton user={user} />}
              </div>
            ) : (
              <>
                {/* Desktop Table - misma estructura que transacciones */}
                <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-fixed">
                      <colgroup>
                        <col className="w-[47%]" />
                        <col className="w-[90px]" />
                        <col className="w-[59px]" />
                      </colgroup>
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-sans border-r border-dashed border-gray-300 bg-gray-50">
                            Nombre
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-sans w-[90px] border-r border-dashed border-gray-300">
                            Creado
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-sans w-[59px]">
                            Ver
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {groups.map((g) => (
                          <tr
                            key={g.id}
                            onClick={() => handleGroupClick(g)}
                            className="group/row bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 cursor-pointer"
                          >
                            <td className="px-2 py-2 max-w-0 border-r border-dashed border-gray-300 overflow-visible">
                              <div className="flex items-center gap-2 min-w-0 min-h-[52px]">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-light flex items-center justify-center">
                                  <Users className="h-4 w-4 text-green-primary" />
                                </div>
                                <span className="text-sm font-medium text-gray-900 truncate font-sans" title={g.name}>
                                  {g.name}
                                </span>
                                {g.id === currentGroupId && (
                                  <span className="text-xs font-medium text-green-primary bg-green-light px-2 py-0.5 rounded-full flex-shrink-0">
                                    Activo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center text-sm text-gray-600 font-sans border-r border-dashed border-gray-300">
                              {formatDate(g.created_at)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <ChevronRight className="h-4 w-4 text-gray-400 mx-auto group-hover/row:text-green-primary transition-colors" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Table - misma estructura que transacciones */}
                <div className="lg:hidden overflow-x-auto">
                  <table className="min-w-0 w-full max-w-full text-xs table-fixed">
                    <colgroup>
                      <col className="w-[128px]" />
                      <col className="w-[126px]" />
                      <col className="w-[70px]" />
                    </colgroup>
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="pl-1.5 pr-1.5 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider font-sans border-r border-dashed border-gray-300 bg-gray-50 w-[128px]">
                          Nombre
                        </th>
                        <th className="pl-1 pr-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider font-sans w-[126px] border-r border-dashed border-gray-300">
                          Creado
                        </th>
                        <th className="px-0.5 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider font-sans">
                          Ver
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {groups.map((g) => (
                        <tr
                          key={g.id}
                          onClick={() => handleGroupClick(g)}
                          className="border-b border-gray-100 cursor-pointer active:bg-gray-100"
                        >
                          <td className="px-1.5 py-1.5 w-[128px] border-r border-dashed border-gray-300">
                            <div className="flex items-center gap-1 min-w-0 min-h-[44px]">
                              <div className="flex-shrink-0 w-6 h-6 rounded bg-green-light flex items-center justify-center">
                                <Users className="h-3 w-3 text-green-primary" />
                              </div>
                              <span className="text-xs font-medium text-gray-900 font-sans truncate block">
                                {g.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 text-center text-[10px] text-gray-600 font-sans border-r border-dashed border-gray-300">
                            {formatDate(g.created_at)}
                          </td>
                          <td className="px-0.5 py-1.5 text-center">
                            <ChevronRight className="h-3 w-3 text-gray-400 mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
