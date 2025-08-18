/**
 * Script de verificación de salud del sistema WhatsaBoot
 * Verifica que todos los componentes estén funcionando correctamente
 */

const fs = require('fs');
const path = require('path');

async function healthCheck() {
    console.log('🔍 Verificando estado del sistema WhatsaBoot...\n');
    
    let issues = [];
    let warnings = [];
    
    // Verificar archivos críticos
    const criticalFiles = [
        '.env',
        'package.json',
        'index.js',
        'config/database.js',
        'config/passport.js',
        'services/whatsappService.js'
    ];
    
    console.log('📁 Verificando archivos críticos...');
    criticalFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - FALTANTE`);
            issues.push(`Archivo faltante: ${file}`);
        }
    });
    
    // Verificar directorios necesarios
    const requiredDirs = [
        'database',
        'logs',
        'public',
        '.wwebjs_auth'
    ];
    
    console.log('\n📂 Verificando directorios...');
    requiredDirs.forEach(dir => {
        const dirPath = path.join(__dirname, '..', dir);
        if (fs.existsSync(dirPath)) {
            console.log(`✅ ${dir}/`);
        } else {
            console.log(`⚠️  ${dir}/ - NO EXISTE`);
            warnings.push(`Directorio faltante: ${dir}/`);
        }
    });
    
    // Verificar variables de entorno
    console.log('\n🔐 Verificando configuración...');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    
    const requiredEnvVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'SESSION_SECRET'
    ];
    
    requiredEnvVars.forEach(envVar => {
        if (process.env[envVar] && process.env[envVar] !== 'your_' + envVar.toLowerCase() + '_here') {
            console.log(`✅ ${envVar}`);
        } else {
            console.log(`❌ ${envVar} - NO CONFIGURADO`);
            issues.push(`Variable de entorno no configurada: ${envVar}`);
        }
    });
    
    // Verificar dependencias
    console.log('\n📦 Verificando dependencias...');
    try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
        const nodeModules = path.join(__dirname, '..', 'node_modules');
        
        if (fs.existsSync(nodeModules)) {
            console.log('✅ node_modules existe');
            
            // Verificar algunas dependencias críticas
            const criticalDeps = ['express', 'sequelize', 'whatsapp-web.js', 'passport'];
            criticalDeps.forEach(dep => {
                const depPath = path.join(nodeModules, dep);
                if (fs.existsSync(depPath)) {
                    console.log(`✅ ${dep}`);
                } else {
                    console.log(`❌ ${dep} - NO INSTALADO`);
                    issues.push(`Dependencia faltante: ${dep}`);
                }
            });
        } else {
            console.log('❌ node_modules - NO EXISTE');
            issues.push('Dependencias no instaladas. Ejecuta: npm install');
        }
    } catch (error) {
        console.log('❌ Error leyendo package.json');
        issues.push('Error leyendo package.json: ' + error.message);
    }
    
    // Verificar conectividad de base de datos (si es posible)
    console.log('\n🗄️  Verificando base de datos...');
    try {
        const sequelize = require('../config/database');
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos exitosa');
    } catch (error) {
        console.log('⚠️  No se pudo conectar a la base de datos');
        warnings.push('Error de conexión a BD: ' + error.message);
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(50));
    
    if (issues.length === 0 && warnings.length === 0) {
        console.log('🎉 ¡Todos los sistemas funcionan correctamente!');
        console.log('✅ WhatsaBoot está listo para usar');
    } else {
        if (issues.length > 0) {
            console.log('\n❌ PROBLEMAS CRÍTICOS:');
            issues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (warnings.length > 0) {
            console.log('\n⚠️  ADVERTENCIAS:');
            warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        console.log('\n🔧 Corrige estos problemas antes de usar WhatsaBoot');
    }
    
    console.log('\n📖 Para más ayuda, consulta el README.md');
    
    return { issues, warnings };
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    healthCheck().catch(console.error);
}

module.exports = healthCheck;
