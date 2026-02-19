import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type Group = {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
  /** Cantidad de miembros (solo si se ha cargado) */
  member_count?: number
  /** Rol del usuario actual en este espacio */
  my_role?: 'admin' | 'member'
}

export type GroupMember = {
  id: number
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  status: string
  joined_at: string | null
}

interface GroupStore {
  groups: Group[]
  currentGroupId: string | null
  isLoading: boolean
  setCurrentGroupId: (id: string | null) => void
  fetchGroups: (userId: string) => Promise<void>
  createGroup: (userId: string, name: string) => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  currentGroupId: null,
  isLoading: false,

  setCurrentGroupId: (id) => set({ currentGroupId: id }),

  fetchGroups: async (userId) => {
    if (!userId?.trim()) {
      console.warn('[groupStore] fetchGroups: userId vacío')
      set({ groups: [], currentGroupId: null })
      return
    }
    set({ isLoading: true })
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (membersError) {
        console.error('[groupStore] group_members ERROR:', membersError.message, membersError.code, membersError.details)
        set({ groups: [], currentGroupId: null })
        return
      }
      if (!membersData?.length) {
        console.warn('[groupStore] group_members: 0 filas (sin membresías activas)')
        set({ groups: [], currentGroupId: null })
        return
      }

      const groupIds = Array.from(new Set(membersData.map(m => m.group_id)))
      const myRoleByGroup = new Map(membersData.map(m => [m.group_id, m.role as 'admin' | 'member']))

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, created_by, created_at, updated_at')
        .in('id', groupIds)
        .order('name')

      if (groupsError) {
        console.error('[groupStore] groups ERROR:', groupsError.message, groupsError.code, groupsError.details)
        set({ groups: [], currentGroupId: null })
        return
      }

      const baseGroups = groupsData || []
      let countsByGroup = new Map<string, number>()
      if (groupIds.length > 0) {
        const { data: countsData, error: countsError } = await supabase.rpc('get_groups_member_counts', {
          p_group_ids: groupIds
        })
        if (!countsError && countsData) {
          countsByGroup = new Map((countsData as Array<{ group_id: string; member_count: number }>).map(
            r => [r.group_id, Number(r.member_count)]
          ))
        }
      }

      const groups: Group[] = baseGroups.map(g => ({
        ...g,
        member_count: countsByGroup.get(g.id),
        my_role: myRoleByGroup.get(g.id)
      }))
      set({ groups })

      const { currentGroupId } = get()
      if (groups.length > 0 && !currentGroupId) {
        set({ currentGroupId: groups[0].id })
      } else if (groups.length === 0) {
        set({ currentGroupId: null })
      } else if (currentGroupId && !groups.find(g => g.id === currentGroupId)) {
        set({ currentGroupId: groups[0].id })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  createGroup: async (userId, name) => {
    if (!userId?.trim() || !name?.trim()) {
      return { success: false, error: 'Nombre del grupo requerido' }
    }
    try {
      const { data, error } = await supabase.rpc('create_group_for_user', {
        group_name: name.trim()
      })

      if (error) {
        console.error('[groupStore] createGroup error:', error)
        return { success: false, error: error.message }
      }
      const groupData = data as Group | null
      if (!groupData?.id) return { success: false, error: 'No se pudo crear el grupo' }

      const { groups } = get()
      set({
        groups: [...groups, groupData],
        currentGroupId: groupData.id
      })
      return { success: true }
    } catch (e) {
      console.error('[groupStore] createGroup:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Error inesperado' }
    }
  },

  reset: () => set({ groups: [], currentGroupId: null })
}))
