import LandingPage from '../components/LandingPage'
import ClientAuthRedirect from '../components/ClientAuthRedirect'

/**
 * Página raíz: siempre renderiza la landing en SSR para SEO.
 * La redirección de usuarios autenticados ocurre en cliente tras hidratación.
 */
export default function HomePage() {
  return (
    <>
      <LandingPage />
      <ClientAuthRedirect />
    </>
  )
}
