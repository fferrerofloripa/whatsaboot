/**
 * Script para crear una instancia y verificar la generación de QR
 */

const axios = require('axios');

async function createAndTestQR() {
    try {
        console.log('🔄 Creando nueva instancia y verificando QR...');

        // Crear una nueva instancia
        const createResponse = await axios.post('http://localhost:3000/api/bot/instances', {
            numberName: 'Test QR Bot ' + Date.now()
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true,
            timeout: 30000
        }).catch(error => {
            if (error.response?.status === 302) {
                console.log('❌ Se requiere autenticación. Ve a http://localhost:3000 y autentica primero.');
                return null;
            }
            throw error;
        });

        if (!createResponse) {
            console.log('\n📋 Pasos para probar manualmente:');
            console.log('1. Ve a http://localhost:3000');
            console.log('2. Inicia sesión con Google');
            console.log('3. Ve al Dashboard');
            console.log('4. Haz clic en "Nueva Instancia"');
            console.log('5. Nombra la instancia como "TestQR"');
            console.log('6. Haz clic en "Crear Instancia"');
            console.log('7. Espera 10-30 segundos para que aparezca el QR');
            return;
        }

        const instanceId = createResponse.data.instance.id;
        console.log(`✅ Instancia creada con ID: ${instanceId}`);

        // Esperar un poco para que se inicialice
        console.log('⏱️ Esperando 15 segundos para la inicialización...');
        await new Promise(resolve => setTimeout(resolve, 15000));

        // Verificar el estado
        const statusResponse = await axios.get(`http://localhost:3000/api/bot/instances/${instanceId}/status`, {
            withCredentials: true,
            timeout: 10000
        });

        console.log(`📊 Estado de la instancia: ${statusResponse.data.status}`);
        
        if (statusResponse.data.qrCode) {
            console.log('🎉 ¡QR Code generado exitosamente!');
            console.log(`🔗 Ve a http://localhost:3000/dashboard para escanearlo`);
        } else {
            console.log('⚠️ QR Code aún no generado, puede necesitar más tiempo...');
            console.log('💡 Espera 30-60 segundos más y recarga la página del dashboard');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('📄 Respuesta del servidor:', error.response.data);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createAndTestQR();
}

module.exports = createAndTestQR;
