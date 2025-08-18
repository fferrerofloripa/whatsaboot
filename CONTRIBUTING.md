# 🤝 Contribuir a WhatsaBoot

¡Gracias por tu interés en contribuir a WhatsaBoot! Este documento te guiará a través del proceso.

## 🚀 Configuración del Entorno de Desarrollo

### 1. Fork y Clona
```bash
# Fork el repositorio en GitHub, luego:
git clone https://github.com/TU_USERNAME/whatsaboot.git
cd whatsaboot
```

### 2. Configuración Inicial
```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Configurar la aplicación
npm run setup
```

### 3. Configurar Google OAuth
Sigue las instrucciones en el README para configurar Google OAuth y actualiza tu archivo `.env`.

## 📋 Proceso de Contribución

### 1. Crear Rama
```bash
# Crear rama desde main
git checkout main
git pull origin main
git checkout -b feature/descripcion-breve

# O para correcciones:
git checkout -b fix/descripcion-del-fix
```

### 2. Desarrollar
- Escribe código limpio y bien comentado
- Sigue las convenciones existentes del proyecto
- Agrega tests si es necesario

### 3. Commits
```bash
# Commits descriptivos
git add .
git commit -m "feat: agregar funcionalidad X"

# O para fixes:
git commit -m "fix: corregir problema Y"
```

### 4. Push y Pull Request
```bash
git push origin feature/descripcion-breve
```

Luego abre un Pull Request en GitHub con:
- Título descriptivo
- Descripción detallada de los cambios
- Screenshots si aplican
- Referencias a issues relacionados

## 🎯 Tipos de Contribuciones

### 🐛 Reportar Bugs
- Usa el template de issue para bugs
- Incluye pasos para reproducir
- Agrega logs relevantes
- Especifica tu entorno (OS, Node.js version, etc.)

### ✨ Nuevas Funcionalidades
- Abre un issue para discutir la funcionalidad
- Espera feedback antes de implementar
- Incluye documentación y tests

### 📖 Documentación
- Mejoras al README
- Comentarios en código
- Ejemplos de uso
- Guías de configuración

### 🎨 Mejoras UI/UX
- Screenshots del antes/después
- Descripción de la mejora
- Consideraciones de accesibilidad

## 🏗️ Estructura del Proyecto

```
WhatsaBoot/
├── config/          # Configuración de servicios
├── controllers/     # Lógica de controladores
├── middleware/      # Middlewares de autenticación
├── models/          # Modelos de base de datos
├── routes/          # Rutas API y vistas
├── services/        # Servicios de negocio
├── views/           # Templates EJS
├── public/          # Assets estáticos
└── scripts/         # Scripts de utilidad
```

## 📝 Estándares de Código

### JavaScript
- Usar ES6+ features
- Preferir `const`/`let` sobre `var`
- Funciones async/await sobre Promises
- Comentarios JSDoc para funciones públicas

### EJS Templates
- Indentación de 4 espacios
- Comentarios para secciones complejas
- Clases Tailwind organizadas

### Base de Datos
- Migraciones para cambios de esquema
- Validaciones en los modelos
- Índices apropiados

### CSS/Tailwind
- Usar clases utility-first
- Componentes reutilizables
- Responsive design

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm test

# Tests específicos
npm test -- --grep "nombre del test"

# Coverage
npm run test:coverage
```

## 📊 Debug y Logs

### Logs de Desarrollo
```bash
# Ver logs en tiempo real
tail -f logs/combined.log

# Logs específicos de WhatsApp
tail -f logs/combined.log | grep "WhatsApp"
```

### Debug en Browser
- Usar DevTools para JavaScript
- Console logs descriptivos
- Network tab para APIs

## 🚨 Reglas Importantes

### ❌ No Hagas
- No commitees credenciales o secrets
- No subas archivos de base de datos
- No rompas la funcionalidad existente
- No hagas cambios masivos sin discusión

### ✅ Sí Haz
- Tests para nuevas funcionalidades
- Documentación para APIs nuevas
- Backup antes de cambios grandes
- Code review antes de merge

## 🔄 Proceso de Review

### Para Revisores
- Revisa funcionalidad y código
- Ejecuta la aplicación localmente
- Verifica que no rompa funcionalidad existente
- Da feedback constructivo

### Para Contribuidores
- Responde a comentarios promptamente
- Haz cambios solicitados
- Mantén el PR actualizado con main
- Se paciente durante el review

## 🎉 Después del Merge

- Elimina tu rama feature
- Actualiza tu fork
- ¡Celebra tu contribución! 🎊

```bash
git checkout main
git pull origin main
git branch -d feature/tu-feature
```

## 📞 ¿Necesitas Ayuda?

- 💬 **Discusiones:** Para preguntas generales
- 🐛 **Issues:** Para bugs específicos
- 📧 **Email:** Para temas privados

## 🙏 Reconocimientos

Todos los contribuidores serán reconocidos en:
- README.md
- Releases notes
- Contributors page

¡Gracias por hacer WhatsaBoot mejor! 🚀
