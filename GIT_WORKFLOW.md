# Flujo de Trabajo Git - Expense Tracker

## Ramas Principales

### `main`
- Rama principal del repositorio
- Contiene el código estable y funcional
- **NO hacer cambios directos aquí**

### `stable`
- Rama de respaldo estable
- Contiene el código que sabemos que funciona
- Punto de retorno seguro en caso de problemas

## Flujo de Trabajo Recomendado

### 1. Para nuevas features o cambios grandes

```bash
# 1. Asegurarse de estar en la rama stable
git checkout stable

# 2. Crear una nueva rama para la feature
git checkout -b feature/nombre-de-la-feature

# 3. Hacer los cambios y commits
git add .
git commit -m "feat: descripción de los cambios"

# 4. Si todo funciona bien, hacer merge a stable
git checkout stable
git merge feature/nombre-de-la-feature

# 5. Si hay problemas, simplemente volver a stable
git checkout stable
git branch -D feature/nombre-de-la-feature
```

### 2. Para cambios pequeños o correcciones

```bash
# 1. Crear rama desde stable
git checkout stable
git checkout -b fix/nombre-del-fix

# 2. Hacer cambios y commit
git add .
git commit -m "fix: descripción del fix"

# 3. Merge a stable si funciona
git checkout stable
git merge fix/nombre-del-fix
```

### 3. En caso de emergencia (código roto)

```bash
# Volver inmediatamente a la rama estable
git checkout stable

# Eliminar la rama problemática
git branch -D nombre-rama-problematica

# El código está ahora en un estado funcional
```

## Comandos Útiles

### Ver todas las ramas
```bash
git branch -a
```

### Ver en qué rama estás
```bash
git branch
```

### Ver el historial de commits
```bash
git log --oneline --graph
```

### Descartar cambios no committeados
```bash
git checkout -- .
```

### Ver diferencias entre ramas
```bash
git diff stable..nombre-otra-rama
```

## Convenciones de Nombres

- `feature/` - Para nuevas funcionalidades
- `fix/` - Para correcciones de bugs
- `refactor/` - Para refactorización de código
- `docs/` - Para documentación
- `test/` - Para pruebas

## Ejemplos de Uso

### Implementar internacionalización
```bash
git checkout stable
git checkout -b feature/internationalization
# ... hacer cambios ...
# Si no funciona:
git checkout stable
git branch -D feature/internationalization
```

### Corregir un bug
```bash
git checkout stable
git checkout -b fix/login-error
# ... hacer cambios ...
# Si funciona:
git checkout stable
git merge fix/login-error
```

## Notas Importantes

1. **Siempre trabajar desde `stable`** - Esta es tu rama de seguridad
2. **Una feature por rama** - Mantén las ramas enfocadas
3. **Commits descriptivos** - Usa mensajes claros
4. **Probar antes de merge** - Asegúrate de que funciona
5. **No tener miedo de eliminar ramas** - Si algo no funciona, elimínala y empieza de nuevo

## Estado Actual

- ✅ `main` - Código original del repositorio
- ✅ `stable` - Código funcional actual (sin i18n)
- 🔄 `feature/*` - Ramas para nuevas features 