/**
 * Script para resetear y reinicializar una instancia específica
 */

const { WhatsappInstance } = require('../models');
const whatsappService = require('../services/whatsappService');

async function resetInstance(instanceId) {
    try {
        console.log(`🔄 Reseteando instancia ${instanceId}...`);

        // Buscar la instancia
        const instance = await WhatsappInstance.findByPk(instanceId);
        if (!instance) {
            console.log('❌ Instancia no encontrada');
            return;
        }

        console.log(`📱 Instancia encontrada: ${instance.numberName} (${instance.status})`);

        // Desconectar cliente existente si existe
        try {
            await whatsappService.disconnectInstance(instanceId);
            console.log('🔌 Cliente desconectado');
        } catch (error) {
            console.log('⚠️ No se pudo desconectar (puede no estar conectado)');
        }

        // Resetear estado en la base de datos
        await instance.update({
            status: 'qr_pending',
            qrCode: null,
            errorMessage: null
        });
        console.log('🗃️ Estado reseteado en BD');

        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Reinicializar
        console.log('🚀 Reinicializando...');
        await whatsappService.initializeInstance(instanceId);
        
        console.log('✅ Instancia reinicializada');
        console.log('⏱️ Espera 10-30 segundos para que aparezca el QR');
        console.log(`🔗 Verifica en: http://localhost:3000/dashboard`);

    } catch (error) {
        console.error('❌ Error reseteando instancia:', error.message);
    }
}

// Usar desde línea de comandos
const instanceId = process.argv[2];
if (!instanceId) {
    console.log('❌ Uso: node reset-instance.js <instance_id>');
    console.log('📋 Ejemplo: node reset-instance.js 2');
    process.exit(1);
}

resetInstance(parseInt(instanceId));
