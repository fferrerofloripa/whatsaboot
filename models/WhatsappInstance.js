/**
 * Modelo de Instancia de WhatsApp
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhatsappInstance = sequelize.define('WhatsappInstance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID del usuario propietario'
    },
    numberName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre descriptivo del número de WhatsApp'
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Número de teléfono asociado (se obtiene automáticamente)'
    },
    status: {
        type: DataTypes.ENUM('disconnected', 'connected', 'qr_pending', 'connecting', 'error'),
        defaultValue: 'disconnected',
        allowNull: false,
        comment: 'Estado actual de la conexión'
    },
    qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Código QR actual para conexión'
    },
    sessionData: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos de sesión de WhatsApp Web (JSON)'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si la instancia está activa'
    },
    lastConnection: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última fecha de conexión exitosa'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Último mensaje de error si existe'
    },
    settings: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuraciones específicas de la instancia (JSON)',
        get() {
            const rawValue = this.getDataValue('settings');
            return rawValue ? JSON.parse(rawValue) : {};
        },
        set(value) {
            this.setDataValue('settings', JSON.stringify(value));
        }
    }
}, {
    tableName: 'whatsapp_instances',
    indexes: [
        {
            fields: ['userId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['isActive']
        }
    ]
});

// Métodos de instancia
WhatsappInstance.prototype.updateStatus = async function(status, errorMessage = null) {
    this.status = status;
    if (errorMessage) {
        this.errorMessage = errorMessage;
    }
    if (status === 'connected') {
        this.lastConnection = new Date();
        this.errorMessage = null;
    }
    await this.save();
};

WhatsappInstance.prototype.setQrCode = async function(qrCode) {
    this.qrCode = qrCode;
    this.status = 'qr_pending';
    await this.save();
};

WhatsappInstance.prototype.clearQrCode = async function() {
    this.qrCode = null;
    await this.save();
};

WhatsappInstance.prototype.isConnected = function() {
    return this.status === 'connected';
};

WhatsappInstance.prototype.needsQr = function() {
    return this.status === 'qr_pending';
};

// Métodos estáticos
WhatsappInstance.findByUserId = function(userId) {
    return this.findAll({ 
        where: { userId, isActive: true },
        include: ['autoResponses']
    });
};

WhatsappInstance.findConnected = function() {
    return this.findAll({ 
        where: { status: 'connected', isActive: true },
        include: ['user']
    });
};

module.exports = WhatsappInstance;
