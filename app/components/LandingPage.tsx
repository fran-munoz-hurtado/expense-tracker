'use client'

import Link from 'next/link'
import { Wallet, Users, TrendingUp, Calendar, ArrowRight, Check } from 'lucide-react'
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
              Finanzas personales
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-gray-900 tracking-tight leading-[1.1]">
              Sabes cuánto te{' '}
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">queda</span> cada mes?
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
              Controla tus gastos e ingresos en un solo lugar. Organiza tus finanzas personales o comparte espacios con familia o equipo.
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
          </div>
        </div>
      </header>

      {/* Featured — imagen + copy */}
      <section className="py-20 sm:py-28 bg-white" aria-labelledby="destacado">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50" role="img" aria-label="Dashboard de Controla mostrando gastos e ingresos">
                <PlaceholderImage className="w-full h-full" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 id="destacado" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900 tracking-tight">
                Todo tu dinero, una sola vista
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Dashboard claro con gastos recurrentes, ingresos y gastos únicos. Filtra por mes, categoría o tipo. Sin complicaciones.
              </p>
              <ul className="mt-6 space-y-3">
                {['Recurrentes y gastos únicos', 'Ingresos y ahorros', 'Pendientes vs pagados'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#0d9488' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios con imágenes */}
      <section className="py-20 sm:py-28 bg-slate-50" aria-labelledby="beneficios">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="beneficios" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900">
              ¿Por qué {texts.appTitle}?
            </h2>
            <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
              Diseñado para que organices tus finanzas sin fricción.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Wallet, title: 'Control total', desc: 'Gastos recurrentes, ingresos y gastos únicos en un dashboard claro.', img: true },
              { icon: Users, title: 'Espacios compartidos', desc: 'Comparte finanzas con familia o roomies. Cada uno ve y colabora.', img: true },
              { icon: TrendingUp, title: 'Objetivos y ahorro', desc: 'Define metas, haz seguimiento y ve cuánto vas logrando.', img: true },
              { icon: Calendar, title: 'Mes a mes', desc: 'Organizado por mes y año. Fácil de navegar y entender.', img: true },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
                <div className="aspect-[16/10] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)' }}>
                  <Icon className="w-12 h-12 group-hover:scale-110 transition-all" style={{ color: '#0d9488' }} />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-gray-600 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona — 4 pasos, espacios destacados */}
      <section className="py-20 sm:py-28 bg-white" aria-labelledby="como-funciona">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="como-funciona" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900">
              Cómo funciona
            </h2>
            <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
              En cuatro pasos simples empiezas a tener el control.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-lg shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>1</span>
              <h3 className="mt-5 font-semibold text-gray-900">Crea tu cuenta</h3>
              <p className="mt-2 text-gray-600 text-sm">Regístrate con Google o email en segundos.</p>
            </div>
            <div className="text-center relative">
              <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">Destacado</div>
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-lg shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>2</span>
              <h3 className="mt-5 font-semibold text-gray-900">Crea o únete a espacios compartidos</h3>
              <p className="mt-2 text-gray-600 text-sm">
                <strong className="text-gray-800">Lugares que puedes compartir</strong> con familia, roomies o equipo. Todos ven y colaboran en las finanzas del espacio.
              </p>
            </div>
            <div className="text-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-lg shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>3</span>
              <h3 className="mt-5 font-semibold text-gray-900">Agrega gastos e ingresos</h3>
              <p className="mt-2 text-gray-600 text-sm">Recurrentes o únicos. Con fechas y categorías.</p>
            </div>
            <div className="text-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-lg shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>4</span>
              <h3 className="mt-5 font-semibold text-gray-900">Sabe cuánto queda</h3>
              <p className="mt-2 text-gray-600 text-sm">Ve en tiempo real qué pagaste y qué falta por pagar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Espacios compartidos — sección destacada */}
      <section className="py-20 sm:py-28 bg-slate-50" aria-labelledby="espacios">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 id="espacios" className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-gray-900">
                Espacios que puedes compartir
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Crea espacios para casa, pareja, roomies o equipo. Invita a quien quieras y colaboren juntos en las finanzas del hogar o proyecto.
              </p>
              <ul className="mt-6 space-y-3">
                {['Casa o apartamento compartido', 'Finanzas en pareja', 'Proyectos o equipos', 'Cada miembro colabora'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#0d9488' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div role="img" aria-label="Espacios compartidos para finanzas en familia o equipo">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50">
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #dbeafe 100%)' }} aria-hidden>
                  <Users className="w-24 h-24 opacity-60" style={{ color: '#0d9488' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 sm:py-32" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0d9488 100%)' }}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white">
            Listo para tomar el control?
          </h2>
          <p className="mt-4 text-lg text-blue-100">Empieza gratis. Sin tarjeta de crédito.</p>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-semibold bg-white hover:bg-gray-50 rounded-xl shadow-xl transition-all"
            style={{ color: '#0d9488' }}
            aria-label="Empezar ahora — Ir a registro o login"
          >
            Empezar ahora <ArrowRight className="w-5 h-5" aria-hidden />
          </Link>
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
