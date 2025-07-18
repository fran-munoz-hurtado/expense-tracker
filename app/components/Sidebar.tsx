'use client'

import { Home, BarChart3, Plus, LogOut, User as UserIcon, Menu, X, Target, FolderOpen, TrendingUp } from 'lucide-react'
import { type User } from '@/lib/supabase'
import { useState } from 'react'
import { texts } from '@/lib/translations'

interface SidebarProps {
  activeView: 'dashboard' | 'general-dashboard' | 'debug' | 'mis-metas' | 'categories' | 'como-vamos'
  onViewChange: (view: 'dashboard' | 'general-dashboard' | 'debug' | 'mis-metas' | 'categories' | 'como-vamos') => void
  onAddExpense: () => void
  user: User
  onLogout: () => void
}

export default function Sidebar({ activeView, onViewChange, onAddExpense, user, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    {
      id: 'como-vamos',
      label: '¿Cómo vamos?',
      icon: TrendingUp,
      description: 'Tu estado financiero general'
    },
    {
      id: 'dashboard',
      label: texts.thisMonth,
      icon: Home,
      description: texts.dashboard
    },
    {
      id: 'general-dashboard',
      label: texts.allExpenses,
      icon: BarChart3,
      description: texts.yearlySummary
    },
    {
      id: 'categories',
      label: 'Por Categorías',
      icon: FolderOpen,
      description: 'Analiza tus gastos organizados por categoría'
    },
    {
      id: 'mis-metas',
      label: texts.misMetas,
      icon: Target,
      description: 'Seguimiento de objetivos financieros'
    }
  ]

  const handleViewChange = (view: 'dashboard' | 'general-dashboard' | 'debug' | 'mis-metas' | 'categories' | 'como-vamos') => {
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
        sidebar fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-beige shadow-sm border-r border-border-light flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 lg:p-6 border-b border-border-light">
          <h1 className="text-lg lg:text-xl font-bold text-gray-dark font-sans">{texts.appTitle}</h1>
        </div>
        
        <div className="flex-1 p-4">
          <button
            onClick={handleAddExpense}
            className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-2.5
              bg-[#77b16e] text-white font-medium text-sm
              rounded-mdplus shadow-soft
              hover:bg-[#6bab61] hover:scale-[1.02]
              active:bg-[#5d9f67] active:scale-95
              focus:outline-none focus:ring-2 focus:ring-green-primary
              transition-all duration-150"
            aria-label={texts.addTransaction}
          >
            <Plus className="w-5 h-5 text-white" />
            {texts.addTransaction}
          </button>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id as 'dashboard' | 'general-dashboard' | 'debug' | 'mis-metas' | 'categories')}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-mdplus text-left transition-colors text-sm lg:text-base font-sans
                    ${isActive 
                      ? 'bg-green-primary text-white' 
                      : 'text-green-dark hover:bg-border-light'
                    }
                  `}
                  title={item.description}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-green-dark'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-border-light">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-green-dark hover:underline rounded-lg transition-colors text-sm lg:text-base font-sans"
          >
            <LogOut className="h-4 w-4" />
            {texts.logout}
          </button>
        </div>
      </div>
    </>
  )
} 