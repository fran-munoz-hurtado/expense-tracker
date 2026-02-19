import { ImageResponse } from 'next/og'

export const alt = 'Controla — Control de gastos e ingresos'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 25%, #eff6ff 50%, #f0fdf4 75%, #ecfdf5 100%)',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 16,
          }}
        >
          Controla
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#4b5563',
            textAlign: 'center',
          }}
        >
          Control de gastos e ingresos
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#6b7280',
            marginTop: 24,
          }}
        >
          Finanzas personales y espacios compartidos
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
