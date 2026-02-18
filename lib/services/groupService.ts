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
  const { data: members, error } = await supabase
    .from('group_members')
    .select('id, user_id, role, status, joined_at')
    .eq('group_id', groupId)

  if (error || !members?.length) return []

  const userIds = Array.from(new Set(members.map(m => m.user_id)))
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))
  return members.map(m => ({
    ...m,
    first_name: userMap.get(m.user_id)?.first_name,
    last_name: userMap.get(m.user_id)?.last_name,
    email: userMap.get(m.user_id)?.email
  }))
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
