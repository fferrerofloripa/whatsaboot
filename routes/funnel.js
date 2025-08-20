/**
 * Rutas para Funnel de Ventas (Kanban)
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, canAccessInstance } = require('../middleware/auth');
const { Funnel, Stage, Conversation, WhatsappInstance, User } = require('../models');
const logger = require('../config/logger');

// GET /funnel - Página principal del Funnel
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Obtener las instancias del usuario
        const instances = await WhatsappInstance.findAll({
            where: { userId: req.user.id, isActive: true },
            order: [['numberName', 'ASC']]
        });

        res.render('funnel/index', {
            title: 'Funnel de Ventas - WhatsaBoot',
            pageTitle: 'Funnel de Ventas',
            instances,
            layout: 'layouts/modern',
            user: req.user,
            currentPath: req.path
        });
    } catch (error) {
        logger.error('Error en Funnel:', error);
        res.status(500).render('errors/500', {
            title: 'Error del servidor - WhatsaBoot',
            error: error.message
        });
    }
});

// GET /funnel/board/:funnelId - Vista del tablero Kanban
router.get('/board/:funnelId', isAuthenticated, async (req, res) => {
    try {
        const { funnelId } = req.params;
        
        const funnel = await Funnel.findOne({
            where: { id: funnelId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                },
                {
                    model: Stage,
                    as: 'stages',
                    order: [['order', 'ASC']]
                }
            ]
        });

        if (!funnel) {
            return res.status(404).render('errors/404', {
                title: 'Funnel no encontrado - WhatsaBoot'
            });
        }

        res.render('funnel/board', {
            title: `${funnel.name} - Funnel - WhatsaBoot`,
            pageTitle: funnel.name,
            funnel,
            layout: 'layouts/modern',
            user: req.user,
            currentPath: req.path
        });
    } catch (error) {
        logger.error('Error en tablero de funnel:', error);
        res.status(500).render('errors/500', {
            title: 'Error del servidor - WhatsaBoot',
            error: error.message
        });
    }
});

// API Routes

// GET /api/funnels - Obtener funnels del usuario
router.get('/api', isAuthenticated, async (req, res) => {
    try {
        const { instanceId } = req.query;
        
        const where = {};
        if (instanceId) {
            where.whatsappInstanceId = instanceId;
        }

        const funnels = await Funnel.findAll({
            where,
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id },
                    attributes: ['id', 'numberName', 'status']
                },
                {
                    model: Stage,
                    as: 'stages',
                    order: [['order', 'ASC']]
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        res.json({
            success: true,
            data: funnels
        });
    } catch (error) {
        logger.error('Error obteniendo funnels:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/funnels - Crear nuevo funnel
router.post('/api', isAuthenticated, async (req, res) => {
    try {
        const { name, description, whatsappInstanceId, color } = req.body;

        if (!name || !whatsappInstanceId) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y instancia son requeridos'
            });
        }

        // Verificar que la instancia pertenece al usuario
        const instance = await WhatsappInstance.findOne({
            where: { id: whatsappInstanceId, userId: req.user.id }
        });

        if (!instance) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a esta instancia'
            });
        }

        const funnel = await Funnel.create({
            name,
            description,
            whatsappInstanceId,
            color: color || '#3b82f6',
            createdById: req.user.id
        });

        // Crear etapas por defecto
        const defaultStages = [
            { name: 'Nuevo Contacto', color: '#10b981', order: 1 },
            { name: 'Interesado', color: '#f59e0b', order: 2 },
            { name: 'Propuesta Enviada', color: '#3b82f6', order: 3 },
            { name: 'Negociación', color: '#8b5cf6', order: 4 },
            { name: 'Ganado', color: '#059669', order: 5, isClosing: true },
            { name: 'Perdido', color: '#dc2626', order: 6 }
        ];

        for (const stageData of defaultStages) {
            await Stage.create({
                ...stageData,
                funnelId: funnel.id
            });
        }

        logger.info(`Funnel creado: ${name} por ${req.user.email}`);

        res.json({
            success: true,
            data: funnel
        });
    } catch (error) {
        logger.error('Error creando funnel:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/funnels/:funnelId - Actualizar funnel
router.put('/api/:funnelId', isAuthenticated, async (req, res) => {
    try {
        const { funnelId } = req.params;
        const { name, description, color, isActive } = req.body;

        const funnel = await Funnel.findOne({
            where: { id: funnelId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!funnel) {
            return res.status(404).json({
                success: false,
                message: 'Funnel no encontrado'
            });
        }

        await funnel.update({
            name: name || funnel.name,
            description: description !== undefined ? description : funnel.description,
            color: color || funnel.color,
            isActive: isActive !== undefined ? isActive : funnel.isActive
        });

        logger.info(`Funnel actualizado: ${funnel.name} por ${req.user.email}`);

        res.json({
            success: true,
            data: funnel
        });
    } catch (error) {
        logger.error('Error actualizando funnel:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE /api/funnels/:funnelId - Eliminar funnel
router.delete('/api/:funnelId', isAuthenticated, async (req, res) => {
    try {
        const { funnelId } = req.params;

        const funnel = await Funnel.findOne({
            where: { id: funnelId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!funnel) {
            return res.status(404).json({
                success: false,
                message: 'Funnel no encontrado'
            });
        }

        // Eliminar etapas y funnel
        await Stage.destroy({ where: { funnelId } });
        await funnel.destroy();

        logger.info(`Funnel eliminado: ${funnel.name} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Funnel eliminado correctamente'
        });
    } catch (error) {
        logger.error('Error eliminando funnel:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/funnels/:funnelId/board - Obtener datos del tablero Kanban
router.get('/api/:funnelId/board', isAuthenticated, async (req, res) => {
    try {
        const { funnelId } = req.params;

        const funnel = await Funnel.findOne({
            where: { id: funnelId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                },
                {
                    model: Stage,
                    as: 'stages',
                    include: [
                        {
                            model: Conversation,
                            as: 'conversations',
                            include: [
                                {
                                    model: User,
                                    as: 'assignedTo',
                                    attributes: ['id', 'displayName']
                                }
                            ]
                        }
                    ],
                    order: [['order', 'ASC']]
                }
            ]
        });

        if (!funnel) {
            return res.status(404).json({
                success: false,
                message: 'Funnel no encontrado'
            });
        }

        res.json({
            success: true,
            data: funnel
        });
    } catch (error) {
        logger.error('Error obteniendo tablero:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/funnels/:funnelId/stages - Crear nueva etapa
router.post('/api/:funnelId/stages', isAuthenticated, async (req, res) => {
    try {
        const { funnelId } = req.params;
        const { name, description, color, order } = req.body;

        // Verificar acceso al funnel
        const funnel = await Funnel.findOne({
            where: { id: funnelId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!funnel) {
            return res.status(404).json({
                success: false,
                message: 'Funnel no encontrado'
            });
        }

        const stage = await Stage.create({
            funnelId,
            name,
            description,
            color: color || '#6b7280',
            order: order || 0
        });

        res.json({
            success: true,
            data: stage
        });
    } catch (error) {
        logger.error('Error creando etapa:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/stages/:stageId - Actualizar etapa
router.put('/api/stages/:stageId', isAuthenticated, async (req, res) => {
    try {
        const { stageId } = req.params;
        const { name, description, color, order } = req.body;

        const stage = await Stage.findOne({
            where: { id: stageId },
            include: [
                {
                    model: Funnel,
                    as: 'funnel',
                    include: [
                        {
                            model: WhatsappInstance,
                            as: 'whatsappInstance',
                            where: { userId: req.user.id }
                        }
                    ]
                }
            ]
        });

        if (!stage) {
            return res.status(404).json({
                success: false,
                message: 'Etapa no encontrada'
            });
        }

        await stage.update({
            name: name || stage.name,
            description: description !== undefined ? description : stage.description,
            color: color || stage.color,
            order: order !== undefined ? order : stage.order
        });

        res.json({
            success: true,
            data: stage
        });
    } catch (error) {
        logger.error('Error actualizando etapa:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/conversations/:conversationId/move - Mover conversación entre etapas
router.post('/api/conversations/:conversationId/move', isAuthenticated, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { stageId } = req.body;

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversación no encontrada'
            });
        }

        // Verificar que la etapa existe y pertenece al usuario
        const stage = await Stage.findOne({
            where: { id: stageId },
            include: [
                {
                    model: Funnel,
                    as: 'funnel',
                    include: [
                        {
                            model: WhatsappInstance,
                            as: 'whatsappInstance',
                            where: { userId: req.user.id }
                        }
                    ]
                }
            ]
        });

        if (!stage) {
            return res.status(404).json({
                success: false,
                message: 'Etapa no encontrada'
            });
        }

        await conversation.update({ stageId });

        logger.info(`Conversación ${conversationId} movida a etapa ${stage.name} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Conversación movida exitosamente'
        });
    } catch (error) {
        logger.error('Error moviendo conversación:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
