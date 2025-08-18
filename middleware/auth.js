/**
 * Middlewares de autenticación y autorización
 */

const logger = require('../config/logger');

/**
 * Middleware para verificar si el usuario está autenticado
 */
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    // Si es una petición AJAX, devolver error JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }
    
    // Redirigir a login para peticiones normales
    res.redirect('/login?error=auth_required');
}

/**
 * Middleware para verificar si el usuario es administrador
 */
function isAdmin(req, res, next) {
    if (!req.user) {
        logger.warn('Intento de acceso admin sin usuario autenticado');
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }

    if (req.user.role !== 'admin') {
        logger.warn(`Usuario ${req.user.email} intentó acceder a área de admin sin permisos`);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requieren permisos de administrador.'
            });
        }
        
        return res.status(403).render('errors/403', {
            title: 'Acceso Denegado - WhatsaBoot',
            message: 'No tienes permisos para acceder a esta sección.'
        });
    }

    next();
}

/**
 * Middleware para verificar que el usuario puede acceder a una instancia específica
 */
function canAccessInstance(req, res, next) {
    // Los administradores pueden acceder a cualquier instancia
    if (req.user.role === 'admin') {
        return next();
    }

    // Los usuarios normales solo pueden acceder a sus propias instancias
    const instanceId = req.params.instanceId || req.body.instanceId;
    
    if (!instanceId) {
        return res.status(400).json({
            success: false,
            message: 'ID de instancia requerido'
        });
    }

    // Verificar que la instancia pertenece al usuario
    const { WhatsappInstance } = require('../models');
    
    WhatsappInstance.findByPk(instanceId)
        .then(instance => {
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    message: 'Instancia no encontrada'
                });
            }

            if (instance.userId !== req.user.id) {
                logger.warn(`Usuario ${req.user.email} intentó acceder a instancia ${instanceId} sin permisos`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta instancia'
                });
            }

            req.whatsappInstance = instance;
            next();
        })
        .catch(error => {
            logger.error('Error al verificar permisos de instancia:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        });
}

/**
 * Middleware para logging de accesos
 */
function logAccess(req, res, next) {
    const userInfo = req.user ? `${req.user.email} (${req.user.role})` : 'Usuario no autenticado';
    logger.info(`Acceso: ${req.method} ${req.originalUrl} - ${userInfo}`);
    next();
}

/**
 * Middleware para establecer variables locales en las vistas
 */
function setViewLocals(req, res, next) {
    res.locals.user = req.user;
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.isAdmin = req.user && req.user.role === 'admin';
    res.locals.currentPath = req.path;
    next();
}

module.exports = {
    isAuthenticated,
    isAdmin,
    canAccessInstance,
    logAccess,
    setViewLocals
};
