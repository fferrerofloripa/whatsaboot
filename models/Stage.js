/**
 * Modelo para Stages (Etapas del Funnel)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stage = sequelize.define('Stage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    funnelId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'funnels',
            key: 'id'
        },
        comment: 'ID del funnel al que pertenece'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre de la etapa'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción de la etapa'
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: '#6b7280',
        allowNull: false,
        comment: 'Color de la etapa'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Orden de la etapa en el funnel'
    },
    isClosing: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Si esta etapa indica cierre/venta'
    },
    autoMoveAfter: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Días después de los cuales mover automáticamente'
    },
    nextStageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'stages',
            key: 'id'
        },
        comment: 'Próxima etapa automática'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si la etapa está activa'
    }
}, {
    tableName: 'stages',
    timestamps: true,
    indexes: [
        {
            fields: ['funnelId']
        },
        {
            fields: ['order']
        }
    ]
});

// Métodos estáticos
Stage.findByFunnel = async function(funnelId) {
    return this.findAll({
        where: {
            funnelId,
            isActive: true
        },
        order: [['order', 'ASC']]
    });
};

Stage.getConversationCounts = async function(stageId) {
    const { Conversation } = require('./index');
    return Conversation.count({
        where: { stageId }
    });
};

module.exports = Stage;
