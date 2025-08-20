/**
 * Modelo de Etiquetas para Organización
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tag = sequelize.define('Tag', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    whatsappInstanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'whatsapp_instances',
            key: 'id'
        },
        comment: 'ID de la instancia de WhatsApp'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nombre de la etiqueta'
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '#3B82F6',
        comment: 'Color de la etiqueta en formato hexadecimal'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción opcional de la etiqueta'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Si la etiqueta está activa'
    }
}, {
    tableName: 'tags',
    indexes: [
        {
            fields: ['whatsappInstanceId']
        },
        {
            unique: true,
            fields: ['whatsappInstanceId', 'name']
        }
    ]
});

// Métodos estáticos
Tag.findByInstance = function(whatsappInstanceId) {
    return this.findAll({
        where: {
            whatsappInstanceId,
            isActive: true
        },
        order: [['name', 'ASC']]
    });
};

Tag.createTag = function(whatsappInstanceId, name, color, description = null) {
    return this.create({
        whatsappInstanceId,
        name,
        color,
        description
    });
};

module.exports = Tag;
