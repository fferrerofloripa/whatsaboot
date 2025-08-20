/**
 * Modelo para Edges (Conexiones entre Nodos)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Edge = sequelize.define('Edge', {
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
    edgeId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID único de la conexión (UUID)'
    },
    sourceNodeId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID del nodo origen'
    },
    targetNodeId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID del nodo destino'
    },
    condition: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Condición para seguir esta conexión (JSON)',
        get() {
            const rawValue = this.getDataValue('condition');
            return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
            this.setDataValue('condition', value ? JSON.stringify(value) : null);
        }
    },
    label: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Etiqueta de la conexión (ej: "Sí", "No", "Opción A")'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Orden de evaluación de la conexión'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si la conexión está activa'
    }
}, {
    tableName: 'edges',
    timestamps: true,
    indexes: [
        {
            fields: ['flowId']
        },
        {
            fields: ['edgeId'],
            unique: true
        },
        {
            fields: ['sourceNodeId']
        },
        {
            fields: ['targetNodeId']
        }
    ]
});

// Métodos estáticos
Edge.findByFlow = async function(flowId) {
    return this.findAll({
        where: { flowId },
        order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
};

Edge.findBySourceNode = async function(sourceNodeId) {
    return this.findAll({
        where: {
            sourceNodeId,
            isActive: true
        },
        order: [['order', 'ASC']]
    });
};

Edge.findByTargetNode = async function(targetNodeId) {
    return this.findAll({
        where: {
            targetNodeId,
            isActive: true
        }
    });
};

Edge.findByEdgeId = async function(edgeId) {
    return this.findOne({
        where: { edgeId }
    });
};

module.exports = Edge;
