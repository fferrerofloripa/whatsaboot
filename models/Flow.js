/**
 * Modelo para Flows (Flujos de Bot)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Flow = sequelize.define('Flow', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    whatsappInstanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'whatsapp_instances',
            key: 'id'
        },
        comment: 'ID de la instancia de WhatsApp'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre del flujo'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del flujo'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si el flujo está activo'
    },
    trigger: {
        type: DataTypes.ENUM('keyword', 'welcome', 'manual', 'condition'),
        defaultValue: 'keyword',
        allowNull: false,
        comment: 'Tipo de activación del flujo'
    },
    triggerValue: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Valor del trigger (ej: palabra clave)'
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: 'Prioridad del flujo (1 = más alta)'
    },
    usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Número de veces que se ha ejecutado'
    },
    lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que se ejecutó'
    },
    createdById: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Usuario que creó el flujo'
    },
    metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Metadatos adicionales (JSON)',
        get() {
            const rawValue = this.getDataValue('metadata');
            return rawValue ? JSON.parse(rawValue) : {};
        },
        set(value) {
            this.setDataValue('metadata', JSON.stringify(value));
        }
    }
}, {
    tableName: 'flows',
    timestamps: true,
    indexes: [
        {
            fields: ['whatsappInstanceId']
        },
        {
            fields: ['trigger', 'triggerValue']
        },
        {
            fields: ['isActive']
        },
        {
            fields: ['priority']
        }
    ]
});

// Métodos de instancia
Flow.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
};

Flow.prototype.activate = async function() {
    this.isActive = true;
    await this.save();
};

Flow.prototype.deactivate = async function() {
    this.isActive = false;
    await this.save();
};

// Métodos estáticos
Flow.findByTrigger = async function(whatsappInstanceId, trigger, triggerValue = null) {
    const where = {
        whatsappInstanceId,
        trigger,
        isActive: true
    };
    
    if (triggerValue) {
        where.triggerValue = triggerValue;
    }
    
    return this.findAll({
        where,
        order: [['priority', 'ASC'], ['createdAt', 'ASC']]
    });
};

Flow.findByKeyword = async function(whatsappInstanceId, keyword) {
    return this.findAll({
        where: {
            whatsappInstanceId,
            trigger: 'keyword',
            triggerValue: keyword,
            isActive: true
        },
        order: [['priority', 'ASC']]
    });
};

Flow.findActiveByInstance = async function(whatsappInstanceId) {
    return this.findAll({
        where: {
            whatsappInstanceId,
            isActive: true
        },
        order: [['priority', 'ASC'], ['name', 'ASC']]
    });
};

module.exports = Flow;
