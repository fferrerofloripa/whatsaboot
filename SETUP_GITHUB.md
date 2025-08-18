# 🚀 Configuración para GitHub

## 1. Configurar Git (Primera vez)

```bash
# Configurar tu identidad en Git
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@gmail.com"

# Verificar configuración
git config --list
```

## 2. Hacer el commit inicial

```bash
# Hacer el commit inicial
git commit -m "🚀 Initial commit: WhatsaBoot v1.0.0

✨ Complete WhatsApp bot management system with:
- Google OAuth 2.0 authentication
- Multiple WhatsApp instances management  
- Automated responses system
- Admin panel with user & number management
- Real-time logs and debugging panel
- Modern UI with Tailwind CSS
- Socket.IO real-time updates

🛠️ Tech Stack: Node.js, Express, SQLite, Sequelize, EJS, Tailwind, Socket.IO"

# Verificar commit
git log --oneline
```

## 3. Crear repositorio en GitHub

1. **Ve a [GitHub.com](https://github.com)**
2. **Clic en "New repository"**
3. **Configuración del repositorio:**
   - **Repository name:** `whatsaboot`
   - **Description:** `Complete WhatsApp bot management system with admin panel, automated responses, and OAuth authentication`
   - **Visibility:** Public (o Private si prefieres)
   - **NO marques:** "Add a README file" (ya tenemos uno)
   - **NO marques:** "Add .gitignore" (ya tenemos uno)
   - **License:** MIT (o deja vacío, ya tenemos LICENSE)

4. **Clic en "Create repository"**

## 4. Conectar repositorio local con GitHub

```bash
# Agregar remote origin (reemplaza TU_USERNAME con tu usuario GitHub)
git remote add origin https://github.com/TU_USERNAME/whatsaboot.git

# Verificar remote
git remote -v

# Push inicial
git push -u origin main
```

## 5. Personalizar URLs en archivos

Después de crear el repositorio, actualiza estas URLs en los archivos:

### package.json
```json
{
  "repository": {
    "url": "git+https://github.com/TU_USERNAME/whatsaboot.git"
  },
  "bugs": {
    "url": "https://github.com/TU_USERNAME/whatsaboot/issues"
  },
  "homepage": "https://github.com/TU_USERNAME/whatsaboot#readme"
}
```

### README.md
Busca y reemplaza:
- `https://github.com/tu-usuario/whatsaboot.git` → `https://github.com/TU_USERNAME/whatsaboot.git`
- `tu-usuario` → `TU_USERNAME`

## 6. Hacer commit de las actualizaciones

```bash
# Agregar cambios de URLs
git add package.json README.md

# Commit de actualizaciones
git commit -m "📝 Update repository URLs and author info"

# Push cambios
git push origin main
```

## 7. Configurar GitHub repository (Opcional)

### En GitHub.com → Tu repositorio:

1. **Settings → General:**
   - ✅ **Features:** Issues, Wikis, Discussions
   - ✅ **Pull Requests:** Allow merge commits, squash merging

2. **Settings → Pages:**
   - Si quieres documentación online

3. **Settings → Security:**
   - ✅ **Vulnerability alerts**
   - ✅ **Dependabot alerts**

## 8. Crear releases (Cuando esté listo)

```bash
# Crear tag para release
git tag -a v1.0.0 -m "🎉 WhatsaBoot v1.0.0 - First stable release"

# Push tag
git push origin v1.0.0
```

Luego en GitHub → Releases → "Create a new release"

## 9. Proteger rama main (Recomendado)

**Settings → Branches → Add rule:**
- **Branch name pattern:** `main`
- ✅ **Require pull request reviews before merging**
- ✅ **Require status checks to pass before merging**

## 10. Comandos útiles para desarrollo

```bash
# Crear nueva rama para feature
git checkout -b feature/nueva-funcionalidad

# Trabajar en la rama...
git add .
git commit -m "✨ feat: agregar nueva funcionalidad"

# Push rama
git push origin feature/nueva-funcionalidad

# Después del merge, actualizar main
git checkout main
git pull origin main
git branch -d feature/nueva-funcionalidad
```

## 🎉 ¡Listo!

Tu proyecto WhatsaBoot está ahora en GitHub y listo para:
- ✅ Colaboración
- ✅ Issues y Pull Requests
- ✅ CI/CD con GitHub Actions
- ✅ Releases automáticos
- ✅ Documentación colaborativa

## 📞 Próximos pasos sugeridos

1. **Agregar screenshots** al README
2. **Configurar GitHub Actions** para tests automáticos
3. **Invitar colaboradores**
4. **Crear issues** para mejoras futuras
5. **Documentar la API** más detalladamente
