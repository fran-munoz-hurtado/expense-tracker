import { CUSTOM_ICONS } from '@/lib/config/icons'

/**
 * Renders a custom SVG icon based on the configuration in CUSTOM_ICONS
 * @param iconType - The type of icon to render
 * @param className - CSS classes to apply to the SVG element
 * @returns JSX element with the rendered icon
 */
export function renderCustomIcon(iconType: keyof typeof CUSTOM_ICONS, className: string = "w-5 h-5") {
  if (iconType === 'GOAL_TARGET') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" fill="#fef3c7" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="2.5" fill="#fef3c7" />
      </svg>
    )
  }
  
  if (iconType === 'SAVINGS_PIG') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {/* Moneda - círculo exterior mucho más grande y centrado */}
        <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="2.5" />
        
        {/* Trébol de 3 hojas más grande y sólido */}
        {/* Hoja izquierda */}
        <circle cx="8.5" cy="11" r="2.5" fill="currentColor" stroke="#22c55e" strokeWidth="1.2" />
        
        {/* Hoja derecha */}
        <circle cx="15.5" cy="11" r="2.5" fill="currentColor" stroke="#22c55e" strokeWidth="1.2" />
        
        {/* Hoja superior */}
        <circle cx="12" cy="7.5" r="2.5" fill="currentColor" stroke="#22c55e" strokeWidth="1.2" />
        
        {/* Tallo más corto */}
        <line x1="12" y1="12.5" x2="12" y2="15" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  
  if (iconType === 'TICKET_TAG') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {/* Etiqueta principal - forma de casa invertida simétrica con todas las esquinas suavizadas */}
        <path d="M5 4 Q5 1 7 1 L17 1 Q19 1 19 4 L19 16 Q19 17 18 17 Q15 20 12 22 Q9 20 6 17 Q5 17 5 16 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Agujero redondo en la parte superior */}
        <circle cx="12" cy="5" r="1.5" fill="white" stroke="white" strokeWidth="0.5" />
      </svg>
    )
  }
  
  return null
} 