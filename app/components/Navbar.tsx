'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Settings, User as UserIcon, TrendingUp, DollarSign, Target, ChevronDown, Edit, Bug, LogOut, X } from 'lucide-react'
import { supabase, type User } from '@/lib/supabase'

interface NavbarProps {
  user: User
  onLogout: () => void
  onViewChange: (view: 'dashboard' | 'general-dashboard' | 'debug') => void
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

  // Set greeting based on time of day
  useEffect(() => {
    const hour = currentTime.getHours()
    if (hour < 12) {
      setGreeting('Good morning')
    } else if (hour < 17) {
      setGreeting('Good afternoon')
    } else {
      setGreeting('Good evening')
    }
  }, [currentTime])

  // Set financial wellness message
  useEffect(() => {
    const messages = [
      "Let's make today financially productive! 💰",
      "Your financial goals are within reach! 🎯",
      "Smart money management starts here! 📊",
      "Every expense tracked is progress made! 📈",
      "Building wealth, one transaction at a time! 💎",
      "Your financial future looks bright! ✨",
      "Stay on top of your finances today! 📋",
      "Financial freedom is a journey, not a destination! 🚀"
    ]
    
    // Use the current day to select a consistent message
    const dayOfYear = Math.floor((currentTime.getTime() - new Date(currentTime.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const messageIndex = dayOfYear % messages.length
    setFinancialMessage(messages[messageIndex])
  }, [currentTime])

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
      setEditError(error instanceof Error ? error.message : 'Failed to update profile. Please try again.')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Welcome message */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                  {greeting}, {user.first_name} {user.last_name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                  <span className="truncate">{financialMessage}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Actions and time */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Current time */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>{currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}</span>
            </div>

            {/* Quick stats indicator */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Expense Tracker</span>
            </div>

            {/* Notifications */}
            <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Settings */}
            <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* User menu */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium">{user.first_name}</span>
                <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {/* User info header */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* Edit Profile */}
                    <button
                      onClick={handleEditProfile}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-3 text-gray-500" />
                      Edit Profile
                    </button>

                    {/* Debug Section */}
                    <button
                      onClick={handleDebugSection}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Bug className="h-4 w-4 mr-3 text-gray-500" />
                      Debug Section
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Logout */}
                    <button
                      onClick={onLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar for visual appeal */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{editError}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
} 