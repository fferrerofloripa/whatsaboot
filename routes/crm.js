/**
 * Rutas para la interfaz CRM
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, canAccessInstance } = require('../middleware/auth');
const { WhatsappInstance, User } = require('../models');

// GET /test-layout - Test de layout
router.get('/test-layout', isAuthenticated, async (req, res) => {
    try {
        res.render('test-layout', {
            title: 'Test Layout - WhatsaBoot',
            pageTitle: 'Test del Layout',
            layout: 'layouts/modern',
            user: req.user,
            currentPath: req.path
        });
    } catch (error) {
        console.error('Error en test layout:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// GET /crm - Página principal del CRM
router.get('/', isAuthenticated, async (req, res) => {
    // Disable express-ejs-layouts for this route
    res.locals.layout = false;
    
    // Set CORS headers to prevent CORB issues
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    try {
        // Obtener las instancias del usuario
        const instances = await WhatsappInstance.findByUserId(req.user.id);
        console.log('🔍 CRM Route - Found instances for user:', req.user.id, instances.length);
        instances.forEach(instance => {
            console.log(`  - Instance ${instance.id}: ${instance.numberName} (${instance.status})`);
        });
        
        // Obtener todos los usuarios para asignación de agentes
        const users = await User.findAll({
            attributes: ['id', 'displayName', 'email'],
            order: [['displayName', 'ASC']]
        });

        res.render('crm/standalone', {
            layout: false, // Disable layout for standalone CRM
            title: 'CRM - WhatsaBoot',
            pageTitle: 'Conversaciones CRM',
            instances,
            users,
            user: req.user,
            currentPath: req.path,
            instanceId: null
        });
    } catch (error) {
        console.error('Error en CRM:', error);
        res.status(500).render('errors/500', {
            title: 'Error del servidor - WhatsaBoot',
            error: error.message
        });
    }
});

// GET /crm/full - Vista CRM completa
router.get('/full', isAuthenticated, async (req, res) => {
    // Disable express-ejs-layouts for this route
    res.locals.layout = false;
    try {
        // Obtener las instancias del usuario
        const instances = await WhatsappInstance.findByUserId(req.user.id);
        
        // Obtener todos los usuarios para asignación de agentes
        const users = await User.findAll({
            attributes: ['id', 'displayName', 'email'],
            order: [['displayName', 'ASC']]
        });

        res.render('crm/standalone', {
            layout: false, // Disable layout for standalone CRM
            title: 'CRM - WhatsaBoot',
            pageTitle: 'Conversaciones CRM',
            instances,
            users,
            user: req.user,
            currentPath: req.path,
            instanceId: null
        });
    } catch (error) {
        console.error('Error en CRM completo:', error);
        res.status(500).render('errors/500', {
            title: 'Error del servidor - WhatsaBoot',
            error: error.message
        });
    }
});

// GET /crm/instance/:instanceId - CRM para una instancia específica
router.get('/instance/:instanceId', isAuthenticated, canAccessInstance, async (req, res) => {
    // Disable express-ejs-layouts for this route
    res.locals.layout = false;
    try {
        const instance = req.whatsappInstance;
        
        // Obtener todos los usuarios para asignación de agentes
        const users = await User.findAll({
            attributes: ['id', 'displayName', 'email'],
            order: [['displayName', 'ASC']]
        });

        res.render('crm/standalone', {
            layout: false, // Disable layout for standalone CRM
            title: `CRM - ${instance.numberName} - WhatsaBoot`,
            pageTitle: `Conversaciones - ${instance.numberName}`,
            instance,
            instances: [instance], // Para que funcione el selector
            users,
            user: req.user,
            currentPath: req.path,
            instanceId: instance.id
        });
    } catch (error) {
        console.error('Error en CRM instancia:', error);
        res.status(500).render('errors/500', {
            title: 'Error del servidor - WhatsaBoot',
            error: error.message
        });
    }
});

module.exports = router;
