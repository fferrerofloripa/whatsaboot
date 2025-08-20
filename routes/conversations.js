/**
 * Rutas para gestión de conversaciones CRM
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, canAccessInstance } = require('../middleware/auth');
const { Conversation, Message, Note, Tag, ConversationTag, User, WhatsappInstance } = require('../models');
const logger = require('../config/logger');

// Middleware para validar acceso a conversación
const canAccessConversation = async (req, res, next) => {
    try {
        const conversationId = req.params.conversationId;
        const conversation = await Conversation.findByPk(conversationId, {
            include: [{
                model: WhatsappInstance,
                as: 'whatsappInstance'
            }]
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversación no encontrada'
            });
        }

        // Verificar acceso a la instancia de WhatsApp
        const whatsappInstance = conversation.whatsappInstance;
        if (req.user.role !== 'admin' && whatsappInstance.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a esta conversación'
            });
        }

        req.conversation = conversation;
        next();
    } catch (error) {
        logger.error('Error verificando acceso a conversación:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

// GET /api/conversations/instance/:instanceId - Obtener conversaciones de una instancia
router.get('/instance/:instanceId', isAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        
        const offset = (page - 1) * limit;
        const where = { whatsappInstanceId: instanceId, isActive: true };
        
        if (status && ['inbox', 'pending', 'closed'].includes(status)) {
            where.status = status;
        }

        const conversations = await Conversation.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'assignedTo',
                    attributes: ['id', 'displayName', 'email']
                },
                {
                    model: Tag,
                    as: 'tags',
                    through: { attributes: [] }
                }
            ],
            order: [['lastMessageAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Obtener contadores por estado
        const statusCounts = await Conversation.getStatusCounts(instanceId);
        const counts = {
            inbox: 0,
            pending: 0,
            closed: 0
        };
        
        statusCounts.forEach(item => {
            counts[item.status] = parseInt(item.get('count'));
        });

        res.json({
            success: true,
            data: {
                conversations: conversations.rows,
                pagination: {
                    total: conversations.count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(conversations.count / limit)
                },
                statusCounts: counts
            }
        });

    } catch (error) {
        logger.error('Error obteniendo conversaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/conversations/:conversationId - Obtener una conversación específica
router.get('/:conversationId', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const conversation = await Conversation.findByPk(req.params.conversationId, {
            include: [
                {
                    model: User,
                    as: 'assignedTo',
                    attributes: ['id', 'displayName', 'email']
                },
                {
                    model: Tag,
                    as: 'tags',
                    through: { attributes: [] }
                }
            ]
        });

        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        logger.error('Error obteniendo conversación:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// PUT /api/conversations/:conversationId/status - Cambiar estado de conversación
router.put('/:conversationId/status', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['inbox', 'pending', 'closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        await req.conversation.changeStatus(status);
        
        logger.info(`Conversación ${req.conversation.id} cambió estado a ${status} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Estado actualizado correctamente',
            data: { status }
        });
    } catch (error) {
        logger.error('Error cambiando estado de conversación:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// PUT /api/conversations/:conversationId/assign - Asignar conversación a agente
router.put('/:conversationId/assign', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Verificar que el usuario existe
        if (userId) {
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }
        }

        await req.conversation.assignTo(userId);
        
        logger.info(`Conversación ${req.conversation.id} asignada a usuario ${userId} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Conversación asignada correctamente',
            data: { assignedToId: userId }
        });
    } catch (error) {
        logger.error('Error asignando conversación:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// POST /api/conversations/:conversationId/read - Marcar conversación como leída
router.post('/:conversationId/read', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        await req.conversation.markAsRead();
        await Message.markAsRead(req.conversation.id);
        
        res.json({
            success: true,
            message: 'Conversación marcada como leída'
        });
    } catch (error) {
        logger.error('Error marcando conversación como leída:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// GET /api/conversations/:conversationId/messages - Obtener mensajes de una conversación
router.get('/:conversationId/messages', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const { limit = 50, before } = req.query;
        
        const where = { conversationId: req.conversation.id };
        if (before) {
            where.sentAt = { [require('sequelize').Op.lt]: new Date(before) };
        }

        const messages = await Message.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'sentBy',
                    attributes: ['id', 'displayName', 'email']
                }
            ],
            order: [['sentAt', 'DESC']],
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: messages.reverse() // Revertir para mostrar cronológicamente
        });
    } catch (error) {
        logger.error('Error obteniendo mensajes:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// POST /api/conversations/:conversationId/messages - Enviar mensaje
router.post('/:conversationId/messages', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const { body, messageType = 'text' } = req.body;
        
        if (!body || body.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El mensaje no puede estar vacío'
            });
        }

        // Crear mensaje en la base de datos
        const message = await Message.createMessage({
            conversationId: req.conversation.id,
            direction: 'outgoing',
            messageType,
            body: body.trim(),
            sentById: req.user.id,
            sentAt: new Date()
        });

        // Actualizar conversación
        await req.conversation.updateLastMessage(body.trim(), 'outgoing');

        // Aquí se integraría con whatsappService para enviar el mensaje real
        // await whatsappService.sendMessage(req.conversation.whatsappInstanceId, req.conversation.contactPhone, body);

        logger.info(`Mensaje enviado en conversación ${req.conversation.id} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            data: message
        });
    } catch (error) {
        logger.error('Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

module.exports = router;
