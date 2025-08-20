/**
 * Modelo para Nodes (Nodos de Flujo)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Node = sequelize.define('Node', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    flowId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'flows',
            key: 'id'
        },
        comment: 'ID del flujo al que pertenece'
    },
    nodeId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID único del nodo en el flujo (UUID)'
    },
    type: {
        type: DataTypes.ENUM(
            'start',           // Nodo de inicio
            'message',         // Enviar mensaje
            'question',        // Hacer pregunta
            'condition',       // Condición/decisión
            'delay',           // Pausa/delay
            'action',          // Acción (marcar contacto, etc.)
            'webhook',         // Llamar webhook
            'human_handoff',   // Transferir a humano
            'end'              // Finalizar flujo
        ),
        allowNull: false,
        comment: 'Tipo de nodo'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre del nodo'
    },
    position: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Posición en el canvas (JSON)',
        get() {
            const rawValue = this.getDataValue('position');
            return rawValue ? JSON.parse(rawValue) : { x: 0, y: 0 };
        },
        set(value) {
            this.setDataValue('position', JSON.stringify(value));
        }
    },
    config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración específica del nodo (JSON)',
        get() {
            const rawValue = this.getDataValue('config');
            return rawValue ? JSON.parse(rawValue) : {};
        },
        set(value) {
            this.setDataValue('config', JSON.stringify(value));
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si el nodo está activo'
    }
}, {
    tableName: 'nodes',
    timestamps: true,
    indexes: [
        {
            fields: ['flowId']
        },
        {
            fields: ['nodeId'],
            unique: true
        },
        {
            fields: ['type']
        }
    ]
});

// Métodos de instancia
Node.prototype.updatePosition = async function(x, y) {
    this.position = { x, y };
    await this.save();
};

Node.prototype.updateConfig = async function(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.save();
};

// Métodos estáticos
Node.findByFlow = async function(flowId) {
    return this.findAll({
        where: { flowId },
        order: [['createdAt', 'ASC']]
    });
};

Node.findByNodeId = async function(nodeId) {
    return this.findOne({
        where: { nodeId }
    });
};

Node.findStartNode = async function(flowId) {
    return this.findOne({
        where: {
            flowId,
            type: 'start'
        }
    });
};

module.exports = Node;
