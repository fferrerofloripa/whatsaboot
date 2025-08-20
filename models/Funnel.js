/**
 * Modelo para Funnels (Embudos de Ventas)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Funnel = sequelize.define('Funnel', {
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
        comment: 'Nombre del funnel'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del funnel'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si el funnel está activo'
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: '#3b82f6',
        allowNull: false,
        comment: 'Color del funnel'
    },
    createdById: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Usuario que creó el funnel'
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
    tableName: 'funnels',
    timestamps: true,
    indexes: [
        {
            fields: ['whatsappInstanceId']
        },
        {
            fields: ['isActive']
        }
    ]
});

// Métodos estáticos
Funnel.findByInstance = async function(whatsappInstanceId) {
    return this.findAll({
        where: {
            whatsappInstanceId,
            isActive: true
        },
        include: [{
            model: require('./Stage'),
            as: 'stages',
            order: [['order', 'ASC']]
        }],
        order: [['name', 'ASC']]
    });
};

module.exports = Funnel;
