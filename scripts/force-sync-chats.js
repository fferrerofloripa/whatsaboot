/**
 * Script para forzar la sincronización de chats de una instancia específica
 */

const { WhatsappInstance } = require('../models');
const whatsappService = require('../services/whatsappService');

async function forceSyncChats(instanceId) {
    try {
        console.log(`🔄 Forzando sincronización de chats para instancia ${instanceId}...`);

        // Buscar la instancia
        const instance = await WhatsappInstance.findByPk(instanceId);
        if (!instance) {
            console.log('❌ Instancia no encontrada');
            return;
        }

        console.log(`📱 Instancia encontrada: ${instance.numberName} (${instance.status})`);

        // Verificar si el cliente existe
        const client = whatsappService.clients.get(instanceId);
        if (!client) {
            console.log('❌ Cliente WhatsApp no encontrado en memoria');
            return;
        }

        console.log('✅ Cliente encontrado, verificando estado...');

        // Verificar estado del cliente
        const state = await client.getState();
        console.log(`📊 Estado del cliente: ${state}`);

        if (state !== 'CONNECTED') {
            console.log('❌ Cliente no está conectado');
            return;
        }

        // Ejecutar sincronización
        console.log('🚀 Iniciando sincronización...');
        await whatsappService.syncExistingChats(client, instance);
        
        console.log('🎉 Sincronización completada');

    } catch (error) {
        console.error('❌ Error en sincronización forzada:', error);
    }
}

// Ejecutar para la instancia 1000
const instanceId = process.argv[2] || 1000;
forceSyncChats(parseInt(instanceId));
