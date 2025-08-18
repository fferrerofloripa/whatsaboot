/**
 * Servicio de WhatsApp Web.js
 * Maneja múltiples instancias de WhatsApp
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { WhatsappInstance, AutoResponse } = require('../models');
const logger = require('../config/logger');
const aiService = require('./aiService');

class WhatsAppService {
    constructor() {
        this.clients = new Map(); // Mapa de clientes activos
        this.io = null; // Socket.IO instance
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
            // Solo procesar mensajes de texto que no sean del propio bot
            if (message.body && !message.fromMe) {
                logger.info(`Mensaje recibido en instancia ${instance.id}: ${message.body}`);

                // Buscar respuesta automática
                const autoResponse = await AutoResponse.findMatchingResponse(
                    instance.id,
                    message.body
                );

                if (autoResponse) {
                    // Enviar respuesta automática
                    await message.reply(autoResponse.responseMessage);
                    await autoResponse.incrementUsage();
                    
                    logger.info(`Respuesta automática enviada: ${autoResponse.keyword}`);
                } else {
                    // Opcional: Usar IA para respuesta (comentado por defecto)
                    /*
                    try {
                        const aiResponse = await aiService.getDeepSeekResponse(message.body);
                        await message.reply(aiResponse);
                        logger.info('Respuesta de IA enviada');
                    } catch (aiError) {
                        logger.error('Error al obtener respuesta de IA:', aiError);
                    }
                    */
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
        const client = this.clients.get(instanceId);
        return client && client.info;
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

            // Inicializar cliente WhatsApp inmediatamente
            logger.info(`🔥 DEBUG: Iniciando cliente WhatsApp para instancia ${instance.id}`);
            await this.initializeInstance(instance.id);
            logger.info(`🔥 DEBUG: Cliente inicializado para instancia ${instance.id}`);

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
