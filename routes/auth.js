/**
 * Rutas de autenticación
 */

const express = require('express');
const passport = require('passport');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Iniciar autenticación con Google
 */
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);

/**
 * Callback de Google OAuth
 */
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
    (req, res) => {
        // Autenticación exitosa
        logger.info(`Usuario autenticado: ${req.user.email}`);
        res.redirect('/dashboard');
    }
);

/**
 * Cerrar sesión
 */
router.post('/logout', (req, res) => {
    const userEmail = req.user ? req.user.email : 'Usuario desconocido';
    
    req.logout((err) => {
        if (err) {
            logger.error('Error al cerrar sesión:', err);
            return res.status(500).json({
                success: false,
                message: 'Error al cerrar sesión'
            });
        }
        
        logger.info(`Usuario desconectado: ${userEmail}`);
        res.redirect('/login');
    });
});

/**
 * Obtener información del usuario actual
 */
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                displayName: req.user.displayName,
                role: req.user.role,
                avatar: req.user.avatar
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }
});

module.exports = router;
