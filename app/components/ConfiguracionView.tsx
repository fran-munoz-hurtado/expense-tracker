'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, User, Shield, HelpCircle, AlertTriangle, X, Edit, Key, Eye, EyeOff } from 'lucide-react'
import { type User as UserType } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { clearUserCache } from '@/lib/dataUtils'
import { useDataSync } from '@/lib/hooks/useDataSync'
import { texts } from '@/lib/translations'
import React from 'react'

interface ConfiguracionViewProps {
  user: UserType
  navigationParams?: any
  onUserUpdate?: (updatedUser: UserType) => void
}

export default function ConfiguracionView({ user, navigationParams, onUserUpdate }: ConfiguracionViewProps) {
  const { refreshData } = useDataSync()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estados para el modal de edición de perfil
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Estados para el modal de cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
  }

  const handleChangePassword = () => {
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setPasswordError(null)
    setShowPasswordModal(true)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordLoading(true)

    try {
      const { currentPassword, newPassword, confirmPassword } = passwordFormData

      // Validar que todos los campos estén llenos
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Todos los campos son obligatorios.')
      }

      // Validar que las nuevas contraseñas coincidan
      if (newPassword !== confirmPassword) {
        throw new Error('Las nuevas contraseñas no coinciden.')
      }

      // Validar longitud mínima de nueva contraseña
      if (newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres.')
      }

      // 1. Validar contraseña actual
      const { error: validationError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (validationError) {
        if (validationError.message.includes('Invalid login credentials')) {
          throw new Error('La contraseña actual no es correcta.')
        }
        throw new Error(`Error de validación: ${validationError.message}`)
      }

      // 2. Cambiar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        throw new Error(`Error al actualizar contraseña: ${updateError.message}`)
      }

      // Éxito
      setShowPasswordModal(false)
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setSuccess('Contraseña actualizada correctamente.')

    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordError(error instanceof Error ? error.message : 'Error al cambiar la contraseña.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)
    setEditLoading(true)

    try {
      // Get current authenticated user from Supabase Auth
      const {
        data: { user: authUser },
        error: authGetError
      } = await supabase.auth.getUser()

      if (authGetError || !authUser) {
        throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.')
      }

      const { email, first_name, last_name, username } = editFormData

      // Validate required fields
      if (!email || !first_name || !last_name || !username) {
        throw new Error('Todos los campos son obligatorios.')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Por favor, ingresa un email válido.')
      }

      // Check for duplicate email/username (excluding current user)
      const { data: existingUser, error: duplicateError } = await supabase
        .from('users')
        .select('id, email, username')
        .or(`email.eq.${email},username.eq.${username}`)
        .neq('id', authUser.id)
        .maybeSingle()

      if (duplicateError) {
        console.error('Error checking duplicates:', duplicateError)
        throw new Error('Error al validar los datos. Inténtalo de nuevo.')
      }

      if (existingUser) {
        if (existingUser.email === email) {
          throw new Error('Este email ya está en uso por otro usuario.')
        }
        if (existingUser.username === username) {
          throw new Error('Este nombre de usuario ya está en uso.')
        }
      }

      // Update email in Supabase Auth (only if changed)
      if (email !== authUser.email) {
        const { error: authEmailError } = await supabase.auth.updateUser({ 
          email: email 
        })
        
        if (authEmailError) {
          console.error('Error updating auth email:', authEmailError)
          throw new Error(`Error al actualizar el email: ${authEmailError.message}`)
        }
      }

      // Update user metadata in Supabase Auth
      const { error: authMetadataError } = await supabase.auth.updateUser({
        data: {
          first_name: first_name,
          last_name: last_name,
          username: username
        }
      })

      if (authMetadataError) {
        console.error('Error updating auth metadata:', authMetadataError)
        throw new Error(`Error al actualizar los datos de usuario: ${authMetadataError.message}`)
      }

      // Update user data in public.users table
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: first_name,
          last_name: last_name,
          username: username,
          email: email,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating public users table:', error)
        throw new Error(`Error al actualizar el perfil: ${error.message}`)
      }

      if (data) {
        // Update the user state in the parent component
        onUserUpdate?.(data)
        
        // Close modal and reset error state
        setShowEditModal(false)
        setEditError(null)
        setSuccess('Perfil actualizado exitosamente')
        
        console.log('User profile updated successfully:', data)
      }
      
    } catch (error) {
      console.error('Failed to update user profile:', error)
      setEditError(error instanceof Error ? error.message : 'Error al actualizar el perfil. Inténtalo de nuevo.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteAllData = async () => {
    setIsDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Consultar transaction_attachments para obtener todos los file_path del usuario
      const { data: attachments, error: attachmentsError } = await supabase
        .from('transaction_attachments')
        .select('file_path')
        .eq('user_id', user.id)

      if (attachmentsError) {
        throw new Error(`Error consultando archivos adjuntos: ${attachmentsError.message}`)
      }

      // 2. Eliminar archivos físicos del bucket de Supabase Storage
      if (attachments && attachments.length > 0) {
        const filePaths = attachments.map(att => att.file_path)
        const { error: storageError } = await supabase.storage
          .from('transaction-attachments')
          .remove(filePaths)

        if (storageError) {
          console.warn('Error eliminando archivos del storage:', storageError)
          // Continuamos con la eliminación de datos aunque falle el storage
        }
      }

      // 3. Eliminar todos los registros de transaction_attachments del usuario
      const { error: attachmentDeleteError } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('user_id', user.id)

      if (attachmentDeleteError) {
        throw new Error(`Error eliminando registros de archivos adjuntos: ${attachmentDeleteError.message}`)
      }

      // 4. Eliminar directamente todas las transactions del usuario (no confiar en triggers)
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)

      if (transactionsError) {
        throw new Error(`Error eliminando transacciones: ${transactionsError.message}`)
      }

      // 5. Eliminar todas las entradas de non_recurrent_expenses del usuario
      const { error: nonRecurrentError } = await supabase
        .from('non_recurrent_expenses')
        .delete()
        .eq('user_id', user.id)

      if (nonRecurrentError) {
        throw new Error(`Error eliminando gastos únicos: ${nonRecurrentError.message}`)
      }

      // 6. Eliminar todas las entradas de recurrent_expenses del usuario
      const { error: recurrentError } = await supabase
        .from('recurrent_expenses')
        .delete()
        .eq('user_id', user.id)

      if (recurrentError) {
        throw new Error(`Error eliminando gastos recurrentes: ${recurrentError.message}`)
      }

      // 7. Sincronización global para actualizar todas las vistas inmediatamente
      clearUserCache(user.id)
      refreshData(user.id, 'delete_all_data')

      setSuccess('Todas las transacciones y archivos han sido eliminados exitosamente')
      setShowDeleteModal(false)

    } catch (err) {
      console.error('Error eliminando datos:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar los datos')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteModal = () => {
    setError(null)
    setSuccess(null)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false)
    }
  }
  
  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6 lg:p-8 pb-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-dark font-sans">Configuración</h2>
          <p className="text-sm text-green-dark font-sans">Gestiona tu cuenta, tus datos y herramientas avanzadas desde aquí.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Mensajes de éxito o error */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-800 font-sans">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 font-sans">{error}</p>
            </div>
          )}
          
          {/* Primera sección - Reset de cuenta */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-full">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Reset de cuenta
              </h3>
              <p className="text-xs text-gray-500 font-sans mb-4">
                Elimina todas tus transacciones y archivos. Esta acción no se puede deshacer.
              </p>
              
              <button
                onClick={openDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-sans text-sm"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar todas mis transacciones'}
              </button>
            </div>
          </div>

          {/* Segunda sección - Editar perfil */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-full">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Editar perfil
              </h3>
              <p className="text-xs text-gray-500 font-sans mb-4">
                Actualiza tu nombre y otros datos desde aquí.
              </p>
              
              <button
                onClick={handleEditProfile}
                className="px-4 py-2 bg-[#77b16e] text-white rounded-xl font-medium shadow-sm font-sans text-sm"
              >
                <Edit className="w-4 h-4 text-white mr-2 inline" />
                Actualizar perfil
              </button>
            </div>
          </div>

          {/* Tercera sección - Cambiar contraseña */}
          <div className="bg-white rounded-xl shadow-sm p-4 w-full">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-dark font-sans mb-1">
                Cambiar contraseña
              </h3>
              <p className="text-xs text-gray-500 font-sans mb-4">
                Actualiza tu contraseña de acceso de forma segura.
              </p>
              
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-[#77b16e] text-white rounded-xl font-medium shadow-sm font-sans text-sm"
              >
                <Key className="w-4 h-4 text-white mr-2 inline" />
                Cambiar mi contraseña
              </button>
            </div>
          </div>
          
        </div>
      </div>

      {/* Modal de cambio de contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-dark font-sans">Cambiar contraseña</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                disabled={passwordLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-sans">{passwordError}</p>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Contraseña actual */}
              <div>
                <label htmlFor="current_password" className="block text-sm font-medium text-gray-dark font-sans">
                  Contraseña actual
                </label>
                <div className="relative mt-1">
                  <input
                    id="current_password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordFormData.currentPassword}
                    onChange={(e) => setPasswordFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="block w-full px-3 py-2 pr-10 border border-border-light rounded-mdplus shadow-soft focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-green-primary font-sans"
                    required
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={passwordLoading}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-dark font-sans">
                  Nueva contraseña
                </label>
                <div className="relative mt-1">
                  <input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordFormData.newPassword}
                    onChange={(e) => setPasswordFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="block w-full px-3 py-2 pr-10 border border-border-light rounded-mdplus shadow-soft focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-green-primary font-sans"
                    required
                    disabled={passwordLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={passwordLoading}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 font-sans">
                  Mínimo 6 caracteres
                </p>
              </div>

              {/* Confirmar nueva contraseña */}
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-dark font-sans">
                  Confirmar nueva contraseña
                </label>
                <div className="relative mt-1">
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordFormData.confirmPassword}
                    onChange={(e) => setPasswordFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="block w-full px-3 py-2 pr-10 border border-border-light rounded-mdplus shadow-soft focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-green-primary font-sans"
                    required
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={passwordLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 bg-green-primary text-white rounded-xl font-medium hover:bg-[#77b16e] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  {passwordLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edición de perfil */}
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
                <label className="block text-sm font-medium text-gray-dark font-sans">
                  {texts.email}
                </label>
                <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-mdplus text-gray-600 font-sans text-sm">
                  {editFormData.email}
                </div>
                <p className="mt-1 text-xs text-gray-500 font-sans">
                  El correo no se puede modificar desde aquí
                </p>
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

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-dark font-sans">¿Estás seguro?</h2>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 font-sans mb-4">
                Esta acción eliminará permanentemente todas tus transacciones y archivos. No se puede revertir.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-red-800 font-medium">Esta acción no se puede deshacer</p>
                    <p className="text-xs text-red-700 mt-1">Se eliminarán todas las transacciones, gastos recurrentes, gastos únicos y archivos adjuntos</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAllData}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 