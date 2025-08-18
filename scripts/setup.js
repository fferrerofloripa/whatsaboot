/**
 * Script de configuración inicial para WhatsaBoot
 * Ejecuta este script después de la instalación para configurar el sistema
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando WhatsaBoot...\n');

// Crear directorios necesarios
const directories = [
    'database',
    'logs',
    'public/images',
    '.wwebjs_auth',
    'qr_codes'
];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Creado directorio: ${dir}`);
    } else {
        console.log(`ℹ️  Directorio ya existe: ${dir}`);
    }
});

// Verificar archivo .env
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    const envExamplePath = path.join(__dirname, '..', 'env.example');
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Archivo .env creado desde env.example');
        console.log('⚠️  IMPORTANTE: Configura las variables en .env antes de continuar');
    } else {
        console.log('❌ No se encontró env.example');
    }
} else {
    console.log('✅ Archivo .env ya configurado');
}

// Crear imagen de avatar por defecto
const defaultAvatarPath = path.join(__dirname, '..', 'public', 'images', 'default-avatar.png');
if (!fs.existsSync(defaultAvatarPath)) {
    // Crear un archivo SVG simple como avatar por defecto
    const defaultAvatarSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="#E5E7EB"/>
    <path d="M32 32c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zM32 36c-5.333 0-16 2.667-16 8v4h32v-4c0-5.333-10.667-8-16-8z" fill="#9CA3AF"/>
</svg>`;
    
    fs.writeFileSync(defaultAvatarPath.replace('.png', '.svg'), defaultAvatarSvg);
    console.log('✅ Avatar por defecto creado');
}

console.log('\n🎉 Configuración inicial completada!');
console.log('\n📋 Próximos pasos:');
console.log('1. Instalar dependencias: npm install');
console.log('2. Configurar variables en .env');
console.log('3. Iniciar la aplicación: npm start');
console.log('\n🌐 La aplicación estará disponible en: http://localhost:3000');
console.log('👤 El primer usuario registrado será administrador automáticamente');
