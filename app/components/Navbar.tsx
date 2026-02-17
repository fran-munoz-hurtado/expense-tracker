'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronDown, LogOut } from 'lucide-react'
import { supabase, type User } from '@/lib/supabase'
import { texts } from '@/lib/translations'

// Debug feature flag - set to true to enable debug section
const DEBUG_ENABLED = false

interface NavbarProps {
  user: User
  onLogout: () => void
  onAddExpense: () => void
}

export default function Navbar({ user, onLogout, onAddExpense }: NavbarProps) {
  const [greeting, setGreeting] = useState('')
  const [financialMessage, setFinancialMessage] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Set greeting to a friendly but neutral 'Hola'
  useEffect(() => {
    setGreeting('Hola')
  }, [])

  // Set fixed financial message
  useEffect(() => {
    setFinancialMessage("Tus cuentas claras")
  }, [])

  return (
    <>
      <div className="bg-neutral-bg border-b border-green-primary px-4 sm:px-6 py-2 shadow-soft relative">
          <div className="flex items-center justify-between">
          {/* Left side - Welcome message and financial message */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-gray-dark font-sans truncate">
              {greeting}, {user.first_name} {user.last_name}
            </h1>
            <span className="text-xs sm:text-sm text-green-dark font-sans whitespace-nowrap">
              {financialMessage}
            </span>
          </div>

          {/* Right side - Add button and user menu */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <button
              onClick={onAddExpense}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-primary text-white text-sm font-medium rounded-md hover:bg-green-dark transition-colors"
              aria-label={texts.addTransaction}
            >
              <Plus className="h-4 w-4" />
              {texts.addTransaction}
            </button>
            {/* User menu */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 p-1.5 sm:p-2 text-green-dark hover:text-gray-dark hover:bg-border-light rounded-full transition-colors"
              >
                <div className="w-8 h-8 sm:w-8 sm:h-8 bg-green-primary rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-green-dark" />
              </button>

              {/* Dropdown menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-mdplus shadow-soft py-1 z-50 border border-border-light">
                  <div className="px-4 py-2 border-b border-border-light">
                    <p className="text-sm font-medium text-gray-dark font-sans">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-green-dark font-sans">{user.email}</p>
                  </div>
                  
                  <div className="border-t border-border-light">
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