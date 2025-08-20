/**
 * Script simple para limpiar datos mock y preparar para conversaciones reales
 */

const { sequelize } = require('../models');

async function cleanMockData() {
    try {
        console.log('🧹 Limpiando datos mock...');

        // Desactivar foreign key checks temporalmente
        await sequelize.query('PRAGMA foreign_keys = OFF');

        // Limpiar datos de muestra
        await sequelize.query('DELETE FROM conversation_tags');
        console.log('✅ Conversation tags eliminadas');

        await sequelize.query('DELETE FROM messages');
        console.log('✅ Messages eliminados');

        await sequelize.query('DELETE FROM notes');
        console.log('✅ Notes eliminadas');

        await sequelize.query('DELETE FROM conversations');
        console.log('✅ Conversations eliminadas');

        await sequelize.query('DELETE FROM tags');
        console.log('✅ Tags eliminadas');

        // Reactivar foreign key checks
        await sequelize.query('PRAGMA foreign_keys = ON');

        console.log('\n🎉 ¡Datos mock limpiados exitosamente!');
        console.log('📱 Ahora las conversaciones se crearán automáticamente con mensajes reales de WhatsApp');

    } catch (error) {
        console.error('❌ Error limpiando datos mock:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    cleanMockData().catch(console.error);
}

module.exports = cleanMockData;
