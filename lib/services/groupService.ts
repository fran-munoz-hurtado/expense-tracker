import { supabase } from '@/lib/supabase'

export type GroupMemberInfo = {
  id: number
  user_id: string
  role: 'admin' | 'member'
  status: string
  joined_at: string | null
  first_name?: string
  last_name?: string
  email?: string
  profile_image_url?: string | null
}

export type GroupDetail = {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
  creator_name?: string
  creator_email?: string
}

export type GroupStats = {
  totalIncome: number
  totalExpense: number
  total: number // income - expense
}

export async function fetchGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const { data: group, error } = await supabase
    .from('groups')
    .select('id, name, created_by, created_at, updated_at')
    .eq('id', groupId)
    .single()

  if (error || !group) return null

  const { data: creator } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', group.created_by)
    .single()

  return {
    ...group,
    creator_name: creator ? `${creator.first_name} ${creator.last_name}` : undefined,
    creator_email: creator?.email
  }
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMemberInfo[]> {
  const { data: rows, error } = await supabase.rpc('get_group_members', {
    p_group_id: groupId,
  })

  if (error) {
    console.error('[groupService] get_group_members error:', error)
    return []
  }

  const members = (rows || []) as Array<{
    id: number
    user_id: string
    role: string
    status: string
    joined_at: string | null
    first_name?: string
    last_name?: string
    email?: string
    profile_image_url?: string | null
  }>

  return members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role as 'admin' | 'member',
    status: m.status,
    joined_at: m.joined_at,
    first_name: m.first_name,
    last_name: m.last_name,
    email: m.email,
    profile_image_url: m.profile_image_url ?? null,
  }))
}

export async function leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('leave_group', { p_group_id: groupId })

  if (error) {
    console.error('[groupService] leaveGroup:', error)
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string }
  if (!result.success) {
    return { success: false, error: result.error || 'Error al salir' }
  }
  return { success: true }
}

export async function removeMember(
  groupId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('remove_group_member', {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
  })

  if (error) {
    console.error('[groupService] removeMember:', error)
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string }
  if (!result.success) {
    return { success: false, error: result.error || 'Error al sacar al miembro' }
  }
  return { success: true }
}

export async function fetchGroupStats(groupId: string): Promise<GroupStats> {
  const { data, error } = await supabase
    .from('transactions')
    .select('value, type')
    .eq('group_id', groupId)

  if (error) return { totalIncome: 0, totalExpense: 0, total: 0 }

  const totalIncome = data?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0) ?? 0
  const totalExpense = data?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0) ?? 0
  return {
    totalIncome,
    totalExpense,
    total: totalIncome - totalExpense
  }
}

/** Elimina el espacio completo (solo creador). Borra transacciones, attachments, abonos, miembros. */
export async function deleteGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener transacciones del grupo
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .eq('group_id', groupId)

    if (txError) {
      console.error('[groupService] deleteGroup: error fetching transactions', txError)
      return { success: false, error: txError.message }
    }

    const transactionIds = (transactions ?? []).map((t) => t.id)
    if (transactionIds.length > 0) {
      // 2. Obtener file_paths de attachments para borrar del storage
      const { data: attachments, error: attError } = await supabase
        .from('transaction_attachments')
        .select('file_path')
        .in('transaction_id', transactionIds)

      if (!attError && attachments?.length) {
        const filePaths = attachments.map((a) => a.file_path)
        await supabase.storage.from('transaction-attachments').remove(filePaths)
        // No bloqueamos si falla el storage; el RPC borrará los registros de todas formas
      }
    }

    // 3. Ejecutar RPC (borra grupo y cascades en DB)
    const { data, error } = await supabase.rpc('delete_group', { p_group_id: groupId })

    if (error) {
      console.error('[groupService] deleteGroup:', error)
      return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string }
    if (!result.success) {
      return { success: false, error: result.error || 'Error al eliminar el espacio' }
    }
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error inesperado'
    return { success: false, error: msg }
  }
}
