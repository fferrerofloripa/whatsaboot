/**
 * Configuración de la base de datos SQLite con Sequelize
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('./logger');

// Configuración de la base de datos
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DATABASE_URL || path.join(__dirname, '../database/whatsaboot.db'),
    logging: (msg) => logger.debug(msg),
    define: {
        timestamps: true,
        underscored: false,
        freezeTableName: false
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Función para probar la conexión
async function testConnection() {
    try {
        await sequelize.authenticate();
        logger.info('✅ Conexión a la base de datos establecida correctamente');
        return true;
    } catch (error) {
        logger.error('❌ Error al conectar con la base de datos:', error);
        return false;
    }
}

// Función para sincronizar la base de datos
async function syncDatabase(force = false) {
    try {
        await sequelize.sync({ force });
        logger.info(`📊 Base de datos sincronizada ${force ? '(forzada)' : ''}`);
    } catch (error) {
        logger.error('Error al sincronizar la base de datos:', error);
        throw error;
    }
}

module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.syncDatabase = syncDatabase;
