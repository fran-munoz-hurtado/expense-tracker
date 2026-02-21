'use client'

import { texts } from '@/lib/translations'

interface AppLoadingViewProps {
  /** Optional custom message below the branding */
  message?: string
}

/**
 * Branded loading view used across the app (auth callback, initial load).
 * Always fixed to viewport so position never jumps between screens.
 */
export default function AppLoadingView({ message }: AppLoadingViewProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 25%, #eff6ff 50%, #f0fdf4 75%, #ecfdf5 100%)',
      }}
    >
      <div className="text-center" style={{ contain: 'layout paint' }}>
        <h1 className="text-2xl font-semibold text-gray-800 font-sans mb-4">
          {texts.appTitle}
        </h1>
        <div className="flex justify-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full bg-sky-500/60 animate-loading-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-sky-500/60 animate-loading-dot" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-sky-500/60 animate-loading-dot" style={{ animationDelay: '300ms' }} />
        </div>
        {message && (
          <p className="mt-3 text-sm text-gray-500 font-sans">{message}</p>
        )}
      </div>
    </div>
  )
}
