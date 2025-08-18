/**
 * Modelo de Respuesta Automática
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AutoResponse = sequelize.define('AutoResponse', {
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
    keyword: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Palabra clave que activa la respuesta'
    },
    responseMessage: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Mensaje de respuesta automática'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si la respuesta automática está activa'
    },
    matchType: {
        type: DataTypes.ENUM('exact', 'contains', 'starts_with', 'ends_with', 'regex'),
        defaultValue: 'contains',
        allowNull: false,
        comment: 'Tipo de coincidencia para la palabra clave'
    },
    caseSensitive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Si la búsqueda es sensible a mayúsculas/minúsculas'
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: 'Prioridad de la respuesta (mayor número = mayor prioridad)'
    },
    usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Contador de veces que se ha usado esta respuesta'
    },
    lastUsed: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última fecha de uso de esta respuesta'
    }
}, {
    tableName: 'auto_responses',
    indexes: [
        {
            fields: ['whatsappInstanceId']
        },
        {
            fields: ['keyword']
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
AutoResponse.prototype.matches = function(message) {
    const keyword = this.caseSensitive ? this.keyword : this.keyword.toLowerCase();
    const text = this.caseSensitive ? message : message.toLowerCase();

    switch (this.matchType) {
        case 'exact':
            return text === keyword;
        case 'contains':
            return text.includes(keyword);
        case 'starts_with':
            return text.startsWith(keyword);
        case 'ends_with':
            return text.endsWith(keyword);
        case 'regex':
            try {
                const regex = new RegExp(keyword, this.caseSensitive ? 'g' : 'gi');
                return regex.test(text);
            } catch (error) {
                return false;
            }
        default:
            return text.includes(keyword);
    }
};

AutoResponse.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    await this.save();
};

// Métodos estáticos
AutoResponse.findByInstanceId = function(whatsappInstanceId) {
    return this.findAll({
        where: { whatsappInstanceId, isActive: true },
        order: [['priority', 'DESC'], ['createdAt', 'ASC']]
    });
};

AutoResponse.findMatchingResponse = async function(whatsappInstanceId, message) {
    const responses = await this.findByInstanceId(whatsappInstanceId);
    
    for (const response of responses) {
        if (response.matches(message)) {
            return response;
        }
    }
    
    return null;
};

module.exports = AutoResponse;
