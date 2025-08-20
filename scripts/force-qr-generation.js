/**
 * Script para forzar la generación de QR en una instancia específica
 */

const { WhatsappInstance } = require('../models');
const whatsappService = require('../services/whatsappService');

async function forceQRGeneration() {
    try {
        console.log('🔄 Forzando generación de QR...');

        // Buscar todas las instancias activas
        const instances = await WhatsappInstance.findAll({
            where: { isActive: true }
        });

        if (instances.length === 0) {
            console.log('❌ No se encontraron instancias activas');
            return;
        }

        console.log(`📱 Encontradas ${instances.length} instancias activas`);

        for (const instance of instances) {
            console.log(`\n🔧 Procesando instancia ${instance.id}: ${instance.numberName}`);
            console.log(`   Estado actual: ${instance.status}`);

            // Si no está conectada, forzar reinicialización
            if (instance.status !== 'connected') {
                console.log('   📊 Actualizando estado a qr_pending...');
                await instance.updateStatus('qr_pending');

                console.log('   🔄 Reinicializando cliente WhatsApp...');
                try {
                    await whatsappService.initializeInstance(instance.id);
                    console.log('   ✅ Cliente inicializado correctamente');
                } catch (error) {
                    console.log(`   ❌ Error inicializando cliente: ${error.message}`);
                }
            } else {
                console.log('   ✅ La instancia ya está conectada');
            }
        }

        console.log('\n🎉 Proceso completado');
        console.log('\n📝 Verifica en el dashboard si aparece el QR:');
        console.log('   🔗 http://localhost:3000/dashboard');

    } catch (error) {
        console.error('❌ Error en el proceso:', error);
    } finally {
        // No cerrar la conexión porque puede interferir con el servidor
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    forceQRGeneration();
}

module.exports = forceQRGeneration;
