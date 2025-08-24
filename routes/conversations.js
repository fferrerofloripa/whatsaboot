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
        const { status, page = 1, limit = 10 } = req.query;
        
        const offset = (page - 1) * limit;
        const { Op } = require('sequelize');
        const where = { 
            whatsappInstanceId: instanceId, 
            isActive: true,
            // Solo mostrar conversaciones que tienen lastMessage válido
            lastMessage: { 
                [Op.and]: [
                    { [Op.ne]: null },
                    { [Op.ne]: '' },
                    { [Op.ne]: 'Sin mensajes' },
                    { [Op.ne]: 'Sin mensajes recientes' }
                ]
            }
        };
        
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
                },
                {
                    model: Message,
                    as: 'messages',
                    required: false,
                    limit: 1,
                    order: [['createdAt', 'DESC']]
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

        // Enviar mensaje real por WhatsApp
        const whatsappService = require('../services/whatsappService');
        try {
            await whatsappService.sendMessage(req.conversation.whatsappInstanceId, req.conversation.contactId, body.trim());
            logger.info(`✅ Mensaje WhatsApp enviado exitosamente a ${req.conversation.contactId}`);
        } catch (whatsappError) {
            logger.error(`❌ Error enviando mensaje por WhatsApp:`, whatsappError);
            // El mensaje ya se guardó en BD, pero falló el envío por WhatsApp
        }

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

// GET /api/conversations/instance/:instanceId/test - Test endpoint para diagnóstico
router.get('/instance/:instanceId/test', isAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const { instanceId } = req.params;
        
        logger.info(`🧪 Test endpoint para instancia ${instanceId} - Usuario: ${req.user?.email}`);
        
        // Obtener servicio de WhatsApp
        const whatsappService = require('../services/whatsappService');
        const client = whatsappService.clients.get(parseInt(instanceId));
        
        const result = {
            instanceId: instanceId,
            clientExists: !!client,
            clientReady: client ? client.isReady : false,
            clientInfo: client ? {
                isReady: client.isReady,
                pupPage: !!client.pupPage,
                authStrategy: !!client.authStrategy
            } : null
        };
        
        if (client && client.isReady) {
            try {
                const info = await client.getState();
                result.whatsappState = info;
            } catch (error) {
                result.whatsappStateError = error.message;
            }
        }
        
        logger.info(`🧪 Test result:`, result);
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        logger.error('Error en test endpoint:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// POST /api/conversations/instance/:instanceId/sync - Sincronizar conversaciones desde WhatsApp
router.post('/instance/:instanceId/sync', isAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { limit = 10 } = req.body;
        
        logger.info(`🔄 Iniciando sincronización bajo demanda para instancia ${instanceId}`);
        
        // Obtener servicio de WhatsApp
        const whatsappService = require('../services/whatsappService');
        const client = whatsappService.clients.get(parseInt(instanceId));
        
        if (!client) {
            logger.warn(`Cliente WhatsApp no encontrado para instancia ${instanceId}`);
            return res.status(400).json({
                success: false,
                message: 'Instancia de WhatsApp no conectada'
            });
        }

        if (!client.isReady) {
            logger.warn(`Cliente WhatsApp no está listo para instancia ${instanceId}`);
            return res.status(400).json({
                success: false,
                message: 'Instancia de WhatsApp no está lista'
            });
        }

        // Obtener chats desde WhatsApp con timeout
        logger.info(`🔄 Obteniendo chats desde WhatsApp para instancia ${instanceId}...`);
        const chats = await Promise.race([
            client.getChats(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout obteniendo chats')), 30000)
            )
        ]);
        logger.info(`📱 Encontrados ${chats.length} chats en WhatsApp para sincronización`);
        
        // Tomar solo los más recientes según el límite
        const recentChats = chats
            .filter(chat => chat && chat.id && chat.id._serialized) // Filtrar chats válidos
            .sort((a, b) => {
                const aTime = a.lastMessage ? a.lastMessage.timestamp : 0;
                const bTime = b.lastMessage ? b.lastMessage.timestamp : 0;
                return bTime - aTime;
            })
            .slice(0, parseInt(limit));
        
        let syncedCount = 0;
        const syncedConversations = [];
        
        for (const chat of recentChats) {
            try {
                const contactId = chat.id._serialized;
                const isGroup = chat.isGroup || false;
                let contactName, profilePicUrl, groupDescription, groupParticipants;
                
                if (isGroup) {
                    contactName = chat.name || 'Grupo sin nombre';
                    groupDescription = chat.description || null;
                    
                    try {
                        const participants = chat.participants || [];
                        groupParticipants = participants.map(p => ({
                            id: p.id ? p.id._serialized : 'unknown',
                            isAdmin: p.isAdmin || false,
                            isSuperAdmin: p.isSuperAdmin || false
                        }));
                    } catch (error) {
                        logger.warn(`Error obteniendo participantes del grupo ${contactId}:`, error.message);
                        groupParticipants = [];
                    }
                    
                    try {
                        profilePicUrl = await chat.getProfilePicUrl();
                    } catch (error) {
                        profilePicUrl = null;
                    }
                } else {
                    try {
                        const contact = await chat.getContact();
                        contactName = contact.name || contact.pushname || contact.number || 'Contacto desconocido';
                        groupDescription = null;
                        groupParticipants = null;
                        
                        try {
                            profilePicUrl = await contact.getProfilePicUrl();
                        } catch (error) {
                            profilePicUrl = null;
                        }
                    } catch (error) {
                        logger.warn(`Error obteniendo contacto ${contactId}:`, error.message);
                        contactName = 'Contacto desconocido';
                        groupDescription = null;
                        groupParticipants = null;
                        profilePicUrl = null;
                    }
                }
                
                // Buscar o crear conversación
                let conversation = await Conversation.findOne({
                    where: {
                        whatsappInstanceId: instanceId,
                        contactId: contactId
                    }
                });
                
                if (!conversation) {
                    // Obtener último mensaje del chat
                    const lastMessage = chat.lastMessage;
                    const lastMessageBody = lastMessage && lastMessage.body ? lastMessage.body : 'Sin mensajes';
                    const lastMessageAt = lastMessage && lastMessage.timestamp ? new Date(lastMessage.timestamp * 1000) : new Date();
                    
                    conversation = await Conversation.create({
                        whatsappInstanceId: instanceId,
                        contactId: contactId,
                        contactName: contactName,
                        contactAvatar: profilePicUrl,
                        isGroup: isGroup,
                        groupDescription: groupDescription,
                        groupParticipants: groupParticipants,
                        status: 'inbox',
                        lastMessage: lastMessageBody,
                        lastMessageAt: lastMessageAt,
                        unreadCount: chat.unreadCount || 0,
                        isActive: true
                    });
                    
                    syncedCount++;
                    logger.info(`✅ Chat sincronizado: ${contactName} (${contactId}) - ${isGroup ? 'Grupo' : 'Individual'}`);
                } else {
                    // Actualizar conversación existente
                    const lastMessage = chat.lastMessage;
                    const updateData = {
                        contactAvatar: profilePicUrl,
                        contactName: contactName,
                        groupDescription: groupDescription,
                        groupParticipants: groupParticipants,
                        unreadCount: chat.unreadCount || 0
                    };
                    
                    if (lastMessage && lastMessage.body) {
                        updateData.lastMessage = lastMessage.body;
                        if (lastMessage.timestamp) {
                            updateData.lastMessageAt = new Date(lastMessage.timestamp * 1000);
                        }
                    }
                    
                    await conversation.update(updateData);
                    logger.info(`🔄 Chat actualizado: ${contactName}`);
                }
                
                syncedConversations.push(conversation);
                
            } catch (error) {
                logger.error(`Error sincronizando chat ${chat.id._serialized}:`, error);
            }
        }
        
        logger.info(`🎉 Sincronización completada: ${syncedCount} nuevos chats, ${recentChats.length - syncedCount} actualizados`);
        
        res.json({
            success: true,
            message: `Sincronizados ${syncedCount} nuevos chats y ${recentChats.length - syncedCount} actualizados`,
            data: {
                synced: syncedCount,
                updated: recentChats.length - syncedCount,
                total: recentChats.length,
                conversations: syncedConversations
            }
        });
        
    } catch (error) {
        logger.error('Error en sincronización bajo demanda:', {
            message: error.message,
            stack: error.stack,
            instanceId: instanceId
        });
        res.status(500).json({
            success: false,
            message: `Error del servidor: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
