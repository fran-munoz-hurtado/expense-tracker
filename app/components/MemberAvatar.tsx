'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { GroupMemberInfo } from '@/lib/services/groupService'

const AVATAR_COLORS = [
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-teal-500',
]

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function getInitials(member: GroupMemberInfo | null): string {
  if (!member) return '?'
  const first = (member.first_name ?? '').trim()[0]
  const last = (member.last_name ?? '').trim()[0]
  if (first && last) return `${first}${last}`.toUpperCase()
  if (first) return first.toUpperCase()
  if (member.email) return member.email[0].toUpperCase()
  return '?'
}

interface MemberAvatarProps {
  userId: string | null
  members: GroupMemberInfo[]
  size?: 'sm' | 'md'
  className?: string
}

function InitialsFallback({
  initials,
  userId,
  sizeClasses,
  className,
}: {
  initials: string
  userId: string
  sizeClasses: string
  className?: string
}) {
  const colorIndex = hashString(userId) % AVATAR_COLORS.length
  const bgColor = AVATAR_COLORS[colorIndex]
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium text-white flex-shrink-0',
        sizeClasses,
        bgColor,
        className
      )}
    >
      {initials}
    </div>
  )
}

export default function MemberAvatar({ userId, members, size = 'md', className }: MemberAvatarProps) {
  const [imgError, setImgError] = useState(false)

  if (!userId) return null

  const member = members.find((m) => m.user_id === userId)
  const initials = getInitials(member ?? null)

  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'

  // Usar fallback si la imagen falló antes o si no hay URL
  if (imgError || !member?.profile_image_url?.trim()) {
    return <InitialsFallback initials={initials} userId={userId} sizeClasses={sizeClasses} className={className} />
  }

  return (
    <img
      src={member.profile_image_url}
      alt={initials}
      referrerPolicy="no-referrer"
      className={cn('rounded-full object-cover flex-shrink-0', sizeClasses, className)}
      onError={() => setImgError(true)}
    />
  )
}
