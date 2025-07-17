'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Settings, User as UserIcon, TrendingUp, DollarSign, Target, ChevronDown, Edit, Bug, LogOut, X } from 'lucide-react'
import { supabase, type User } from '@/lib/supabase'
import { texts } from '@/lib/translations'

interface NavbarProps {
  user: User
  onLogout: () => void
  onViewChange: (view: 'dashboard' | 'general-dashboard' | 'debug' | 'mis-metas' | 'categories' | 'como-vamos') => void
  onUserUpdate?: (updatedUser: User) => void
}

export default function Navbar({ user, onLogout, onViewChange, onUserUpdate }: NavbarProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [financialMessage, setFinancialMessage] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

  // Update time and greeting every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Set greeting to a friendly but neutral 'Hola'
  useEffect(() => {
    setGreeting('Hola')
  }, [])

  // Set a positive, responsible financial message
  useEffect(() => {
    const messages = [
      "¡Estás tomando el control de tus gastos! 🧾",
      "¡Ser responsable con tus finanzas es un gran paso! 💡",
      "¡Cada registro te acerca a tus metas! 🚀",
      "¡Medir tus gastos es cuidar de ti! 🌱",
      "¡Buen trabajo manteniendo tus cuentas claras! 👏",
      "¡La constancia es clave para una vida financiera sana! 🔑",
      "¡Sigue así, tu futuro yo te lo agradecerá! 🙌",
      "¡Registrar tus gastos es un acto de responsabilidad! 🛡️"
    ]
    // Use the current day to select a consistent message
    const now = new Date()
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const messageIndex = dayOfYear % messages.length
    setFinancialMessage(messages[messageIndex])
  }, [])

  // Update edit form data when user changes
  useEffect(() => {
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email
    })
  }, [user])

  const handleEditProfile = () => {
    setShowEditModal(true)
    setShowUserDropdown(false)
  }

  const handleDebugSection = () => {
    onViewChange('debug')
    setShowUserDropdown(false)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)
    setEditLoading(true)

    try {
      // Update user data in the database
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          username: editFormData.username,
          email: editFormData.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        throw new Error(error.message)
      }

      if (data) {
        // Update the user state in the parent component
        onUserUpdate?.(data)
        
        // Close modal
        setShowEditModal(false)
        
        console.log('User updated successfully:', data)
      }
      
    } catch (error) {
      console.error('Failed to update user:', error)
      setEditError(error instanceof Error ? error.message : 'Error al actualizar el perfil. Inténtalo de nuevo.')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <>
      <div className="bg-neutral-bg border-b border-green-primary px-4 sm:px-6 py-3 sm:py-4 shadow-soft relative">
          <div className="flex items-center justify-between">
          {/* Left side - Welcome message */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-primary rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white">
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-semibold text-gray-dark font-sans truncate">
                  {greeting}, {user.first_name} {user.last_name}
                </h1>
                <p className="text-xs sm:text-sm text-green-dark flex items-center space-x-1 font-sans">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-dark flex-shrink-0" />
                  <span className="truncate">{financialMessage}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Actions and time */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Quick stats indicator */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-beige rounded-full">
              <DollarSign className="h-4 w-4 text-green-dark" />
              <span className="text-sm font-medium text-green-dark font-sans">{texts.appTitle}</span>
            </div>

            {/* Notifications */}
            <button className="p-1.5 sm:p-2 text-green-dark hover:text-gray-dark hover:bg-border-light rounded-full transition-colors">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Settings */}
            <button className="p-1.5 sm:p-2 text-green-dark hover:text-gray-dark hover:bg-border-light rounded-full transition-colors">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* User menu */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 p-1.5 sm:p-2 text-green-dark hover:text-gray-dark hover:bg-border-light rounded-full transition-colors"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-primary rounded-full flex items-center justify-center border-2 border-white">
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
                  
                  <button
                    onClick={handleEditProfile}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-dark hover:bg-border-light font-sans"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {texts.profile.updateProfile}
                  </button>
                  
                  <button
                    onClick={handleDebugSection}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-dark hover:bg-border-light font-sans"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    {texts.profile.debugSection}
                  </button>
                  
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-mdplus max-w-md w-full p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-dark font-sans">{texts.profile.updateProfile}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-green-dark hover:text-gray-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 bg-error-bg border border-error-red rounded-mdplus p-3">
                <p className="text-sm text-error-red font-sans">{editError}</p>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit_first_name" className="block text-sm font-medium text-gray-dark font-sans">
                    {texts.profile.name}
                  </label>
                  <input
                    id="edit_first_name"
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-border-light rounded-mdplus shadow-soft focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-green-primary font-sans"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit_last_name" className="block text-sm font-medium text-gray-dark font-sans">
                    {texts.profile.lastName}
                  </label>
                  <input
                    id="edit_last_name"
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-border-light rounded-mdplus shadow-soft focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-green-primary font-sans"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit_username" className="block text-sm font-medium text-gray-dark font-sans">
                  {texts.profile.username}
                </label>
                <input
                  id="edit_username"
                  type="text"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-border-light rounded-mdplus shadow-soft focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-green-primary font-sans"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_email" className="block text-sm font-medium text-gray-dark font-sans">
                  {texts.email}
                </label>
                <input
                  id="edit_email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-border-light rounded-mdplus shadow-soft focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-green-primary font-sans"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-green-dark bg-beige hover:bg-border-light rounded-mdplus font-sans"
                >
                  {texts.cancel}
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-primary hover:bg-[#77b16e] rounded-mdplus disabled:opacity-50 font-sans"
                >
                  {editLoading ? texts.saving : texts.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
} 