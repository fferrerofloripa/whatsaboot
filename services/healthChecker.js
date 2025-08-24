/**
 * Health Checker - Monitorea y recupera instancias colgadas
 */

const { WhatsappInstance } = require('../models');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

class HealthChecker {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
        this.checkInterval = null;
    }

    /**
     * Iniciar monitoreo de salud
     */
    start() {
        logger.info('🏥 Iniciando Health Checker...');
        
        // Verificar cada 3 minutos
        this.checkInterval = setInterval(() => {
            this.checkInstancesHealth();
        }, 3 * 60 * 1000);

        // Primera verificación después de 2 minutos
        setTimeout(() => {
            this.checkInstancesHealth();
        }, 2 * 60 * 1000);
    }

    /**
     * Detener monitoreo
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger.info('🏥 Health Checker detenido');
        }
    }

    /**
     * Verificar salud de todas las instancias
     */
    async checkInstancesHealth() {
        try {
            logger.info('🔍 Verificando salud de instancias...');

            const instances = await WhatsappInstance.findAll({
                where: { status: 'connecting' }
            });

            for (const instance of instances) {
                await this.checkInstanceHealth(instance);
            }

        } catch (error) {
            logger.error('Error en health check:', error);
        }
    }

    /**
     * Verificar salud de una instancia específica
     */
    async checkInstanceHealth(instance) {
        try {
            const now = new Date();
            const updatedAt = new Date(instance.updatedAt);
            const minutesStuck = Math.floor((now - updatedAt) / (1000 * 60));

            logger.info(`🔍 Instancia ${instance.id}: ${minutesStuck} minutos en 'connecting'`);

            // Si lleva más de 5 minutos en connecting, está colgada
            if (minutesStuck >= 5) {
                logger.warn(`⚠️ Instancia ${instance.id} colgada por ${minutesStuck} minutos, recuperando...`);
                await this.recoverInstance(instance);
            }

        } catch (error) {
            logger.error(`Error verificando instancia ${instance.id}:`, error);
        }
    }

    /**
     * Recuperar instancia colgada
     */
    async recoverInstance(instance) {
        try {
            logger.info(`🔧 Recuperando instancia ${instance.id}...`);

            // 1. Limpiar cliente si existe
            if (this.whatsappService.clients.has(instance.id)) {
                const client = this.whatsappService.clients.get(instance.id);
                try {
                    await client.destroy();
                } catch (e) {
                    // Ignorar errores de destroy
                }
                this.whatsappService.clients.delete(instance.id);
                logger.info(`🧹 Cliente ${instance.id} limpiado`);
            }

            // 2. Verificar si la sesión existe y es válida
            const sessionPath = path.join(__dirname, '../.wwebjs_auth', `session_${instance.id}`);
            const hasSession = fs.existsSync(sessionPath);

            if (hasSession) {
                // 3. Intentar reconectar con sesión existente
                logger.info(`🔄 Intentando reconectar instancia ${instance.id} con sesión guardada...`);
                await instance.updateStatus('connecting', 'Recuperación automática con sesión');
                
                setTimeout(() => {
                    this.whatsappService.initializeInstance(instance.id).catch(error => {
                        logger.error(`❌ Error en recuperación de instancia ${instance.id}:`, error);
                        this.fallbackRecovery(instance);
                    });
                }, 2000);

            } else {
                // 4. Sin sesión, marcar como desconectada
                logger.warn(`📱 Instancia ${instance.id} sin sesión, requiere QR`);
                await instance.updateStatus('disconnected', 'Sin sesión - requiere QR');
            }

        } catch (error) {
            logger.error(`Error recuperando instancia ${instance.id}:`, error);
            await this.fallbackRecovery(instance);
        }
    }

    /**
     * Recuperación de emergencia
     */
    async fallbackRecovery(instance) {
        try {
            logger.warn(`🚨 Recuperación de emergencia para instancia ${instance.id}`);
            
            // Limpiar sesión corrupta
            const sessionPath = path.join(__dirname, '../.wwebjs_auth', `session_${instance.id}`);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                logger.info(`🧹 Sesión corrupta eliminada: ${sessionPath}`);
            }

            // Marcar como desconectada
            await instance.updateStatus('disconnected', 'Recuperación de emergencia - requiere QR');
            logger.info(`✅ Instancia ${instance.id} marcada para reinicio manual`);

        } catch (error) {
            logger.error(`Error en recuperación de emergencia:`, error);
        }
    }

    /**
     * Verificar una instancia específica manualmente
     */
    async checkInstance(instanceId) {
        try {
            const instance = await WhatsappInstance.findByPk(instanceId);
            if (instance) {
                await this.checkInstanceHealth(instance);
            } else {
                logger.error(`Instancia ${instanceId} no encontrada`);
            }
        } catch (error) {
            logger.error(`Error verificando instancia ${instanceId}:`, error);
        }
    }
}

module.exports = HealthChecker;
