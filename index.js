/**
 * WhatsaBoot - WhatsApp Bot Management System
 * Punto de entrada principal de la aplicación
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Importar configuraciones
require('./config/passport');
const db = require('./config/database');
const logger = require('./config/logger');

// Importar rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const botRoutes = require('./routes/bot');
const logsRoutes = require('./routes/logs');
const debugRoutes = require('./routes/debug');

// Importar middlewares
const { isAuthenticated } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuración del motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar EJS con layouts
const expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'whatsaboot_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware global para pasar datos a las vistas
app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.isAdmin = req.user && req.user.role === 'admin';
    res.locals.currentPath = req.path;
    next();
});

// Hacer io disponible globalmente
app.set('io', io);

// Configurar Socket.IO en el servicio de WhatsApp
const whatsappService = require('./services/whatsappService');
whatsappService.setSocketIO(io);

// Rutas
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.render('auth/login', { 
            title: 'Iniciar Sesión - WhatsaBoot',
            error: req.query.error,
            layout: false  // No usar layout para la página de login
        });
    }
});

app.use('/auth', authRoutes);
app.use('/dashboard', isAuthenticated, dashboardRoutes);
app.use('/admin', isAuthenticated, adminRoutes);
app.use('/admin/logs', isAuthenticated, logsRoutes);
app.use('/api/bot', isAuthenticated, botRoutes);
app.use('/debug', debugRoutes);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('errors/404', {
        title: 'Página no encontrada - WhatsaBoot'
    });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
    logger.error('Error no manejado:', err);
    res.status(500).render('errors/500', {
        title: 'Error del servidor - WhatsaBoot',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Configuración de Socket.IO
io.on('connection', (socket) => {
    logger.info('Cliente conectado a Socket.IO:', socket.id);
    
    socket.on('disconnect', () => {
        logger.info('Cliente desconectado de Socket.IO:', socket.id);
    });
});

// Inicializar la aplicación
async function startApp() {
    try {
        // Sincronizar la base de datos
        await db.sync();
        logger.info('Base de datos sincronizada correctamente');

        // Crear usuario admin por defecto si no existe
        const { User } = require('./models');
        const adminExists = await User.findOne({ where: { role: 'admin' } });
        
        if (!adminExists) {
            logger.info('No se encontró usuario admin. El primer usuario registrado será administrador.');
        }

        // Inicializar instancias activas de WhatsApp
        await whatsappService.initializeAllActiveInstances();

        // Iniciar el servidor
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`🚀 WhatsaBoot iniciado en http://localhost:${PORT}`);
            logger.info(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        logger.error('Error al iniciar la aplicación:', error);
        process.exit(1);
    }
}

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    logger.info('Cerrando aplicación...');
    server.close(() => {
        logger.info('Aplicación cerrada correctamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('Cerrando aplicación...');
    server.close(() => {
        logger.info('Aplicación cerrada correctamente');
        process.exit(0);
    });
});

// Iniciar la aplicación
if (require.main === module) {
    startApp();
}

module.exports = app;
