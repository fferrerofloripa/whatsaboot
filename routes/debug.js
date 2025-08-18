/**
 * Rutas de debugging temporal
 */

const express = require('express');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Debug de usuario actual
 */
router.get('/user', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            displayName: req.user.displayName
        },
        isAdmin: req.user.role === 'admin'
    });
});

/**
 * Test de admin
 */
router.get('/admin-test', isAuthenticated, isAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Admin access working correctly',
        user: req.user.email
    });
});

/**
 * Test de logs en vivo
 */
router.get('/test-logs', isAuthenticated, (req, res) => {
    logger.info('Test log entry from debug route');
    logger.warn('Test warning from debug route');
    logger.error('Test error from debug route');
    
    res.json({
        success: true,
        message: 'Test logs generated successfully'
    });
});

module.exports = router;
