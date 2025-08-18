/**
 * API Routes para gestión del bot
 */

const express = require('express');
const { WhatsappInstance, AutoResponse } = require('../models');
const whatsappService = require('../services/whatsappService');
const { canAccessInstance } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Crear nueva instancia de WhatsApp
 */
router.post('/instances', async (req, res) => {
    try {
        const { numberName } = req.body;

        if (!numberName || numberName.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del número es requerido'
            });
        }

        // Crear instancia usando el servicio (que crea BD + inicializa cliente)
        const result = await whatsappService.createInstance(req.user.id, numberName.trim());

        logger.info(`Nueva instancia creada: ${numberName.trim()} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Instancia creada exitosamente. Escanea el código QR...',
            instance: result.instance
        });

    } catch (error) {
        logger.error('Error al crear instancia:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Inicializar conexión de WhatsApp
 */
router.post('/instances/:instanceId/connect', canAccessInstance, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        
        // Verificar que la instancia no esté ya conectada
        if (whatsappService.isConnected(instanceId)) {
            return res.json({
                success: true,
                message: 'La instancia ya está conectada'
            });
        }

        // Inicializar la instancia
        await whatsappService.initializeInstance(instanceId);

        res.json({
            success: true,
            message: 'Inicializando conexión... Por favor escanea el código QR'
        });

    } catch (error) {
        logger.error('Error al conectar instancia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al inicializar la conexión'
        });
    }
});

/**
 * Desconectar instancia de WhatsApp
 */
router.post('/instances/:instanceId/disconnect', canAccessInstance, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        
        await whatsappService.disconnectInstance(instanceId);

        res.json({
            success: true,
            message: 'Instancia desconectada exitosamente'
        });

    } catch (error) {
        logger.error('Error al desconectar instancia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al desconectar la instancia'
        });
    }
});

/**
 * Obtener estado de la instancia
 */
router.get('/instances/:instanceId/status', canAccessInstance, async (req, res) => {
    try {
        const instance = req.whatsappInstance;
        
        // Refresh instance data from database
        await instance.reload();
        
        // Check connection status safely
        let isConnected = false;
        try {
            isConnected = whatsappService.isConnected(instance.id);
        } catch (statusError) {
            logger.warn(`Error checking connection for instance ${instance.id}:`, statusError.message);
            isConnected = false;
        }

        res.json({
            success: true,
            status: {
                id: instance.id,
                numberName: instance.numberName,
                phoneNumber: instance.phoneNumber || null,
                status: instance.status,
                isConnected,
                qrCode: instance.qrCode || null,
                lastConnection: instance.lastConnection || null,
                errorMessage: instance.errorMessage || null,
                updatedAt: instance.updatedAt
            }
        });

    } catch (error) {
        logger.error(`Error al obtener estado de instancia ${req.params.instanceId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Enviar mensaje de prueba
 */
router.post('/instances/:instanceId/send', canAccessInstance, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                success: false,
                message: 'Número de destino y mensaje son requeridos'
            });
        }

        await whatsappService.sendMessage(instanceId, to, message);

        res.json({
            success: true,
            message: 'Mensaje enviado exitosamente'
        });

    } catch (error) {
        logger.error('Error al enviar mensaje:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar el mensaje'
        });
    }
});

/**
 * Crear respuesta automática
 */
router.post('/instances/:instanceId/autoresponses', canAccessInstance, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        const { keyword, responseMessage, matchType = 'contains', caseSensitive = false, priority = 1 } = req.body;

        if (!keyword || !responseMessage) {
            return res.status(400).json({
                success: false,
                message: 'Palabra clave y mensaje de respuesta son requeridos'
            });
        }

        const autoResponse = await AutoResponse.create({
            whatsappInstanceId: instanceId,
            keyword: keyword.trim(),
            responseMessage: responseMessage.trim(),
            matchType,
            caseSensitive,
            priority
        });

        logger.info(`Respuesta automática creada para instancia ${instanceId}: ${keyword}`);

        res.json({
            success: true,
            message: 'Respuesta automática creada exitosamente',
            autoResponse: {
                id: autoResponse.id,
                keyword: autoResponse.keyword,
                responseMessage: autoResponse.responseMessage,
                matchType: autoResponse.matchType,
                priority: autoResponse.priority
            }
        });

    } catch (error) {
        logger.error('Error al crear respuesta automática:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Obtener respuestas automáticas
 */
router.get('/instances/:instanceId/autoresponses', canAccessInstance, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        const autoResponses = await AutoResponse.findByInstanceId(instanceId);

        res.json({
            success: true,
            autoResponses
        });

    } catch (error) {
        logger.error('Error al obtener respuestas automáticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Actualizar respuesta automática
 */
router.put('/instances/:instanceId/autoresponses/:responseId', canAccessInstance, async (req, res) => {
    try {
        const { responseId } = req.params;
        const { keyword, responseMessage, matchType, caseSensitive, priority, isActive } = req.body;

        const autoResponse = await AutoResponse.findByPk(responseId);
        if (!autoResponse) {
            return res.status(404).json({
                success: false,
                message: 'Respuesta automática no encontrada'
            });
        }

        // Verificar que la respuesta pertenece a la instancia
        if (autoResponse.whatsappInstanceId !== parseInt(req.params.instanceId)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para editar esta respuesta'
            });
        }

        // Actualizar campos
        if (keyword) autoResponse.keyword = keyword.trim();
        if (responseMessage) autoResponse.responseMessage = responseMessage.trim();
        if (matchType) autoResponse.matchType = matchType;
        if (caseSensitive !== undefined) autoResponse.caseSensitive = caseSensitive;
        if (priority !== undefined) autoResponse.priority = priority;
        
        // Handle isActive toggle
        if (isActive !== undefined) {
            if (isActive === 'toggle') {
                autoResponse.isActive = !autoResponse.isActive;
            } else {
                autoResponse.isActive = Boolean(isActive);
            }
        }

        await autoResponse.save();

        res.json({
            success: true,
            message: 'Respuesta automática actualizada exitosamente',
            autoResponse
        });

    } catch (error) {
        logger.error('Error al actualizar respuesta automática:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Eliminar instancia de WhatsApp
 */
router.delete('/instances/:instanceId', canAccessInstance, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        const instance = req.whatsappInstance;

        // Desconectar el cliente si está activo
        await whatsappService.disconnectInstance(instanceId);

        // Eliminar todas las respuestas automáticas asociadas
        await AutoResponse.destroy({
            where: { whatsappInstanceId: instanceId }
        });

        // Eliminar la instancia
        await instance.destroy();

        logger.info(`Instancia ${instanceId} eliminada por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Instancia eliminada exitosamente'
        });

    } catch (error) {
        logger.error('Error al eliminar instancia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la instancia'
        });
    }
});

/**
 * Eliminar respuesta automática
 */
router.delete('/instances/:instanceId/autoresponses/:responseId', canAccessInstance, async (req, res) => {
    try {
        const { responseId } = req.params;

        const autoResponse = await AutoResponse.findByPk(responseId);
        if (!autoResponse) {
            return res.status(404).json({
                success: false,
                message: 'Respuesta automática no encontrada'
            });
        }

        // Verificar que la respuesta pertenece a la instancia
        if (autoResponse.whatsappInstanceId !== parseInt(req.params.instanceId)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para eliminar esta respuesta'
            });
        }

        await autoResponse.destroy();

        res.json({
            success: true,
            message: 'Respuesta automática eliminada exitosamente'
        });

    } catch (error) {
        logger.error('Error al eliminar respuesta automática:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Obtener todas las instancias del usuario
 */
router.get('/instances', async (req, res) => {
    try {
        const instances = await WhatsappInstance.findByUserId(req.user.id);
        
        // Agregar estado de conexión
        const instancesWithStatus = instances.map(instance => ({
            ...instance.toJSON(),
            isConnected: whatsappService.isConnected(instance.id)
        }));

        res.json({
            success: true,
            instances: instancesWithStatus
        });

    } catch (error) {
        logger.error('Error al obtener instancias:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
