/**
 * Modelo de Usuario
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    googleId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: 'ID único de Google OAuth'
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true
        },
        comment: 'Email del usuario'
    },
    displayName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre para mostrar del usuario'
    },
    role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
        allowNull: false,
        comment: 'Rol del usuario en el sistema'
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL del avatar del usuario'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Estado activo del usuario'
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última fecha de inicio de sesión'
    }
}, {
    tableName: 'users',
    indexes: [
        {
            unique: true,
            fields: ['googleId']
        },
        {
            unique: true,
            fields: ['email']
        },
        {
            fields: ['role']
        }
    ]
});

// Métodos de instancia
User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    // No exponer datos sensibles en JSON
    delete values.googleId;
    return values;
};

User.prototype.isAdmin = function() {
    return this.role === 'admin';
};

User.prototype.updateLastLogin = async function() {
    this.lastLogin = new Date();
    await this.save();
};

// Métodos estáticos
User.findByGoogleId = function(googleId) {
    return this.findOne({ where: { googleId } });
};

User.findByEmail = function(email) {
    return this.findOne({ where: { email } });
};

User.getAdmins = function() {
    return this.findAll({ where: { role: 'admin', isActive: true } });
};

module.exports = User;
