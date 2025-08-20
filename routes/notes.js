/**
 * Rutas para gestión de notas internas
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { Note, Conversation, User, WhatsappInstance } = require('../models');
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

// GET /api/notes/conversation/:conversationId - Obtener notas de una conversación
router.get('/conversation/:conversationId', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const notes = await Note.findByConversation(req.conversation.id);
        
        // Incluir información del autor
        const notesWithAuthors = await Note.findAll({
            where: { conversationId: req.conversation.id },
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'displayName', 'email']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        res.json({
            success: true,
            data: notesWithAuthors
        });
    } catch (error) {
        logger.error('Error obteniendo notas:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// POST /api/notes/conversation/:conversationId - Crear nueva nota
router.post('/conversation/:conversationId', isAuthenticated, canAccessConversation, async (req, res) => {
    try {
        const { body, isImportant = false } = req.body;
        
        if (!body || body.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El contenido de la nota no puede estar vacío'
            });
        }

        const note = await Note.createNote(
            req.conversation.id,
            req.user.id,
            body.trim(),
            isImportant
        );

        // Obtener la nota con información del autor
        const noteWithAuthor = await Note.findByPk(note.id, {
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'displayName', 'email']
                }
            ]
        });

        logger.info(`Nota creada en conversación ${req.conversation.id} por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Nota creada correctamente',
            data: noteWithAuthor
        });
    } catch (error) {
        logger.error('Error creando nota:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// PUT /api/notes/:noteId - Actualizar nota
router.put('/:noteId', isAuthenticated, async (req, res) => {
    try {
        const note = await Note.findByPk(req.params.noteId, {
            include: [
                {
                    model: Conversation,
                    as: 'conversation',
                    include: [
                        {
                            model: WhatsappInstance,
                            as: 'whatsappInstance'
                        }
                    ]
                }
            ]
        });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Nota no encontrada'
            });
        }

        // Verificar permisos
        const whatsappInstance = note.conversation.whatsappInstance;
        if (req.user.role !== 'admin' && 
            whatsappInstance.userId !== req.user.id && 
            note.authorId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para editar esta nota'
            });
        }

        const { body, isImportant } = req.body;
        
        if (body !== undefined) {
            if (!body || body.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El contenido de la nota no puede estar vacío'
                });
            }
            note.body = body.trim();
        }

        if (isImportant !== undefined) {
            note.isImportant = isImportant;
        }

        await note.save();

        logger.info(`Nota ${note.id} actualizada por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Nota actualizada correctamente',
            data: note
        });
    } catch (error) {
        logger.error('Error actualizando nota:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// DELETE /api/notes/:noteId - Eliminar nota
router.delete('/:noteId', isAuthenticated, async (req, res) => {
    try {
        const note = await Note.findByPk(req.params.noteId, {
            include: [
                {
                    model: Conversation,
                    as: 'conversation',
                    include: [
                        {
                            model: WhatsappInstance,
                            as: 'whatsappInstance'
                        }
                    ]
                }
            ]
        });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Nota no encontrada'
            });
        }

        // Verificar permisos
        const whatsappInstance = note.conversation.whatsappInstance;
        if (req.user.role !== 'admin' && 
            whatsappInstance.userId !== req.user.id && 
            note.authorId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para eliminar esta nota'
            });
        }

        await note.destroy();

        logger.info(`Nota ${note.id} eliminada por ${req.user.email}`);

        res.json({
            success: true,
            message: 'Nota eliminada correctamente'
        });
    } catch (error) {
        logger.error('Error eliminando nota:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

module.exports = router;
