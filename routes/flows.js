/**
 * Rutas para gestión de Flows (Creador de Bots)
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, canAccessInstance } = require('../middleware/auth');
const { Flow, Node, Edge, FlowExecution, WhatsappInstance } = require('../models');
const logger = require('../config/logger');

// GET /flows - Página principal del Flow Builder
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Obtener las instancias del usuario
        const instances = await WhatsappInstance.findAll({
            where: { userId: req.user.id, isActive: true },
            order: [['numberName', 'ASC']]
        });

        res.render('flows/index', {
            title: 'Flow Builder - WhatsaBoot',
            pageTitle: 'Creador de Bots',
            instances,
            layout: 'layouts/modern',
            user: req.user,
            currentPath: req.path
        });
    } catch (error) {
        logger.error('Error en Flow Builder:', error);
        res.status(500).render('errors/500', {
            title: 'Error del servidor - WhatsaBoot',
            error: error.message
        });
    }
});

// GET /flows/editor/:flowId? - Editor de flujos
router.get('/editor/:flowId?', isAuthenticated, async (req, res) => {
    try {
        const { flowId } = req.params;
        let flow = null;
        let nodes = [];
        let edges = [];

        if (flowId) {
            flow = await Flow.findOne({
                where: { id: flowId },
                include: [
                    {
                        model: WhatsappInstance,
                        as: 'whatsappInstance',
                        where: { userId: req.user.id }
                    }
                ]
            });

            if (!flow) {
                return res.status(404).render('errors/404', {
                    title: 'Flujo no encontrado - WhatsaBoot'
                });
            }

            nodes = await Node.findByFlow(flowId);
            edges = await Edge.findByFlow(flowId);
        }

        // Obtener instancias del usuario
        const instances = await WhatsappInstance.findAll({
            where: { userId: req.user.id, isActive: true },
            order: [['numberName', 'ASC']]
        });

        res.render('flows/editor', {
            title: flow ? `Editando: ${flow.name}` : 'Nuevo Flujo - WhatsaBoot',
            pageTitle: flow ? `Editando: ${flow.name}` : 'Nuevo Flujo',
            flow,
            nodes,
            edges,
            instances,
            layout: 'layouts/modern',
            user: req.user,
            currentPath: req.path
        });
    } catch (error) {
        logger.error('Error en editor de flujos:', error);
        res.status(500).render('errors/500', {
            title: 'Error del servidor - WhatsaBoot',
            error: error.message
        });
    }
});

// API Routes

// GET /api/flows - Obtener flows del usuario
router.get('/api', isAuthenticated, async (req, res) => {
    try {
        const { instanceId } = req.query;
        
        const where = {};
        if (instanceId) {
            where.whatsappInstanceId = instanceId;
        }

        const flows = await Flow.findAll({
            where,
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id },
                    attributes: ['id', 'numberName', 'status']
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        res.json({
            success: true,
            data: flows
        });
    } catch (error) {
        logger.error('Error obteniendo flows:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/flows - Crear nuevo flow
router.post('/api', isAuthenticated, async (req, res) => {
    try {
        const { name, description, whatsappInstanceId, trigger, triggerValue } = req.body;

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

        const flow = await Flow.create({
            name,
            description,
            whatsappInstanceId,
            trigger: trigger || 'keyword',
            triggerValue,
            createdById: req.user.id
        });

        logger.info(`Flow creado: ${name} por ${req.user.email}`);

        res.json({
            success: true,
            data: flow
        });
    } catch (error) {
        logger.error('Error creando flow:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/flows/:flowId - Actualizar flow
router.put('/api/:flowId', isAuthenticated, async (req, res) => {
    try {
        const { flowId } = req.params;
        const { name, description, trigger, triggerValue, isActive } = req.body;

        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        await flow.update({
            name: name || flow.name,
            description: description !== undefined ? description : flow.description,
            trigger: trigger || flow.trigger,
            triggerValue: triggerValue !== undefined ? triggerValue : flow.triggerValue,
            isActive: isActive !== undefined ? isActive : flow.isActive
        });

        logger.info(`Flow actualizado: ${flow.name} por ${req.user.email}`);

        res.json({
            success: true,
            data: flow
        });
    } catch (error) {
        logger.error('Error actualizando flow:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE /api/flows/:flowId - Eliminar flow
router.delete('/api/:flowId', isAuthenticated, async (req, res) => {
    try {
        const { flowId } = req.params;

        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        // Eliminar nodos y edges asociados
        await Node.destroy({ where: { flowId } });
        await Edge.destroy({ where: { flowId } });
        await FlowExecution.destroy({ where: { flowId } });
        await flow.destroy();

        logger.info(`Flow eliminado: ${flow.name} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Flow eliminado correctamente'
        });
    } catch (error) {
        logger.error('Error eliminando flow:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/flows/:flowId/nodes - Crear nodo
router.post('/api/:flowId/nodes', isAuthenticated, async (req, res) => {
    try {
        const { flowId } = req.params;
        const { nodeId, type, name, position, config } = req.body;

        // Verificar acceso al flow
        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        const node = await Node.create({
            flowId,
            nodeId,
            type,
            name,
            position,
            config
        });

        res.json({
            success: true,
            data: node
        });
    } catch (error) {
        logger.error('Error creando nodo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/flows/:flowId/nodes/:nodeId - Actualizar nodo
router.put('/api/:flowId/nodes/:nodeId', isAuthenticated, async (req, res) => {
    try {
        const { flowId, nodeId } = req.params;
        const { name, position, config } = req.body;

        // Verificar acceso al flow
        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        const node = await Node.findOne({
            where: { flowId, nodeId }
        });

        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Nodo no encontrado'
            });
        }

        await node.update({
            name: name || node.name,
            position: position || node.position,
            config: config || node.config
        });

        res.json({
            success: true,
            data: node
        });
    } catch (error) {
        logger.error('Error actualizando nodo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE /api/flows/:flowId/nodes/:nodeId - Eliminar nodo
router.delete('/api/:flowId/nodes/:nodeId', isAuthenticated, async (req, res) => {
    try {
        const { flowId, nodeId } = req.params;

        // Verificar acceso al flow
        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        // Eliminar edges relacionados
        await Edge.destroy({
            where: {
                flowId,
                $or: [
                    { sourceNodeId: nodeId },
                    { targetNodeId: nodeId }
                ]
            }
        });

        // Eliminar nodo
        await Node.destroy({
            where: { flowId, nodeId }
        });

        res.json({
            success: true,
            message: 'Nodo eliminado correctamente'
        });
    } catch (error) {
        logger.error('Error eliminando nodo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/flows/:flowId/edges - Crear edge
router.post('/api/:flowId/edges', isAuthenticated, async (req, res) => {
    try {
        const { flowId } = req.params;
        const { edgeId, sourceNodeId, targetNodeId, condition, label, order } = req.body;

        // Verificar acceso al flow
        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        const edge = await Edge.create({
            flowId,
            edgeId,
            sourceNodeId,
            targetNodeId,
            condition,
            label,
            order: order || 0
        });

        res.json({
            success: true,
            data: edge
        });
    } catch (error) {
        logger.error('Error creando edge:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE /api/flows/:flowId/edges/:edgeId - Eliminar edge
router.delete('/api/:flowId/edges/:edgeId', isAuthenticated, async (req, res) => {
    try {
        const { flowId, edgeId } = req.params;

        // Verificar acceso al flow
        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        await Edge.destroy({
            where: { flowId, edgeId }
        });

        res.json({
            success: true,
            message: 'Conexión eliminada correctamente'
        });
    } catch (error) {
        logger.error('Error eliminando edge:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/flows/:flowId/executions - Obtener ejecuciones del flow
router.get('/api/:flowId/executions', isAuthenticated, async (req, res) => {
    try {
        const { flowId } = req.params;
        const { status, limit = 50 } = req.query;

        // Verificar acceso al flow
        const flow = await Flow.findOne({
            where: { id: flowId },
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!flow) {
            return res.status(404).json({
                success: false,
                message: 'Flow no encontrado'
            });
        }

        const executions = await FlowExecution.findByFlow(flowId, status);

        res.json({
            success: true,
            data: executions.slice(0, parseInt(limit))
        });
    } catch (error) {
        logger.error('Error obteniendo ejecuciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
