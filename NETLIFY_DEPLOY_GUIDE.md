# 🚀 Guía de Deploy en Netlify

## ✅ Estado del Proyecto

- ✅ **package.json** en la raíz con scripts correctos
- ✅ **netlify.toml** optimizado para Next.js
- ✅ **Next.js 14** con configuración estándar
- ✅ **Supabase Auth** integrado
- ✅ **Build verificado** localmente

## 📋 Pasos para Deploy

### 1. Conectar Repositorio en Netlify

1. Ve a [netlify.com](https://netlify.com) y crea una cuenta
2. Click en **"New site from Git"**
3. Conecta con **GitHub** y autoriza Netlify
4. Selecciona el repositorio: `fran-munoz-hurtado/expense-tracker`

### 2. Configuración de Build

Netlify detectará automáticamente la configuración desde `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Si Netlify no detecta automáticamente, configura manualmente:**
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Branch to deploy:** `main`

### 3. Variables de Entorno (CRÍTICO)

En **Site settings → Environment variables**, agrega:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://iilffwwqtgsgubhnspfe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGZmd3dxdGdzZ3ViaG5zcGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDg4NDEsImV4cCI6MjA2NzIyNDg0MX0.TlC4_qYYDbdylLSWLml7dOSABIKXOKnNH9DUaC7lzro

# Site URL (reemplaza con tu URL real de Netlify)
NEXT_PUBLIC_SITE_URL=https://tu-app-name.netlify.app
```

### 4. Configuración en Supabase

#### A. Authentication Settings
En **Authentication → Settings → General:**
```
Site URL: https://tu-app-name.netlify.app
```

#### B. Redirect URLs
En **Authentication → Settings → Redirect URLs:**
```
https://tu-app-name.netlify.app/**
https://tu-app-name.netlify.app/reset-password
https://tu-app-name.netlify.app/forgot-password
```

#### C. Email Templates
En **Authentication → Email Templates → Reset password:**
```
{{ .SiteURL }}/reset-password?token={{ .Token }}&type=recovery
```

#### D. RLS Policies
Ejecuta el archivo `supabase-production-policies.sql` en el SQL Editor de Supabase.

### 5. Deploy y Verificación

1. **Primer Deploy:** Netlify iniciará automáticamente el build
2. **Obtener URL:** Una vez completado, obtendrás una URL como `https://amazing-app-123456.netlify.app`
3. **Actualizar Variables:** Cambia `NEXT_PUBLIC_SITE_URL` por tu URL real
4. **Actualizar Supabase:** Cambia la Site URL y Redirect URLs en Supabase
5. **Redeploy:** Netlify hará redeploy automáticamente

## 🔧 Troubleshooting

### Build Fails
```bash
# Verificar localmente
npm install
npm run build
```

### Auth No Funciona
- ✅ Verificar variables de entorno en Netlify
- ✅ Verificar Site URL en Supabase
- ✅ Verificar Redirect URLs en Supabase

### 404 en Rutas
- ✅ Verificar que `netlify.toml` tenga los redirects
- ✅ Verificar que el plugin Next.js esté instalado

## 📊 Límites Capa Gratuita

- ✅ **100 GB** bandwidth/mes
- ✅ **300 minutos** build/mes
- ✅ **Deploy automático** desde Git
- ✅ **HTTPS** incluido
- ✅ **Subdomain** .netlify.app gratuito

## 🔄 Deploy Automático

Una vez configurado, cada push a `main` activará automáticamente:
1. Build en Netlify
2. Deploy automático
3. Invalidación de cache
4. URL actualizada

## 📝 Notas Importantes

- El archivo `.env.local` NO se sube a Git (está en .gitignore)
- Las variables de entorno se configuran directamente en Netlify
- El build toma ~2-3 minutos en la primera vez
- Deployments subsecuentes son más rápidos (~1 minuto) 