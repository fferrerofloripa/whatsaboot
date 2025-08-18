/**
 * Rutas del dashboard principal
 */

const express = require('express');
const { WhatsappInstance, AutoResponse } = require('../models');
const whatsappService = require('../services/whatsappService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Dashboard principal
 */
router.get('/', async (req, res) => {
    try {
        // Obtener instancias del usuario
        const instances = await WhatsappInstance.findByUserId(req.user.id);
        
        // Obtener estadísticas
        const stats = {
            totalInstances: instances.length,
            connectedInstances: instances.filter(i => i.status === 'connected').length,
            totalAutoResponses: 0
        };

        // Contar respuestas automáticas
        for (const instance of instances) {
            const responses = await AutoResponse.findByInstanceId(instance.id);
            stats.totalAutoResponses += responses.length;
        }

        res.render('dashboard/index', {
            title: 'Dashboard - WhatsaBoot',
            user: req.user,
            instances,
            stats
        });

    } catch (error) {
        logger.error('Error en dashboard:', error);
        res.status(500).render('errors/500', {
            title: 'Error - WhatsaBoot',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Vista de configuración de instancia
 */
router.get('/instance/:id', async (req, res) => {
    try {
        const instanceId = req.params.id;
        
        // Verificar que la instancia pertenece al usuario (o es admin)
        const instance = await WhatsappInstance.findByPk(instanceId, {
            include: ['autoResponses']
        });

        if (!instance) {
            return res.status(404).render('errors/404', {
                title: 'Instancia no encontrada - WhatsaBoot'
            });
        }

        if (instance.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).render('errors/403', {
                title: 'Acceso denegado - WhatsaBoot'
            });
        }

        res.render('dashboard/instance', {
            title: `${instance.numberName} - WhatsaBoot`,
            instance,
            autoResponses: instance.autoResponses || []
        });

    } catch (error) {
        logger.error('Error al cargar instancia:', error);
        res.status(500).render('errors/500', {
            title: 'Error - WhatsaBoot',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Página de configuración
 */
router.get('/settings', async (req, res) => {
    try {
        const instances = await WhatsappInstance.findByUserId(req.user.id);
        
        res.render('dashboard/settings', {
            title: 'Configuración - WhatsaBoot',
            instances
        });

    } catch (error) {
        logger.error('Error en configuración:', error);
        res.status(500).render('errors/500', {
            title: 'Error - WhatsaBoot',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router;
