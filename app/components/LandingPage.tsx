'use client'

import Link from 'next/link'
import { Wallet, Users, ArrowRight, Check } from 'lucide-react'
import { texts } from '@/lib/translations'

/* Placeholder para imágenes - reemplaza con tus assets */
const PlaceholderImage = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`} style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #d1fae5 100%)' }}>
    <div className="opacity-50" style={{ color: '#0d9488' }}>
      <Wallet className="w-16 h-16 sm:w-24 sm:h-24" />
    </div>
  </div>
)

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero — premium con gradiente */}
      <header className="relative overflow-hidden min-h-[520px] sm:min-h-[580px]">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: "url('/hero-bg.svg')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 25%, #eff6ff 50%, #f0fdf4 75%, #ecfdf5 100%)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/50 via-transparent to-white/80" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-medium tracking-wide uppercase mb-4" style={{ color: '#0d9488' }}>
              FINANZAS PERSONALES Y COMPARTIDAS
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-gray-900 tracking-tight leading-[1.1]">
              ¿Sabes realmente con cuánto cuentas este mes?
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
              Organiza tus ingresos y obligaciones en espacios claros.
              <br />
              En pocos clics sabrás cuánto puedes gastar sin afectar tus pagos.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              Sin Excel. Sin estrés. Más simple de lo que crees.
            </p>
            <nav className="mt-12 flex flex-col sm:flex-row gap-4 justify-center" aria-label="Acciones principales">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)', boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)' }}
                aria-label="Empezar gratis — Crear cuenta"
              >
                Empezar gratis <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl border-2 transition-all bg-white/80 hover:bg-white backdrop-blur-sm"
                style={{ color: '#0d9488', borderColor: 'rgba(13, 148, 136, 0.4)' }}
                aria-label="Ya tengo cuenta — Iniciar sesión"
              >
                Ya tengo cuenta
              </Link>
            </nav>
            <p className="mt-4 text-sm text-gray-500">
              Crea tu primer espacio en menos de un minuto.
            </p>
          </div>
        </div>
      </header>

      {/* Rompe la barrera mental */}
      <section className="py-20 sm:py-28 bg-white" aria-labelledby="rompe-barrera">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50" role="img" aria-label="Organizar tu dinero no tiene que ser complicado">
                <PlaceholderImage className="w-full h-full" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 id="rompe-barrera" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900 tracking-tight">
                Organizar tu dinero no tiene que ser complicado.
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                No necesitas hacer un presupuesto complejo.
                <br />
                No necesitas fórmulas ni hojas de cálculo.
                <br />
                Solo necesitas dos cosas: registrar lo que entra y registrar lo que debes pagar.
                <br />
                Controla organiza el resto automáticamente y te muestra cuánto te queda realmente disponible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Espacios (concepto) */}
      <section className="py-20 sm:py-28 bg-slate-50" aria-labelledby="espacios">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 id="espacios" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900">
                Todo se organiza por espacios.
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Tu vida financiera no es una sola lista.
                <br />
                Con Controla puedes crear espacios independientes para separar tus cuentas y coordinarlas mejor.
              </p>
              <ul className="mt-6 space-y-3">
                {['🏠 Familia', '💑 Pareja', '👥 Roomies', '📂 Proyectos', '👤 Personal'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#0d9488' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-gray-600">
                Cada espacio tiene sus propios ingresos, obligaciones y metas. Todo separado. Todo claro.
              </p>
            </div>
            <div role="img" aria-label="Espacios para organizar finanzas personales y compartidas">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50">
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #dbeafe 100%)' }} aria-hidden>
                  <Users className="w-24 h-24 opacity-60" style={{ color: '#0d9488' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficio central — Disponible real */}
      <section className="py-20 sm:py-28 bg-white" aria-labelledby="disponible-real">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50" role="img" aria-label="Sabe cuánto puedes gastar sin afectar tus obligaciones">
                <PlaceholderImage className="w-full h-full" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 id="disponible-real" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900 tracking-tight">
                Sabe cuánto puedes gastar sin afectar tus obligaciones.
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                En cada espacio puedes ver tu mes completo, con claridad real.
              </p>
              <ul className="mt-6 space-y-3">
                {['💰 Ingresos del mes', '📌 Obligaciones pendientes ordenadas por vencimiento', '✔️ Pagos realizados', '🟢 Disponible real después de cubrir lo comprometido'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#0d9488' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-lg text-gray-700 font-medium">
                No adivinas. No dependes de memoria. Tienes claridad real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Finanzas compartidas */}
      <section className="py-20 sm:py-28 bg-slate-50" aria-labelledby="finanzas-compartidas">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 id="finanzas-compartidas" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900">
                Coordina finanzas compartidas sin discusiones.
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Invita miembros a un espacio.
                <br />
                Todos ven las mismas obligaciones.
                <br />
                Todos saben qué falta pagar.
              </p>
              <p className="mt-6 text-gray-700">
                Sin mensajes cruzados. Sin &quot;yo pensé que ya lo habías pagado&quot;.
              </p>
            </div>
            <div role="img" aria-label="Coordina finanzas compartidas con tu familia o equipo">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50">
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #dbeafe 100%)' }} aria-hidden>
                  <Users className="w-24 h-24 opacity-60" style={{ color: '#0d9488' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ideal si… */}
      <section className="py-20 sm:py-28 bg-white" aria-labelledby="ideal-si">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="ideal-si" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900">
              Ideal si quieres:
            </h2>
          </div>
          <ul className="max-w-2xl mx-auto space-y-3">
            {['Organizar pagos mensuales', 'No olvidar vencimientos', 'Saber cuánto puedes gastar', 'Llevar finanzas familiares claras', 'Separar proyectos sin mezclar cuentas'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-gray-700 text-lg">
                <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#0d9488' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 sm:py-32" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0d9488 100%)' }}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white">
            Empieza a saber con cuánto cuentas realmente.
          </h2>
          <p className="mt-4 text-lg text-blue-100">Crea tu primer espacio hoy. Es más sencillo de lo que crees.</p>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-semibold bg-white hover:bg-gray-50 rounded-xl shadow-xl transition-all"
            style={{ color: '#0d9488' }}
            aria-label="Empezar gratis — Ir a registro o login"
          >
            Empezar gratis <ArrowRight className="w-5 h-5" aria-hidden />
          </Link>
          <p className="mt-4 text-sm text-blue-100/90">Sin tarjeta de crédito.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500">
            <p>{texts.appTitle} — Control de gastos e ingresos</p>
            <Link href="/como-funciona" className="hover:text-blue-600 transition-colors">
              Cómo funciona
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
