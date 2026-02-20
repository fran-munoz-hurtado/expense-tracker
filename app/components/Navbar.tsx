'use client'

import { useState, useEffect } from 'react'
import { type User } from '@/lib/supabase'

interface NavbarProps {
  user: User
  /** Slot para el menú hamburguesa (solo mobile) */
  leftSlot?: React.ReactNode
}

export default function Navbar({ user, leftSlot }: NavbarProps) {
  const [greeting, setGreeting] = useState('')
  const [financialMessage, setFinancialMessage] = useState('')

  useEffect(() => { setGreeting('Hola') }, [])
  useEffect(() => { setFinancialMessage('Tus cuentas claras') }, [])

  return (
    <div className="relative z-10 w-full bg-gradient-to-br from-[#77b56e] via-[#6a9f61] to-[#5d7760] px-4 sm:px-6 py-2.5 shadow-[0_4px_14px_rgba(93,119,96,0.25),0_8px_24px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        {/* Left side - slot hamburger + Welcome message */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {leftSlot}
          <h1 className="text-base sm:text-lg font-semibold text-white font-sans truncate m-0 leading-tight">
            {greeting}, {user.first_name} {user.last_name}
          </h1>
          <span className="text-xs sm:text-sm text-white/90 font-sans whitespace-nowrap hidden sm:inline">
            {financialMessage}
          </span>
        </div>
      </div>
    </div>
  )
} 