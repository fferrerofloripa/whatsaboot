/**
 * Modelo de Mensajes para CRM
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
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
    whatsappMessageId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID del mensaje en WhatsApp'
    },
    direction: {
        type: DataTypes.ENUM('incoming', 'outgoing'),
        allowNull: false,
        comment: 'Dirección del mensaje'
    },
    messageType: {
        type: DataTypes.ENUM('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'sticker'),
        defaultValue: 'text',
        allowNull: false,
        comment: 'Tipo de mensaje'
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Contenido del mensaje'
    },
    mediaUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL del archivo multimedia'
    },
    mediaFilename: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nombre del archivo multimedia'
    },
    mediaMimetype: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Tipo MIME del archivo multimedia'
    },
    sentById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID del usuario que envió el mensaje (solo para outgoing)'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Si el mensaje ha sido leído por el agente'
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Fecha y hora de envío del mensaje'
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
    tableName: 'messages',
    indexes: [
        {
            fields: ['conversationId']
        },
        {
            fields: ['whatsappMessageId']
        },
        {
            fields: ['direction']
        },
        {
            fields: ['sentAt']
        },
        {
            fields: ['isRead']
        }
    ]
});

// Métodos estáticos
Message.findByConversation = function(conversationId, limit = 50) {
    return this.findAll({
        where: { conversationId },
        order: [['sentAt', 'ASC']],
        limit: limit
    });
};

Message.createMessage = function(data) {
    return this.create({
        conversationId: data.conversationId,
        whatsappMessageId: data.whatsappMessageId,
        direction: data.direction,
        messageType: data.messageType || 'text',
        body: data.body,
        mediaUrl: data.mediaUrl,
        mediaFilename: data.mediaFilename,
        mediaMimetype: data.mediaMimetype,
        sentById: data.sentById,
        sentAt: data.sentAt || new Date()
    });
};

Message.markAsRead = function(conversationId) {
    return this.update(
        { isRead: true },
        {
            where: {
                conversationId,
                direction: 'incoming',
                isRead: false
            }
        }
    );
};

module.exports = Message;
