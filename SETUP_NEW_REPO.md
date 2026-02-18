# Configuración del Nuevo Repositorio

## Pasos para configurar el nuevo repo en GitHub

1. **Crear el repositorio en GitHub:**
   - Ve a: https://github.com/new
   - Nombre del repo: `expense-tracker-v2` (o el que prefieras)
   - Descripción: "Modern expense tracking application built with Next.js and Supabase"
   - **Privado**: ✅ Sí
   - **NO** marques: README, .gitignore, o licencia
   - Click en "Create repository"

2. **Una vez creado, ejecuta estos comandos:**

```bash
# Opción A: Reemplazar el remote actual
git remote set-url origin https://github.com/fran-munoz-hurtado/NOMBRE_DEL_REPO.git

# Opción B: Agregar un nuevo remote (mantener el viejo)
git remote add new-origin https://github.com/fran-munoz-hurtado/NOMBRE_DEL_REPO.git
git remote rename origin old-origin
git remote rename new-origin origin

# Luego hacer push de todas las ramas
git push -u origin --all
git push -u origin --tags
```

3. **Configurar Netlify:**
   - Conectar el nuevo repo en Netlify
   - Configurar las variables de entorno de producción
   - El archivo `netlify.toml` ya está configurado

## Ramas que se mantendrán:
- `main` (rama principal)
- `release/1` (rama base de trabajo)
- `feature/visual-adjustments` (mergeada a release/1)
- `feature/visual-refactor` (rama actual de trabajo)

## Nota:
- No se hará merge a `main` por ahora
- Todas las ramas se mantendrán intactas
