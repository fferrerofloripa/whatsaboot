/**
 * Archivo principal de modelos
 * Configura las relaciones entre modelos
 */

const sequelize = require('../config/database');
const User = require('./User');
const WhatsappInstance = require('./WhatsappInstance');
const AutoResponse = require('./AutoResponse');

// Definir relaciones
User.hasMany(WhatsappInstance, {
    foreignKey: 'userId',
    as: 'whatsappInstances'
});

WhatsappInstance.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

WhatsappInstance.hasMany(AutoResponse, {
    foreignKey: 'whatsappInstanceId',
    as: 'autoResponses'
});

AutoResponse.belongsTo(WhatsappInstance, {
    foreignKey: 'whatsappInstanceId',
    as: 'whatsappInstance'
});

module.exports = {
    sequelize,
    User,
    WhatsappInstance,
    AutoResponse
};
