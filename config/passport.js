/**
 * Configuración de Passport.js para autenticación con Google OAuth 2.0
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');
const logger = require('./logger');

// Configuración de la estrategia de Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        logger.info('Procesando autenticación de Google para:', profile.emails[0].value);

        // Buscar usuario existente por Google ID
        let user = await User.findByGoogleId(profile.id);

        if (user) {
            // Usuario existe, actualizar última conexión
            await user.updateLastLogin();
            logger.info('Usuario existente autenticado:', user.email);
            return done(null, user);
        }

        // Si no existe por Google ID, buscar por email
        user = await User.findOne({ where: { email: profile.emails[0].value } });

        if (user) {
            // Usuario existe con el mismo email, actualizar Google ID y última conexión
            await user.update({
                googleId: profile.id,
                displayName: profile.displayName,
                avatar: profile.photos[0] ? profile.photos[0].value : null,
                lastLogin: new Date()
            });
            logger.info('Usuario existente actualizado con Google ID:', user.email);
            return done(null, user);
        }

        // Usuario no existe, verificar si es el primer usuario (será admin)
        const userCount = await User.count();
        const isFirstUser = userCount === 0;

        // Crear nuevo usuario
        user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            displayName: profile.displayName,
            avatar: profile.photos[0] ? profile.photos[0].value : null,
            role: isFirstUser ? 'admin' : 'user',
            lastLogin: new Date()
        });

        logger.info(`Nuevo usuario creado: ${user.email} (${user.role})`);
        return done(null, user);

    } catch (error) {
        logger.error('Error en autenticación de Google:', error);
        return done(error, null);
    }
}));

// Serializar usuario para la sesión
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserializar usuario desde la sesión
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (error) {
        logger.error('Error al deserializar usuario:', error);
        done(error, null);
    }
});

module.exports = passport;
