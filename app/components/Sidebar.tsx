'use client'

import { Home, BarChart3, Plus, LogOut, User as UserIcon, Menu, X } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { useState } from 'react'

interface SidebarProps {
  activeView: 'dashboard' | 'general-dashboard' | 'debug'
  onViewChange: (view: 'dashboard' | 'general-dashboard' | 'debug') => void
  onAddExpense: () => void
  user: User
  onLogout: () => void
}

export default function Sidebar({ activeView, onViewChange, onAddExpense, user, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    {
      id: 'dashboard',
      label: 'This Month',
      icon: Home,
      description: 'Monthly expense overview'
    },
    {
      id: 'general-dashboard',
      label: 'All Expenses',
      icon: BarChart3,
      description: 'Yearly summary by month'
    }
  ]

  const handleViewChange = (view: 'dashboard' | 'general-dashboard' | 'debug') => {
    onViewChange(view)
    setIsMobileMenuOpen(false) // Close mobile menu when navigating
  }

  const handleAddExpense = () => {
    onAddExpense()
    setIsMobileMenuOpen(false) // Close mobile menu when adding expense
  }

  const handleLogout = () => {
    onLogout()
    setIsMobileMenuOpen(false) // Close mobile menu when logging out
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-600" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">Expense Tracker</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <UserIcon className="h-4 w-4" />
            <span className="truncate">{user.first_name} {user.last_name}</span>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <button
            onClick={handleAddExpense}
            className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id as 'dashboard' | 'general-dashboard' | 'debug')}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm lg:text-base
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                  title={item.description}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors text-sm lg:text-base"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </>
  )
} 