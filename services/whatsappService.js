/**
 * Servicio de WhatsApp Web.js
 * Maneja múltiples instancias de WhatsApp
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { WhatsappInstance, AutoResponse, Conversation, Message } = require('../models');
const FlowExecutor = require('./flowExecutor');
const logger = require('../config/logger');
const aiService = require('./aiService');

class WhatsAppService {
    constructor() {
        this.clients = new Map(); // Mapa de clientes activos
        this.io = null; // Socket.IO instance
        this.flowExecutor = new FlowExecutor(this);
    }

    /**
     * Establecer instancia de Socket.IO
     */
    setSocketIO(io) {
        this.io = io;
    }

    /**
     * Inicializar una instancia de WhatsApp
     */
    async initializeInstance(instanceId) {
        try {
            logger.info(`Inicializando instancia de WhatsApp: ${instanceId}`);

            // Obtener la instancia de la base de datos
            const instance = await WhatsappInstance.findByPk(instanceId);
            if (!instance) {
                throw new Error(`Instancia ${instanceId} no encontrada`);
            }

            // Verificar si ya existe un cliente para esta instancia
            if (this.clients.has(instanceId)) {
                logger.warn(`Cliente ya existe para instancia ${instanceId}`);
                return this.clients.get(instanceId);
            }

            // Crear directorio de sesión si no existe
            const sessionPath = path.join(__dirname, '../.wwebjs_auth', `session_${instanceId}`);
            if (!fs.existsSync(path.dirname(sessionPath))) {
                fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
            }

            // Crear cliente de WhatsApp
            const client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `instance_${instanceId}`,
                    dataPath: sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                }
            });

            // Configurar event listeners
            this.setupClientEvents(client, instance);

            // Almacenar cliente
            this.clients.set(instanceId, client);

            // Actualizar estado
            await instance.updateStatus('connecting');

            // Inicializar cliente
            await client.initialize();

            return client;

        } catch (error) {
            logger.error(`Error al inicializar instancia ${instanceId}:`, error);
            
            // Actualizar estado de error
            const instance = await WhatsappInstance.findByPk(instanceId);
            if (instance) {
                await instance.updateStatus('error', error.message);
            }

            throw error;
        }
    }

    /**
     * Configurar eventos del cliente
     */
    setupClientEvents(client, instance) {
        const instanceId = instance.id;

        // Evento QR Code
        client.on('qr', async (qr) => {
            try {
                logger.info(`🔥 DEBUG: QR Code generado para instancia ${instanceId}`);
                
                // Generar imagen QR
                const qrImage = await qrcode.toDataURL(qr);
                
                // Guardar en base de datos
                logger.info(`🔥 DEBUG: Guardando QR en base de datos para instancia ${instanceId}`);
                await instance.setQrCode(qrImage);

                // Emitir por Socket.IO
                if (this.io) {
                    logger.info(`🔥 DEBUG: Emitiendo QR por Socket.IO para instancia ${instanceId}`);
                    this.io.emit('qr_generated', {
                        instanceId,
                        qrCode: qrImage
                    });
                } else {
                    logger.error(`🔥 DEBUG: Socket.IO no está disponible para instancia ${instanceId}`);
                }

            } catch (error) {
                logger.error(`Error al procesar QR para instancia ${instanceId}:`, error);
            }
        });

        // Evento de conexión exitosa
        client.on('ready', async () => {
            try {
                logger.info(`Cliente WhatsApp listo para instancia ${instanceId}`);

                // Obtener información del teléfono
                const info = client.info;
                const phoneNumber = info.wid.user;

                // Actualizar base de datos
                instance.phoneNumber = phoneNumber;
                await instance.updateStatus('connected');
                await instance.clearQrCode();

                // Sincronizar chats existentes
                logger.info(`🔄 Iniciando sincronización de chats para instancia ${instanceId}`);
                await this.syncExistingChats(client, instance);

                // Emitir por Socket.IO
                if (this.io) {
                    this.io.emit('client_ready', {
                        instanceId,
                        phoneNumber,
                        status: 'connected'
                    });
                }

            } catch (error) {
                logger.error(`Error al procesar ready para instancia ${instanceId}:`, error);
            }
        });

        // Evento de mensaje recibido
        client.on('message', async (message) => {
            try {
                await this.handleIncomingMessage(message, instance);
            } catch (error) {
                logger.error(`Error al manejar mensaje para instancia ${instanceId}:`, error);
            }
        });

        // Evento de desconexión
        client.on('disconnected', async (reason) => {
            try {
                logger.warn(`Cliente desconectado para instancia ${instanceId}:`, reason);
                
                // Actualizar estado
                await instance.updateStatus('disconnected', reason);

                // Remover cliente del mapa
                this.clients.delete(instanceId);

                // Emitir por Socket.IO
                if (this.io) {
                    this.io.emit('client_disconnected', {
                        instanceId,
                        reason
                    });
                }

            } catch (error) {
                logger.error(`Error al procesar disconnected para instancia ${instanceId}:`, error);
            }
        });

        // Evento de error de autenticación
        client.on('auth_failure', async (msg) => {
            try {
                logger.error(`Fallo de autenticación para instancia ${instanceId}:`, msg);
                
                await instance.updateStatus('error', 'Fallo de autenticación');

                // Emitir por Socket.IO
                if (this.io) {
                    this.io.emit('auth_failure', {
                        instanceId,
                        message: msg
                    });
                }

            } catch (error) {
                logger.error(`Error al procesar auth_failure para instancia ${instanceId}:`, error);
            }
        });
    }

    /**
     * Manejar mensaje entrante
     */
    async handleIncomingMessage(message, instance) {
        try {
            // Procesar todos los mensajes (entrantes y salientes) para el CRM
            logger.info(`Mensaje ${message.fromMe ? 'enviado' : 'recibido'} en instancia ${instance.id}: ${message.body}`);

            // Obtener información del contacto
            const contact = await message.getContact();
            const contactId = contact.id._serialized;
            const contactName = contact.name || contact.pushname || contact.number;

            // Buscar o crear conversación
            let conversation = await Conversation.findOne({
                where: {
                    whatsappInstanceId: instance.id,
                    contactId: contactId
                }
            });

            if (!conversation) {
                // Crear nueva conversación
                conversation = await Conversation.create({
                    whatsappInstanceId: instance.id,
                    contactId: contactId,
                    contactName: contactName,
                    status: 'inbox', // Nuevas conversaciones van a "Entrada"
                    lastMessage: message.body,
                    lastMessageAt: new Date(message.timestamp * 1000),
                    unreadCount: message.fromMe ? 0 : 1,
                    isActive: true
                });

                logger.info(`Nueva conversación creada para ${contactName} (${contactId})`);
            } else {
                // Actualizar conversación existente
                const updateData = {
                    lastMessage: message.body,
                    lastMessageAt: new Date(message.timestamp * 1000)
                };

                // Si es un mensaje entrante, incrementar contador de no leídos
                if (!message.fromMe) {
                    updateData.unreadCount = (conversation.unreadCount || 0) + 1;
                    // Si la conversación estaba cerrada, moverla a entrada
                    if (conversation.status === 'closed') {
                        updateData.status = 'inbox';
                    }
                } else {
                    // Si es un mensaje saliente, resetear contador de no leídos
                    updateData.unreadCount = 0;
                }

                await conversation.update(updateData);
            }

            // Crear registro del mensaje en la BD
            await Message.create({
                conversationId: conversation.id,
                whatsappMessageId: message.id._serialized,
                direction: message.fromMe ? 'outgoing' : 'incoming',
                messageType: message.type === 'chat' ? 'text' : message.type,
                body: message.body,
                mediaUrl: message.hasMedia ? 'pending' : null, // TODO: Implementar descarga de medios
                sentById: message.fromMe ? instance.userId : null,
                sentAt: new Date(message.timestamp * 1000),
                isRead: message.fromMe // Los mensajes salientes se marcan como leídos
            });

            // Emitir actualización por Socket.IO para el CRM
            if (this.io) {
                this.io.to(`instance_${instance.id}`).emit('new_message', {
                    conversationId: conversation.id,
                    message: {
                        id: message.id._serialized,
                        body: message.body,
                        fromMe: message.fromMe,
                        timestamp: message.timestamp * 1000,
                        contactName: contactName
                    }
                });

                // Emitir actualización de conversación
                this.io.to(`instance_${instance.id}`).emit('conversation_updated', {
                    conversationId: conversation.id,
                    lastMessage: message.body,
                    lastMessageAt: conversation.lastMessageAt,
                    unreadCount: conversation.unreadCount
                });
            }

            // Solo procesar respuestas automáticas para mensajes entrantes
            if (message.body && !message.fromMe) {
                // Verificar flows primero
                await this.flowExecutor.checkTriggers(message, conversation.id, instance.id);
                
                // Si hay una ejecución de flow activa, continuar con ella
                const { FlowExecution } = require('../models');
                const activeExecution = await FlowExecution.findActiveByConversation(conversation.id);
                if (activeExecution && activeExecution.status === 'paused') {
                    await this.flowExecutor.continueExecution(conversation.id, message.body);
                } else {
                    // Si no hay flow activo, verificar respuestas automáticas
                    const autoResponse = await AutoResponse.findMatchingResponse(
                        instance.id,
                        message.body
                    );

                    if (autoResponse) {
                    // Enviar respuesta automática
                    const reply = await message.reply(autoResponse.responseMessage);
                    await autoResponse.incrementUsage();
                    
                    // Registrar la respuesta automática en la BD
                    if (reply) {
                        await Message.create({
                            conversationId: conversation.id,
                            whatsappMessageId: reply.id._serialized,
                            direction: 'outgoing',
                            messageType: 'text',
                            body: autoResponse.responseMessage,
                            sentById: null, // Respuesta automática del sistema
                            sentAt: new Date(),
                            isRead: true
                        });

                        // Actualizar última mensaje de la conversación
                        await conversation.update({
                            lastMessage: autoResponse.responseMessage,
                            lastMessageAt: new Date(),
                            unreadCount: 0
                        });
                    }
                    
                        logger.info(`Respuesta automática enviada: ${autoResponse.keyword}`);
                    } else {
                    // Opcional: Usar IA para respuesta (comentado por defecto)
                    /*
                    try {
                        const aiResponse = await aiService.getDeepSeekResponse(message.body);
                        const reply = await message.reply(aiResponse);
                        
                        if (reply) {
                            await Message.create({
                                conversationId: conversation.id,
                                whatsappMessageId: reply.id._serialized,
                                direction: 'outgoing',
                                messageType: 'text',
                                body: aiResponse,
                                sentById: null, // Respuesta de IA del sistema
                                sentAt: new Date(),
                                isRead: true
                            });
                        }
                        
                        logger.info('Respuesta de IA enviada');
                    } catch (aiError) {
                        logger.error('Error al obtener respuesta de IA:', aiError);
                    }
                    */
                    }
                }
            }

        } catch (error) {
            logger.error('Error al manejar mensaje entrante:', error);
        }
    }

    /**
     * Obtener cliente por ID de instancia
     */
    getClient(instanceId) {
        return this.clients.get(instanceId);
    }

    /**
     * Verificar si una instancia está conectada
     */
    isConnected(instanceId) {
        try {
            const client = this.clients.get(instanceId);
            return client && client.info && client.info.wid;
        } catch (error) {
            logger.warn(`Error checking connection status for instance ${instanceId}:`, error.message);
            return false;
        }
    }

    /**
     * Desconectar una instancia
     */
    async disconnectInstance(instanceId) {
        try {
            logger.info(`Iniciando desconexión de instancia ${instanceId}`);
            
            // Update status first for immediate feedback
            const instance = await WhatsappInstance.findByPk(instanceId);
            if (instance) {
                await instance.updateStatus('disconnected');
                logger.info(`Estado de instancia ${instanceId} actualizado a desconectado`);
            }

            // Handle client destruction asynchronously to avoid blocking
            const client = this.clients.get(instanceId);
            if (client) {
                // Remove from clients map immediately
                this.clients.delete(instanceId);
                
                // Destroy client in background with timeout
                Promise.race([
                    client.destroy(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Client destroy timeout')), 5000))
                ])
                .then(() => {
                    logger.info(`Cliente de instancia ${instanceId} destruido exitosamente`);
                })
                .catch(error => {
                    logger.warn(`Error al destruir cliente ${instanceId} (no crítico):`, error.message);
                });
                
                logger.info(`Instancia ${instanceId} desconectada (cliente removido del mapa)`);
            }

        } catch (error) {
            logger.error(`Error al desconectar instancia ${instanceId}:`, error);
            throw error;
        }
    }

    /**
     * Obtener número de clientes activos
     */
    getActiveClientsCount() {
        return this.clients.size;
    }

    /**
     * Enviar mensaje desde una instancia
     */
    async sendMessage(instanceId, to, message) {
        try {
            const client = this.getClient(instanceId);
            if (!client || !this.isConnected(instanceId)) {
                throw new Error('Cliente no conectado');
            }

            // Formatear número si es necesario
            const chatId = to.includes('@') ? to : `${to}@c.us`;
            
            await client.sendMessage(chatId, message);
            logger.info(`Mensaje enviado desde instancia ${instanceId} a ${to}`);

        } catch (error) {
            logger.error(`Error al enviar mensaje desde instancia ${instanceId}:`, error);
            throw error;
        }
    }

    /**
     * Crear nueva instancia de WhatsApp
     */
    async createInstance(userId, numberName) {
        try {
            logger.info(`🔥 DEBUG: Creando nueva instancia para usuario ${userId}: ${numberName}`);

            // Crear registro en base de datos
            const instance = await WhatsappInstance.create({
                userId,
                numberName,
                status: 'qr_pending',
                isActive: true
            });

            logger.info(`🔥 DEBUG: Instancia creada con ID: ${instance.id}`);

            // Inicializar cliente WhatsApp de forma asíncrona (no bloquear la respuesta)
            logger.info(`🔥 DEBUG: Iniciando cliente WhatsApp para instancia ${instance.id}`);
            setImmediate(() => {
                this.initializeInstance(instance.id).catch(error => {
                    logger.error(`Error inicializando instancia ${instance.id}:`, error);
                });
            });

            return {
                success: true,
                instance: {
                    id: instance.id,
                    numberName: instance.numberName,
                    status: instance.status
                }
            };

        } catch (error) {
            logger.error('Error al crear instancia:', error);
            throw error;
        }
    }

    /**
     * Obtener información de todas las instancias
     */
    getAllInstancesStatus() {
        const status = {};
        
        for (const [instanceId, client] of this.clients.entries()) {
            status[instanceId] = {
                connected: this.isConnected(instanceId),
                info: client.info || null
            };
        }

        return status;
    }

    /**
     * Sincronizar chats existentes cuando el cliente se conecta
     */
    async syncExistingChats(client, instance) {
        try {
            logger.info(`🔄 Sincronizando chats existentes para instancia ${instance.id}`);

            // Obtener todos los chats
            const chats = await client.getChats();
            logger.info(`📱 Encontrados ${chats.length} chats en WhatsApp`);

            let syncedCount = 0;
            let errorCount = 0;

            for (const chat of chats) {
                try {
                    // Solo procesar chats individuales (no grupos por ahora)
                    if (!chat.isGroup) {
                        const contactId = chat.id._serialized;
                        const contactName = chat.name || chat.contact?.name || chat.contact?.pushname || chat.contact?.number || 'Sin nombre';

                        // Verificar si ya existe la conversación
                        let conversation = await Conversation.findOne({
                            where: {
                                whatsappInstanceId: instance.id,
                                contactId: contactId
                            }
                        });

                        if (!conversation) {
                            // Crear nueva conversación
                            conversation = await Conversation.create({
                                whatsappInstanceId: instance.id,
                                contactId: contactId,
                                contactName: contactName,
                                status: 'inbox',
                                lastMessage: chat.lastMessage?.body || '',
                                lastMessageAt: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
                                unreadCount: chat.unreadCount || 0,
                                isActive: true
                            });

                            // Si hay un último mensaje, crearlo en la base de datos
                            if (chat.lastMessage && chat.lastMessage.body) {
                                await Message.create({
                                    conversationId: conversation.id,
                                    whatsappMessageId: chat.lastMessage.id?._serialized || `sync_${Date.now()}_${Math.random()}`,
                                    direction: chat.lastMessage.fromMe ? 'outgoing' : 'incoming',
                                    messageType: chat.lastMessage.type === 'chat' ? 'text' : chat.lastMessage.type || 'text',
                                    body: chat.lastMessage.body,
                                    sentById: chat.lastMessage.fromMe ? instance.userId : null,
                                    sentAt: new Date(chat.lastMessage.timestamp * 1000),
                                    isRead: chat.lastMessage.fromMe || chat.unreadCount === 0
                                });
                            }

                            syncedCount++;
                            logger.info(`✅ Chat sincronizado: ${contactName} (${contactId})`);
                        } else {
                            // Actualizar conversación existente si hay nuevos datos
                            if (chat.lastMessage && chat.lastMessage.body && 
                                conversation.lastMessage !== chat.lastMessage.body) {
                                
                                await conversation.update({
                                    lastMessage: chat.lastMessage.body,
                                    lastMessageAt: new Date(chat.lastMessage.timestamp * 1000),
                                    unreadCount: chat.unreadCount || 0,
                                    contactName: contactName
                                });
                                
                                logger.info(`🔄 Chat actualizado: ${contactName}`);
                            }
                        }
                    }
                } catch (chatError) {
                    errorCount++;
                    logger.error(`Error sincronizando chat ${chat.id?._serialized || 'unknown'}:`, chatError);
                }
            }

            logger.info(`🎉 Sincronización completada para instancia ${instance.id}: ${syncedCount} chats sincronizados, ${errorCount} errores`);

            // Emitir evento de sincronización completada
            if (this.io) {
                this.io.to(`instance_${instance.id}`).emit('chats_synced', {
                    instanceId: instance.id,
                    syncedCount,
                    totalChats: chats.length
                });
            }

        } catch (error) {
            logger.error(`Error al sincronizar chats para instancia ${instance.id}:`, error);
        }
    }

    /**
     * Reinicializar todas las instancias activas al inicio del servidor
     */
    async initializeAllActiveInstances() {
        try {
            const activeInstances = await WhatsappInstance.findAll({
                where: { isActive: true }
            });

            logger.info(`Inicializando ${activeInstances.length} instancias activas`);

            for (const instance of activeInstances) {
                try {
                    await this.initializeInstance(instance.id);
                } catch (error) {
                    logger.error(`Error al inicializar instancia ${instance.id}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error al inicializar instancias activas:', error);
        }
    }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
