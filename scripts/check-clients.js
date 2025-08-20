/**
 * Script para verificar el estado de los clientes WhatsApp
 */

const whatsappService = require('../services/whatsappService');
const { WhatsappInstance } = require('../models');

async function checkClients() {
    try {
        console.log('🔍 Verificando clientes WhatsApp...');

        // Obtener instancias de la BD
        const instances = await WhatsappInstance.findAll({
            where: { isActive: true }
        });

        console.log(`📊 Instancias en BD: ${instances.length}`);
        
        instances.forEach(instance => {
            console.log(`  - ID: ${instance.id}, Nombre: ${instance.numberName}, Estado: ${instance.status}`);
        });

        // Verificar clientes en memoria
        console.log(`📱 Clientes en memoria: ${whatsappService.clients.size}`);
        
        for (const [instanceId, client] of whatsappService.clients.entries()) {
            try {
                const state = await client.getState();
                console.log(`  - Instancia ${instanceId}: ${state}`);
            } catch (error) {
                console.log(`  - Instancia ${instanceId}: ERROR - ${error.message}`);
            }
        }

        // Verificar estados generales
        const status = whatsappService.getAllInstancesStatus();
        console.log('\n📋 Estado general:', JSON.stringify(status, null, 2));

    } catch (error) {
        console.error('❌ Error verificando clientes:', error);
    }
}

checkClients();
