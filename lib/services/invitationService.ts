import { supabase } from '@/lib/supabase'

export type PendingInvitation = {
  group_id: string
  group_name: string
  invited_by_name?: string
}

export type InviteResult = {
  success: boolean
  error?: string
  token?: string
  group_name?: string
  inviter_email?: string
  expires_at?: string
}

export type AcceptResult = {
  success: boolean
  error?: string
  group_id?: string
  group_name?: string
}

/** Invita a un usuario por email. Solo admins del grupo. */
export async function inviteMember(
  groupId: string,
  email: string
): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('invite_member_to_group', {
    p_group_id: groupId,
    p_email: email.trim(),
  })

  if (error) {
    console.error('[invitationService] inviteMember:', error)
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string; token?: string; group_name?: string; inviter_email?: string; expires_at?: string }
  if (!result.success) {
    return { success: false, error: result.error || 'Error al invitar' }
  }

  return {
    success: true,
    token: result.token,
    group_name: result.group_name,
    inviter_email: result.inviter_email,
    expires_at: result.expires_at,
  }
}

/** Acepta invitación por token (email link). */
export async function acceptInvitationByToken(token: string): Promise<AcceptResult> {
  const { data, error } = await supabase.rpc('accept_group_invitation', {
    p_token: token,
    p_group_id: null,
  })

  if (error) {
    console.error('[invitationService] acceptInvitationByToken:', error)
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string; group_id?: string; group_name?: string }
  if (!result.success) {
    return { success: false, error: result.error || 'Error al aceptar' }
  }

  return {
    success: true,
    group_id: result.group_id,
    group_name: result.group_name,
  }
}

/** Acepta invitación por group_id (in-app). */
export async function acceptInvitationByGroupId(groupId: string): Promise<AcceptResult> {
  const { data, error } = await supabase.rpc('accept_group_invitation', {
    p_token: null,
    p_group_id: groupId,
  })

  if (error) {
    console.error('[invitationService] acceptInvitationByGroupId:', error)
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string; group_id?: string; group_name?: string }
  if (!result.success) {
    return { success: false, error: result.error || 'Error al aceptar' }
  }

  return {
    success: true,
    group_id: result.group_id,
    group_name: result.group_name,
  }
}

/** Rechaza invitación pendiente. */
export async function rejectInvitation(groupId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('reject_group_invitation', {
    p_group_id: groupId,
  })

  if (error) {
    console.error('[invitationService] rejectInvitation:', error)
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string }
  if (!result.success) {
    return { success: false, error: result.error || 'Error al rechazar' }
  }

  return { success: true }
}

/** Obtiene invitaciones pendientes del usuario actual. */
export async function fetchPendingInvitations(userId: string): Promise<PendingInvitation[]> {
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('group_id, invited_by')
    .eq('user_id', userId)
    .eq('status', 'pending_invitation')

  if (membersError || !members?.length) return []

  const groupIds = [...new Set(members.map((m) => m.group_id))]
  const invitedByIds = [...new Set(members.map((m) => m.invited_by).filter(Boolean))]

  const [{ data: groups, error: groupsError }, { data: inviters }] = await Promise.all([
    supabase.from('groups').select('id, name').in('id', groupIds),
    invitedByIds.length
      ? supabase.from('users').select('id, first_name, last_name').in('id', invitedByIds)
      : Promise.resolve({ data: [] }),
  ])

  if (groupsError || !groups?.length) return []

  const inviterMap = new Map(
    (inviters || []).map((i) => [i.id, `${i.first_name} ${i.last_name}`.trim() || 'Alguien'])
  )
  const memberByGroup = new Map(members.map((m) => [m.group_id, m]))

  return groups.map((g) => {
    const m = memberByGroup.get(g.id)
    return {
      group_id: g.id,
      group_name: g.name,
      invited_by_name: m?.invited_by ? inviterMap.get(m.invited_by) : undefined,
    }
  })
}
