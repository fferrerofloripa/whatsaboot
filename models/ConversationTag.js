/**
 * Modelo de unión entre Conversaciones y Etiquetas
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversationTag = sequelize.define('ConversationTag', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'conversations',
            key: 'id'
        },
        comment: 'ID de la conversación'
    },
    tagId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tags',
            key: 'id'
        },
        comment: 'ID de la etiqueta'
    },
    assignedById: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID del usuario que asignó la etiqueta'
    }
}, {
    tableName: 'conversation_tags',
    indexes: [
        {
            fields: ['conversationId']
        },
        {
            fields: ['tagId']
        },
        {
            unique: true,
            fields: ['conversationId', 'tagId']
        }
    ]
});

module.exports = ConversationTag;
