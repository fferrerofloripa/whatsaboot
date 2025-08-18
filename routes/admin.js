/**
 * Rutas de administración
 */

const express = require('express');
const { User, WhatsappInstance, AutoResponse } = require('../models');
const { isAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Aplicar middleware de admin a todas las rutas
router.use(isAdmin);

/**
 * Panel de administración principal
 */
router.get('/', async (req, res) => {
    try {
        // Obtener estadísticas generales
        const stats = {
            totalUsers: await User.count(),
            totalInstances: await WhatsappInstance.count(),
            connectedInstances: await WhatsappInstance.count({ where: { status: 'connected' } }),
            totalAutoResponses: await AutoResponse.count(),
            adminUsers: await User.count({ where: { role: 'admin' } })
        };

        res.render('admin/index', {
            title: 'Administración - WhatsaBoot',
            stats
        });

    } catch (error) {
        logger.error('Error en panel de administración:', error);
        res.status(500).render('errors/500', {
            title: 'Error - WhatsaBoot',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Gestión de usuarios
 */
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{
                model: WhatsappInstance,
                as: 'whatsappInstances'
            }],
            order: [['createdAt', 'DESC']]
        });

        res.render('admin/users', {
            title: 'Gestión de Usuarios - WhatsaBoot',
            users
        });

    } catch (error) {
        logger.error('Error al cargar usuarios:', error);
        res.status(500).render('errors/500', {
            title: 'Error - WhatsaBoot',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Gestión de números de WhatsApp
 */
router.get('/numbers', async (req, res) => {
    try {
        const instances = await WhatsappInstance.findAll({
            include: [{
                model: User,
                as: 'user'
            }],
            order: [['createdAt', 'DESC']]
        });

        const users = await User.findAll({
            where: { isActive: true },
            order: [['displayName', 'ASC']]
        });

        res.render('admin/numbers', {
            title: 'Gestión de Números - WhatsaBoot',
            instances,
            users
        });

    } catch (error) {
        logger.error('Error al cargar números:', error);
        res.status(500).render('errors/500', {
            title: 'Error - WhatsaBoot',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Cambiar rol de usuario
 */
router.post('/users/:id/role', async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir cambiar el rol del propio usuario si es el único admin
        if (user.id === req.user.id && role === 'user') {
            const adminCount = await User.count({ where: { role: 'admin' } });
            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'No puedes quitarte permisos de admin siendo el único administrador'
                });
            }
        }

        user.role = role;
        await user.save();

        logger.info(`Rol de usuario ${user.email} cambiado a ${role} por ${req.user.email}`);

        res.json({
            success: true,
            message: `Rol actualizado a ${role}`
        });

    } catch (error) {
        logger.error('Error al cambiar rol:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Activar/desactivar usuario
 */
router.post('/users/:id/toggle', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir desactivar el propio usuario
        if (user.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propia cuenta'
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        logger.info(`Usuario ${user.email} ${user.isActive ? 'activado' : 'desactivado'} por ${req.user.email}`);

        res.json({
            success: true,
            message: `Usuario ${user.isActive ? 'activado' : 'desactivado'}`,
            isActive: user.isActive
        });

    } catch (error) {
        logger.error('Error al cambiar estado de usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Asignar instancia a usuario
 */
router.post('/numbers/:id/assign', async (req, res) => {
    try {
        const instanceId = req.params.id;
        const { userId } = req.body;

        const instance = await WhatsappInstance.findByPk(instanceId);
        if (!instance) {
            return res.status(404).json({
                success: false,
                message: 'Instancia no encontrada'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        instance.userId = userId;
        await instance.save();

        logger.info(`Instancia ${instance.numberName} asignada a ${user.email} por ${req.user.email}`);

        res.json({
            success: true,
            message: `Instancia asignada a ${user.displayName}`
        });

    } catch (error) {
        logger.error('Error al asignar instancia:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
