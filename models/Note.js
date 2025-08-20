/**
 * Modelo de Notas Internas para Conversaciones
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Note = sequelize.define('Note', {
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
    authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID del usuario que escribió la nota'
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Contenido de la nota'
    },
    isImportant: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Si la nota está marcada como importante'
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
    tableName: 'notes',
    indexes: [
        {
            fields: ['conversationId']
        },
        {
            fields: ['authorId']
        },
        {
            fields: ['isImportant']
        }
    ]
});

// Métodos estáticos
Note.findByConversation = function(conversationId) {
    return this.findAll({
        where: { conversationId },
        order: [['createdAt', 'ASC']]
    });
};

Note.createNote = function(conversationId, authorId, body, isImportant = false) {
    return this.create({
        conversationId,
        authorId,
        body,
        isImportant
    });
};

module.exports = Note;
