'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Users, Plus, X, Settings } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ROUTES } from '@/lib/routes'
import { type User } from '@/lib/supabase'
import { useGroupStore } from '@/lib/store/groupStore'
import { buildMisCuentasUrl, parseMisCuentasPath, FILTER_PARAMS_REVERSE } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { analytics } from '@/lib/analytics'

interface GroupBadgeProps {
  user: User
  /** Variante: 'light' para barra blanca (DashboardView), 'dark' para barra verde (Navbar) */
  variant?: 'light' | 'dark'
}

export default function GroupBadge({ user, variant = 'light' }: GroupBadgeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { groups, currentGroupId, setCurrentGroupId, createGroup } = useGroupStore()
  const currentGroup = groups.find(g => g.id === currentGroupId)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleGroupSelect = (id: string) => {
    setCurrentGroupId(id)
    setShowDropdown(false)
    if (pathname.startsWith('/mis-cuentas')) {
      const parsed = parseMisCuentasPath(pathname)
      if (parsed?.year && parsed.month) {
        const tipo = searchParams.get('tipo')
        const filterType = tipo && FILTER_PARAMS_REVERSE[tipo] ? FILTER_PARAMS_REVERSE[tipo] : undefined
        router.push(buildMisCuentasUrl(parsed.year, parsed.month, {
          tipo: filterType === 'all' ? undefined : filterType,
          grupo: id,
        }))
      }
    }
  }

  const handleOpenCreateGroup = () => {
    setShowDropdown(false)
    setShowCreateModal(true)
    setNewGroupName('')
    setCreateError(null)
  }

  const handleGestionGrupos = () => {
    setShowDropdown(false)
    router.push(ROUTES.misCuentasGrupos)
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setIsCreating(true)
    setCreateError(null)
    const result = await createGroup(user.id, newGroupName.trim())
    setIsCreating(false)
    if (result.success) {
      analytics.createSpace()
      setShowCreateModal(false)
      const newGroupId = useGroupStore.getState().currentGroupId
      if (newGroupId && pathname.startsWith('/mis-cuentas')) {
        const parsed = parseMisCuentasPath(pathname)
        if (parsed?.year && parsed.month) {
          const tipo = searchParams.get('tipo')
          const filterType = tipo && FILTER_PARAMS_REVERSE[tipo] ? FILTER_PARAMS_REVERSE[tipo] : undefined
          router.push(buildMisCuentasUrl(parsed.year, parsed.month, {
            tipo: filterType === 'all' ? undefined : filterType,
            grupo: newGroupId,
          }))
        }
      }
    } else {
      setCreateError(result.error || 'Error al crear')
    }
  }

  const isLight = variant === 'light'
  const btnClasses = isLight
    ? 'flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 transition-colors min-w-0'
    : 'flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors min-w-0'

  return (
    <>
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={btnClasses}
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-label="Grupo activo"
        >
          <Users className={isLight ? 'h-3.5 w-3.5 text-green-primary flex-shrink-0' : 'h-3.5 w-3.5 text-white flex-shrink-0'} />
          <span className={cn(
            'text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[140px]',
            isLight ? 'text-gray-800' : 'text-white'
          )} title={currentGroup?.name || 'Seleccionar grupo'}>
            {currentGroup ? currentGroup.name : 'Sin grupo'}
          </span>
          <ChevronDown className={cn(
            'h-3.5 w-3.5 flex-shrink-0 transition-transform',
            isLight ? 'text-gray-600' : 'text-white',
            showDropdown && 'rotate-180'
          )} />
        </button>

        {showDropdown && (
          <div className="absolute right-0 left-auto lg:left-0 lg:right-auto top-full mt-1 w-56 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.12)] border border-gray-200 py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tus espacios</p>
            </div>
            {groups.length > 0 ? (
              <ul role="listbox" className="max-h-48 overflow-y-auto">
                {groups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={g.id === currentGroupId}
                      onClick={() => handleGroupSelect(g.id)}
                      className={`w-full text-left px-3 py-2 text-sm font-sans hover:bg-gray-50 flex items-center gap-2 ${g.id === currentGroupId ? 'bg-green-50 text-green-dark font-medium' : 'text-gray-700'}`}
                    >
                      <Users className="h-4 w-4 text-gray-400" />
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-4 text-sm text-gray-500">No tienes grupos aún</p>
            )}
            <div className="border-t border-gray-100 pt-1">
              <button
                type="button"
                onClick={handleOpenCreateGroup}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-dark hover:bg-green-50 font-medium font-sans"
              >
                <Plus className="h-4 w-4" />
                Crear grupo
              </button>
              <button
                type="button"
                onClick={handleGestionGrupos}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-dark hover:bg-green-50 font-medium font-sans"
              >
                <Settings className="h-4 w-4" />
                Mis espacios
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" onClick={() => setShowCreateModal(false)} />
          <section className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 z-10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <form onSubmit={handleCreateGroup} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-green-50 rounded-full p-1.5">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 font-sans">Crear grupo</h2>
                  <p className="text-sm text-gray-500 font-sans">Comparte finanzas con familia o equipo</p>
                </div>
              </div>
              <div>
                <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 font-sans mb-1">
                  Nombre del grupo
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej: Familia Cardona, Gastos mamá"
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-primary focus:border-green-primary text-sm placeholder-gray-400"
                />
              </div>
              {createError && (
                <p className="mt-2 text-sm text-red-600">{createError}</p>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newGroupName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-primary rounded-md hover:bg-[#6a9f61] disabled:opacity-50 font-sans"
                >
                  {isCreating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
