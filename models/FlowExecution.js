/**
 * Modelo para Flow Executions (Ejecuciones de Flujo)
 * Rastrea el estado de ejecución de un flujo para cada contacto
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FlowExecution = sequelize.define('FlowExecution', {
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
        comment: 'ID del flujo que se está ejecutando'
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'conversations',
            key: 'id'
        },
        comment: 'ID de la conversación donde se ejecuta'
    },
    currentNodeId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID del nodo actual en la ejecución'
    },
    status: {
        type: DataTypes.ENUM('running', 'paused', 'completed', 'failed', 'cancelled'),
        defaultValue: 'running',
        allowNull: false,
        comment: 'Estado de la ejecución'
    },
    variables: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Variables de contexto del flujo (JSON)',
        get() {
            const rawValue = this.getDataValue('variables');
            return rawValue ? JSON.parse(rawValue) : {};
        },
        set(value) {
            this.setDataValue('variables', JSON.stringify(value));
        }
    },
    startedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'Cuando inició la ejecución'
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Cuando completó la ejecución'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensaje de error si falló'
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
    tableName: 'flow_executions',
    timestamps: true,
    indexes: [
        {
            fields: ['flowId']
        },
        {
            fields: ['conversationId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['startedAt']
        }
    ]
});

// Métodos de instancia
FlowExecution.prototype.moveToNode = async function(nodeId) {
    this.currentNodeId = nodeId;
    await this.save();
};

FlowExecution.prototype.setVariable = async function(key, value) {
    const variables = this.variables || {};
    variables[key] = value;
    this.variables = variables;
    await this.save();
};

FlowExecution.prototype.getVariable = function(key, defaultValue = null) {
    const variables = this.variables || {};
    return variables[key] !== undefined ? variables[key] : defaultValue;
};

FlowExecution.prototype.complete = async function() {
    this.status = 'completed';
    this.completedAt = new Date();
    await this.save();
};

FlowExecution.prototype.fail = async function(errorMessage) {
    this.status = 'failed';
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
    await this.save();
};

FlowExecution.prototype.pause = async function() {
    this.status = 'paused';
    await this.save();
};

FlowExecution.prototype.resume = async function() {
    this.status = 'running';
    await this.save();
};

// Métodos estáticos
FlowExecution.findActiveByConversation = async function(conversationId) {
    return this.findOne({
        where: {
            conversationId,
            status: ['running', 'paused']
        },
        order: [['startedAt', 'DESC']]
    });
};

FlowExecution.findByFlow = async function(flowId, status = null) {
    const where = { flowId };
    if (status) {
        where.status = status;
    }
    
    return this.findAll({
        where,
        order: [['startedAt', 'DESC']]
    });
};

FlowExecution.countByFlow = async function(flowId, status = null) {
    const where = { flowId };
    if (status) {
        where.status = status;
    }
    
    return this.count({ where });
};

module.exports = FlowExecution;
