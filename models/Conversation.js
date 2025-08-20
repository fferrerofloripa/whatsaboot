/**
 * Modelo de Conversación para CRM
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
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
    contactId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID único del contacto de WhatsApp (ejemplo: 1234567890@c.us)'
    },
    contactName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nombre del contacto'
    },
    contactAvatar: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL del avatar del contacto'
    },
    status: {
        type: DataTypes.ENUM('inbox', 'pending', 'closed'),
        defaultValue: 'inbox',
        allowNull: false,
        comment: 'Estado de la conversación en el CRM'
    },
    assignedToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID del agente asignado'
    },
    stageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'stages',
            key: 'id'
        },
        comment: 'ID de la etapa del funnel'
    },
    lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha del último mensaje'
    },
    lastMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Texto del último mensaje (para preview)'
    },
    unreadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Número de mensajes no leídos'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si la conversación está activa'
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
    tableName: 'conversations'
});

// Métodos de instancia
Conversation.prototype.updateLastMessage = async function(messageText, direction) {
    this.lastMessageText = messageText;
    this.lastMessageDirection = direction;
    this.lastMessageAt = new Date();
    
    if (direction === 'incoming') {
        this.unreadCount += 1;
    }
    
    await this.save();
};

Conversation.prototype.markAsRead = async function() {
    this.unreadCount = 0;
    await this.save();
};

Conversation.prototype.changeStatus = async function(newStatus) {
    this.status = newStatus;
    await this.save();
};

Conversation.prototype.assignTo = async function(userId) {
    this.assignedToId = userId;
    await this.save();
};

// Métodos estáticos
Conversation.findByInstance = function(whatsappInstanceId, status = null) {
    const where = { whatsappInstanceId, isActive: true };
    if (status) {
        where.status = status;
    }
    
    return this.findAll({
        where,
        order: [['lastMessageAt', 'DESC']]
    });
};

Conversation.findByContact = function(whatsappInstanceId, contactPhone) {
    return this.findOne({
        where: {
            whatsappInstanceId,
            contactPhone,
            isActive: true
        }
    });
};

Conversation.getStatusCounts = function(whatsappInstanceId) {
    return this.findAll({
        attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
            whatsappInstanceId,
            isActive: true
        },
        group: ['status']
    });
};

module.exports = Conversation;
