# Inicio de sesión con Google - Guía paso a paso

## ⚠️ Importante: Todo es gratuito, sin costo

**No necesitas tarjeta de crédito.** Lo que vamos a configurar es 100% gratuito:

- Crear un proyecto en Google Cloud → **gratis**
- OAuth 2.0 / "Sign in with Google" → **gratis** (no genera costos)
- Supabase como proveedor de auth → **gratis** (plan free)

**Qué NO haremos** (para evitar costos):

- No activaremos facturación en Google Cloud
- No habilitaremos APIs de pago (Storage, Compute, etc.)
- Solo usamos OAuth para identificación (email, nombre, foto de perfil)

---

## Parte 1: Configuración en Google Cloud Console

### Paso 1.1: Crear un proyecto (o usar uno existente)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. En la barra superior verás el nombre del proyecto actual y un dropdown
4. Clic en el dropdown del proyecto
5. Clic en **"Nuevo proyecto"** (New Project)
6. Nombre del proyecto: ej. "Controla" o "expense-tracker"
7. Clic en **Crear**
8. Espera unos segundos. No toques ninguna opción de facturación.

### Paso 1.2: Ir a la pantalla de consentimiento OAuth

1. En el menú lateral izquierdo: **APIs y servicios** (APIs & Services) → **OAuth consent screen**
2. Si te pide elegir tipo de usuario:
   - Elige **External** (usuarios externos) si quieres que cualquiera con cuenta Google pueda iniciar sesión
   - Clic en **Crear**

### Paso 1.3: Completar la pantalla de consentimiento (Paso 1 de 4)

1. **App name**: Controla (o el nombre de tu app)
2. **User support email**: selecciona tu correo
3. **Developer contact information**: tu correo
4. Clic en **Guardar y continuar**

### Paso 1.4: Scopes (Paso 2 de 4)

1. Clic en **Add or remove scopes**
2. En el buscador, busca y marca:
   - `email` (o `.../auth/userinfo.email`)
   - `profile` (o `.../auth/userinfo.profile`)
   - `openid`
3. Clic en **Update** y luego **Guardar y continuar**

### Paso 1.5: Test users (si está en modo Testing)

Si tu app está en **Testing**:
- En el Paso 3, puedes añadir tu correo como "Test user" para poder probar
- O simplemente continúa (en Testing, usuarios no añadidos verán una advertencia pero pueden continuar)

Clic en **Guardar y continuar** hasta llegar al Paso 4 y **Volver al panel**.

### Paso 1.6: Crear credenciales OAuth 2.0

1. Menú lateral: **APIs y servicios** → **Credentials**
2. Clic en **+ Create Credentials** → **OAuth client ID**
3. **Application type**: **Web application**
4. **Name**: "expense-tracker-web" (o el nombre que quieras)
5. **Authorized JavaScript origins**:
   - Clic en **+ ADD URI**
   - Añade `http://localhost:3000` (desarrollo)
   - Si ya tienes dominio en producción, añade `https://tu-dominio.netlify.app`
6. **Authorized redirect URIs**:
   - Clic en **+ ADD URI**
   - Añade: `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`
   - Reemplaza `TU_PROJECT_REF` por el ID de tu proyecto Supabase (lo ves en la URL del dashboard, ej. `abcdefgh` en `https://supabase.com/dashboard/project/abcdefgh`)
7. Clic en **Create**
8. Se mostrará un modal con **Client ID** y **Client Secret** → cópialos y guárdalos (los usarás en Supabase)

### Paso 1.7: Verificar que no hay facturación activa

1. Menú lateral: **Facturación** (Billing)
2. Si ves "No hay facturación asociada" o similar → perfecto, no hay costos
3. **No actives facturación** para este uso

**Dónde encontrar el Project REF de Supabase:** En [Supabase Dashboard](https://supabase.com/dashboard), selecciona tu proyecto. La URL será algo como `https://supabase.com/dashboard/project/abcdefghijklmnop` → el `abcdefghijklmnop` es tu Project REF. La URL de callback será `https://abcdefghijklmnop.supabase.co/auth/v1/callback`.

---

## Parte 2: Configuración en Supabase

### 1. Habilitar el proveedor Google

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Providers**
4. Busca **Google** y actívalo
5. Pega el **Client ID** de Google
6. Pega el **Client Secret** de Google
7. Guarda

### 2. Configurar URLs de redirección

1. En **Authentication** → **URL Configuration**
2. Asegúrate de tener:
   - **Site URL**: `https://tu-app.netlify.app` (o `http://localhost:3000` en dev)
   - **Redirect URLs**: añade las URLs donde tu app está alojada, p. ej.:
     - `https://tu-app.netlify.app/**`
     - `http://localhost:3000/**`

Tras iniciar sesión con Google, la app redirige al usuario a `/mis-cuentas`. El cliente Supabase (`detectSessionInUrl: true`, `flowType: 'pkce'`) detecta la sesión en la URL y carga el perfil automáticamente.

### 3. Migración handle_new_user (ya incluida)

El trigger `handle_new_user` crea el perfil en `public.users` cuando un usuario se registra (incluido con Google). Debe soportar los metadatos de Google:

- Google envía `full_name`, `name`, o `given_name` + `family_name`
- Si el trigger actual solo usa `first_name` y `last_name`, hay que actualizarlo para leer también `full_name` o `name` de Google

---

## Parte 3: Cambios en la aplicación

### 1. Añadir la función de login con Google

En `lib/services/supabaseAuth.ts` se añade `handleSupabaseGoogleLogin()` que llama a `supabase.auth.signInWithOAuth({ provider: 'google' })`.

### 2. Botón en LoginPage

En `app/components/LoginPage.tsx` se añade un botón "Continuar con Google" que llama a esa función.

### 3. Manejo del redirect

`signInWithOAuth` redirige al usuario a Google. Tras autenticarse, Google redirige de vuelta a la URL de callback de Supabase, que devuelve al usuario a tu app con la sesión ya establecida. El `authStore` y `onAuthStateChange` detectan la sesión y cargan el perfil.

### 4. Usuarios nuevos (Google)

Si el trigger `handle_new_user` está configurado correctamente, al crear el usuario en `auth.users` se crea el perfil en `public.users`. Para usuarios de Google hay que leer nombres desde `full_name`, `given_name`/`family_name` o `name`.

---

## Resumen rápido

| Paso | Dónde | Acción |
|------|-------|--------|
| 1 | Google Cloud | Crear proyecto (sin facturación) |
| 2 | Google Cloud | Pantalla de consentimiento OAuth (External, scopes email/profile/openid) |
| 3 | Google Cloud | Crear OAuth client ID (Web application) |
| 4 | Supabase | Authentication → Providers → Google → Pegar Client ID y Secret |
| 5 | Supabase | URL Configuration: Site URL y Redirect URLs |
| 6 | App | Ya implementado: botón "Continuar con Google" |

## Lista de verificación: sin costos

- [ ] No activaste facturación en Google Cloud
- [ ] Solo usas OAuth credentials (no habilitaste APIs de pago)
- [ ] Supabase en plan free
