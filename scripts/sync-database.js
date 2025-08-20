/**
 * Script para sincronizar la base de datos con los modelos actuales
 */

const { sequelize } = require('../models');

async function syncDatabase() {
    try {
        console.log('🔄 Sincronizando base de datos...');

        // Forzar recreación de todas las tablas
        await sequelize.sync({ force: true });

        console.log('✅ Base de datos sincronizada correctamente');
        console.log('📊 Todas las tablas han sido recreadas con la estructura correcta');

    } catch (error) {
        console.error('❌ Error sincronizando base de datos:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    syncDatabase().catch(console.error);
}

module.exports = syncDatabase;
