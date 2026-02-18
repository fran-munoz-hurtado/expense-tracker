#!/bin/bash

# Script para crear el nuevo proyecto Mi-Casa-en-Orden desde cero
# Ejecutar desde: /Users/fran/Documents/

set -e

PROJECT_NAME="Mi-Casa-en-Orden"
PROJECT_DIR="/Users/fran/Documents/$PROJECT_NAME"
GITHUB_REPO="https://github.com/fran-munoz-hurtado/Mi-Casa-en-Orden.git"

echo "🚀 Creando nuevo proyecto: $PROJECT_NAME"

# Crear directorio
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "📁 Directorio creado: $PROJECT_DIR"

# Inicializar git
git init
git branch -M main

echo "✅ Git inicializado"

# Configurar remote
git remote add origin "$GITHUB_REPO"

echo "✅ Remote configurado: $GITHUB_REPO"

# Crear archivos iniciales (ya creados por el asistente)
# Los archivos .gitignore, README.md y netlify.toml ya están creados

# Hacer commit inicial
git add .
git commit -m "Initial commit: Setup project structure for Netlify deployment"

echo "✅ Commit inicial creado"

# Push al repositorio
echo "📤 Haciendo push al repositorio..."
git push -u origin main

echo ""
echo "✅ ¡Proyecto creado exitosamente!"
echo ""
echo "📍 Ubicación: $PROJECT_DIR"
echo "🔗 Repositorio: $GITHUB_REPO"
echo ""
echo "Próximos pasos:"
echo "1. Abre el directorio en Cursor: $PROJECT_DIR"
echo "2. Ejecuta: npm init -y (o crea package.json manualmente)"
echo "3. Instala Next.js y dependencias"
echo "4. Configura las variables de entorno"
