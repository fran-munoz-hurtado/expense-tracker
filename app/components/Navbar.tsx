'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { texts } from '@/lib/translations'

interface NavbarProps {
  user: User
  onLogout: () => void
  /** Slot para el menú hamburguesa (solo mobile) */
  leftSlot?: React.ReactNode
}

export default function Navbar({ user, onLogout, leftSlot }: NavbarProps) {
  const [greeting, setGreeting] = useState('')
  const [financialMessage, setFinancialMessage] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setShowUserDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { setGreeting('Hola') }, [])
  useEffect(() => { setFinancialMessage('Tus cuentas claras') }, [])

  return (
    <>
      <div className="relative z-10 w-full bg-gradient-to-br from-[#77b56e] via-[#6a9f61] to-[#5d7760] px-4 sm:px-6 py-2.5 shadow-[0_4px_14px_rgba(93,119,96,0.25)]">
          <div className="flex items-center justify-between">
          {/* Left side - slot hamburger + Welcome message */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {leftSlot}
            <h1 className="text-base sm:text-lg font-semibold text-white font-sans truncate">
              {greeting}, {user.first_name} {user.last_name}
            </h1>
            <span className="text-xs sm:text-sm text-white/90 font-sans whitespace-nowrap hidden sm:inline">
              {financialMessage}
            </span>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* User menu */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 p-1.5 sm:p-2 text-white hover:text-white hover:bg-white/15 rounded-full transition-colors"
              >
                <div className="w-8 h-8 sm:w-8 sm:h-8 bg-white/25 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur-sm">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-white" />
              </button>

              {/* Dropdown menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.12)] py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-dark font-sans">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-green-dark font-sans">{user.email}</p>
                  </div>
                  
                  <div className="border-t border-gray-100">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-error-red hover:bg-error-bg font-sans"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {texts.logout}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 