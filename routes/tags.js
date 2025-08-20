/**
 * Rutas para gestión de etiquetas
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, canAccessInstance } = require('../middleware/auth');
const { Tag, Conversation, ConversationTag, User, WhatsappInstance } = require('../models');
const logger = require('../config/logger');

// GET /api/tags/instance/:instanceId - Obtener etiquetas de una instancia
router.get('/instance/:instanceId', isAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const tags = await Tag.findByInstance(req.params.instanceId);

        res.json({
            success: true,
            data: tags
        });
    } catch (error) {
        logger.error('Error obteniendo etiquetas:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// POST /api/tags/instance/:instanceId - Crear nueva etiqueta
router.post('/instance/:instanceId', isAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const { name, color, description } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la etiqueta es obligatorio'
            });
        }

        if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
            return res.status(400).json({
                success: false,
                message: 'El color debe ser un valor hexadecimal válido'
            });
        }

        const tag = await Tag.createTag(
            req.params.instanceId,
            name.trim(),
            color,
            description?.trim()
        );

        logger.info(`Etiqueta "${name}" creada para instancia ${req.params.instanceId} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Etiqueta creada correctamente',
            data: tag
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una etiqueta con ese nombre en esta instancia'
            });
        }

        logger.error('Error creando etiqueta:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// PUT /api/tags/:tagId - Actualizar etiqueta
router.put('/:tagId', isAuthenticated, async (req, res) => {
    try {
        const tag = await Tag.findByPk(req.params.tagId, {
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance'
                }
            ]
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiqueta no encontrada'
            });
        }

        // Verificar acceso a la instancia
        if (req.user.role !== 'admin' && tag.whatsappInstance.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a esta etiqueta'
            });
        }

        const { name, color, description, isActive } = req.body;
        
        if (name !== undefined) {
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la etiqueta es obligatorio'
                });
            }
            tag.name = name.trim();
        }

        if (color !== undefined) {
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
                return res.status(400).json({
                    success: false,
                    message: 'El color debe ser un valor hexadecimal válido'
                });
            }
            tag.color = color;
        }

        if (description !== undefined) {
            tag.description = description?.trim() || null;
        }

        if (isActive !== undefined) {
            tag.isActive = isActive;
        }

        await tag.save();

        logger.info(`Etiqueta ${tag.id} actualizada por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Etiqueta actualizada correctamente',
            data: tag
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una etiqueta con ese nombre en esta instancia'
            });
        }

        logger.error('Error actualizando etiqueta:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// DELETE /api/tags/:tagId - Eliminar etiqueta
router.delete('/:tagId', isAuthenticated, async (req, res) => {
    try {
        const tag = await Tag.findByPk(req.params.tagId, {
            include: [
                {
                    model: WhatsappInstance,
                    as: 'whatsappInstance'
                }
            ]
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiqueta no encontrada'
            });
        }

        // Verificar acceso a la instancia
        if (req.user.role !== 'admin' && tag.whatsappInstance.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a esta etiqueta'
            });
        }

        // Eliminar todas las asignaciones de la etiqueta
        await ConversationTag.destroy({
            where: { tagId: tag.id }
        });

        await tag.destroy();

        logger.info(`Etiqueta ${tag.id} eliminada por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Etiqueta eliminada correctamente'
        });
    } catch (error) {
        logger.error('Error eliminando etiqueta:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

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

// POST /api/tags/conversation/:conversationId/assign - Asignar etiqueta a conversación
router.post('/conversation/:conversationId/assign', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const { tagId } = req.body;
        
        if (!tagId) {
            return res.status(400).json({
                success: false,
                message: 'ID de etiqueta es obligatorio'
            });
        }

        // Verificar que la etiqueta existe y pertenece a la misma instancia
        const tag = await Tag.findByPk(tagId);
        if (!tag || tag.whatsappInstanceId !== req.conversation.whatsappInstanceId) {
            return res.status(400).json({
                success: false,
                message: 'Etiqueta no válida'
            });
        }

        // Verificar si ya está asignada
        const existingAssignment = await ConversationTag.findOne({
            where: {
                conversationId: req.conversation.id,
                tagId
            }
        });

        if (existingAssignment) {
            return res.status(400).json({
                success: false,
                message: 'La etiqueta ya está asignada a esta conversación'
            });
        }

        await ConversationTag.create({
            conversationId: req.conversation.id,
            tagId,
            assignedById: req.user.id
        });

        logger.info(`Etiqueta ${tagId} asignada a conversación ${req.conversation.id} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Etiqueta asignada correctamente'
        });
    } catch (error) {
        logger.error('Error asignando etiqueta:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// DELETE /api/tags/conversation/:conversationId/unassign/:tagId - Desasignar etiqueta de conversación
router.delete('/conversation/:conversationId/unassign/:tagId', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const { tagId } = req.params;

        const assignment = await ConversationTag.findOne({
            where: {
                conversationId: req.conversation.id,
                tagId
            }
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'La etiqueta no está asignada a esta conversación'
            });
        }

        await assignment.destroy();

        logger.info(`Etiqueta ${tagId} desasignada de conversación ${req.conversation.id} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Etiqueta desasignada correctamente'
        });
    } catch (error) {
        logger.error('Error desasignando etiqueta:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

module.exports = router;
