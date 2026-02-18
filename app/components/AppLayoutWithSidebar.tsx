'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Wallet, LayoutGrid } from 'lucide-react'
import Navbar from './Navbar'
import { type User } from '@/lib/supabase'

const SIDEBAR_BG = 'bg-sky-100' // Azul claro

interface AppLayoutWithSidebarProps {
  user: User
  onLogout: () => void
  children: React.ReactNode
}

export default function AppLayoutWithSidebar({ user, onLogout, children }: AppLayoutWithSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelReady, setPanelReady] = useState(false)

  useEffect(() => {
    if (menuOpen) {
      setPanelReady(false)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPanelReady(true))
      })
      return () => cancelAnimationFrame(id)
    } else {
      setPanelReady(false)
    }
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const menuItems = [
    { label: 'Mis cuentas', id: 'mis-cuentas', Icon: Wallet, href: '/mis-cuentas' },
    { label: 'Espacios', id: 'espacios', Icon: LayoutGrid, href: '/mis-cuentas/grupos' }
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop: sidebar siempre visible */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-52 lg:shrink-0 ${SIDEBAR_BG} border-r border-sky-200`}
      >
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.Icon
            const baseClasses = 'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 font-medium text-sm font-sans hover:bg-sky-200/60 transition-colors'
            if ('href' in item && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${baseClasses} cursor-pointer`}
                >
                  <Icon className="h-4 w-4 text-sky-600 shrink-0" strokeWidth={1.5} />
                  {item.label}
                </Link>
              )
            }
            return (
              <div key={item.id} className={`${baseClasses} cursor-default`}>
                <Icon className="h-4 w-4 text-sky-600 shrink-0" strokeWidth={1.5} />
                {item.label}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Mobile: overlay + drawer que se abre desde la derecha */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Panel: se desliza desde la izquierda */}
          <aside
            className={`absolute left-0 top-0 bottom-0 w-64 ${SIDEBAR_BG} shadow-xl border-r border-sky-200 transform transition-transform duration-200 ease-out ${
              panelReady ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-sky-200">
              <span className="font-semibold text-gray-800">Menú</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-sky-200/60 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.Icon
                const baseClasses = 'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 font-medium text-sm font-sans hover:bg-sky-200/60 transition-colors'
                if ('href' in item && item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`${baseClasses} cursor-pointer`}
                    >
                      <Icon className="h-4 w-4 text-sky-600 shrink-0" strokeWidth={1.5} />
                      {item.label}
                    </Link>
                  )
                }
                return (
                  <div key={item.id} className={`${baseClasses} cursor-default`}>
                    <Icon className="h-4 w-4 text-sky-600 shrink-0" strokeWidth={1.5} />
                    {item.label}
                  </div>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Área principal: Navbar + contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          user={user}
          onLogout={onLogout}
          leftSlot={
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 mr-1 text-white hover:bg-white/15 rounded-lg transition-colors shrink-0"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          }
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
