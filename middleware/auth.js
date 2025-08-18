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
    const instanceId = req.params.instanceId || req.body.instanceId;
    
    console.log('🔍 canAccessInstance middleware called:', {
        instanceId,
        userId: req.user?.id,
        userRole: req.user?.role,
        method: req.method,
        url: req.url
    });
    
    if (!instanceId) {
        console.log('❌ No instanceId provided');
        return res.status(400).json({
            success: false,
            message: 'ID de instancia requerido'
        });
    }

    // Cargar la instancia para todos los usuarios (admin y normales)
    const { WhatsappInstance } = require('../models');
    
    WhatsappInstance.findByPk(instanceId)
        .then(instance => {
            console.log('📋 Instance lookup result:', {
                found: !!instance,
                instanceId,
                instanceUserId: instance?.userId,
                currentUserId: req.user?.id
            });
            
            if (!instance) {
                console.log('❌ Instance not found');
                return res.status(404).json({
                    success: false,
                    message: 'Instancia no encontrada'
                });
            }

            // Los administradores pueden acceder a cualquier instancia
            if (req.user.role === 'admin') {
                console.log('👑 Admin access granted');
                req.whatsappInstance = instance;
                return next();
            }

            // Los usuarios normales solo pueden acceder a sus propias instancias
            if (instance.userId !== req.user.id) {
                console.log('❌ Access denied - user does not own instance');
                logger.warn(`Usuario ${req.user.email} intentó acceder a instancia ${instanceId} sin permisos`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta instancia'
                });
            }

            console.log('✅ User access granted');
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
