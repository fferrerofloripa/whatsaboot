/**
 * Rutas para gestión de logs y debugging
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { isAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Panel principal de logs
 */
router.get('/', isAdmin, async (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../logs');
        const logFiles = [];
        
        // Verificar si el directorio de logs existe
        try {
            const files = await fs.readdir(logsDir);
            for (const file of files) {
                if (file.endsWith('.log')) {
                    const stats = await fs.stat(path.join(logsDir, file));
                    logFiles.push({
                        name: file,
                        size: (stats.size / 1024).toFixed(2) + ' KB',
                        modified: stats.mtime.toLocaleString('es-ES')
                    });
                }
            }
        } catch (error) {
            logger.warn('Directorio de logs no encontrado o vacío');
        }

        res.render('admin/logs', {
            title: 'Panel de Logs - WhatsaBoot',
            logFiles: logFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified))
        });

    } catch (error) {
        logger.error('Error al cargar panel de logs:', error);
        res.status(500).render('errors/500', {
            title: 'Error - WhatsaBoot',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

/**
 * Ver contenido de un archivo de log específico
 */
router.get('/file/:filename', isAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const lines = parseInt(req.query.lines) || 100;
        const logPath = path.join(__dirname, '../logs', filename);

        // Verificar que el archivo existe y es un .log
        if (!filename.endsWith('.log')) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de archivo no válido'
            });
        }

        try {
            const content = await fs.readFile(logPath, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            const recentLines = logLines.slice(-lines);

            res.json({
                success: true,
                filename,
                totalLines: logLines.length,
                displayedLines: recentLines.length,
                content: recentLines.join('\n')
            });

        } catch (error) {
            res.status(404).json({
                success: false,
                message: 'Archivo de log no encontrado'
            });
        }

    } catch (error) {
        logger.error('Error al leer archivo de log:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * API para obtener logs en tiempo real
 */
router.get('/live', isAdmin, async (req, res) => {
    try {
        const level = req.query.level || 'info';
        const limit = parseInt(req.query.limit) || 50;
        
        // Leer el archivo de log más reciente
        const logsDir = path.join(__dirname, '../logs');
        const logPath = path.join(logsDir, 'combined.log');

        try {
            const content = await fs.readFile(logPath, 'utf8');
            const lines = content.split('\n')
                .filter(line => line.trim())
                .slice(-limit)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return { message: line, level: 'unknown', timestamp: new Date().toISOString() };
                    }
                })
                .filter(log => level === 'all' || log.level === level);

            res.json({
                success: true,
                logs: lines.reverse()
            });

        } catch (error) {
            res.json({
                success: true,
                logs: []
            });
        }

    } catch (error) {
        logger.error('Error al obtener logs en tiempo real:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * API para obtener estadísticas del sistema
 */
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const { WhatsappInstance, User, AutoResponse } = require('../models');
        const whatsappService = require('../services/whatsappService');

        const stats = {
            system: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            },
            database: {
                totalUsers: await User.count(),
                adminUsers: await User.count({ where: { role: 'admin' } }),
                totalInstances: await WhatsappInstance.count(),
                connectedInstances: await WhatsappInstance.count({ where: { status: 'connected' } }),
                totalAutoResponses: await AutoResponse.count(),
                activeAutoResponses: await AutoResponse.count({ where: { isActive: true } })
            },
            whatsapp: {
                activeClients: whatsappService.getActiveClientsCount(),
                qrPendingInstances: await WhatsappInstance.count({ where: { status: 'qr_pending' } })
            }
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * API para limpiar logs antiguos
 */
router.delete('/clear', isAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const logsDir = path.join(__dirname, '../logs');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        let deletedFiles = 0;

        try {
            const files = await fs.readdir(logsDir);
            
            for (const file of files) {
                if (file.endsWith('.log')) {
                    const filePath = path.join(logsDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        await fs.unlink(filePath);
                        deletedFiles++;
                        logger.info(`Log file deleted: ${file}`);
                    }
                }
            }
        } catch (error) {
            logger.warn('Error cleaning up log files:', error);
        }

        res.json({
            success: true,
            message: `${deletedFiles} archivos de log eliminados`,
            deletedFiles
        });

    } catch (error) {
        logger.error('Error al limpiar logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
