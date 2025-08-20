/**
 * Script para crear un usuario y una instancia de WhatsApp de prueba
 */

const { User, WhatsappInstance, Conversation, Message } = require('../models');

async function createTestUser() {
    try {
        console.log('👤 Creando usuario de prueba...');

        // Crear usuario
        const user = await User.create({
            googleId: 'test_google_id_123',
            email: 'test@example.com',
            displayName: 'Usuario Test',
            role: 'admin'
        });

        console.log('✅ Usuario creado:', user.displayName);

        // Crear instancia de WhatsApp
        const instance = await WhatsappInstance.create({
            numberName: 'Test Bot',
            status: 'connected',
            userId: user.id,
            qrCode: null,
            isActive: true
        });

        console.log('✅ Instancia de WhatsApp creada:', instance.numberName);

        // Crear conversación de prueba
        const conversation = await Conversation.create({
            whatsappInstanceId: instance.id,
            contactId: '5511999887766@c.us',
            contactName: 'Cliente Test Real',
            status: 'inbox',
            lastMessage: 'Hola, necesito ayuda con mi pedido',
            lastMessageAt: new Date(),
            unreadCount: 1,
            isActive: true
        });

        console.log('✅ Conversación creada:', conversation.contactName);

        // Crear mensajes de prueba
        const messages = [
            {
                body: 'Hola, necesito ayuda con mi pedido',
                direction: 'incoming',
                sentAt: new Date(Date.now() - 5 * 60 * 1000)
            },
            {
                body: '¡Hola! Por supuesto, te ayudo con tu pedido. ¿Cuál es tu número de orden?',
                direction: 'outgoing',
                sentAt: new Date(Date.now() - 3 * 60 * 1000)
            },
            {
                body: 'Es el pedido #12345',
                direction: 'incoming',
                sentAt: new Date(Date.now() - 1 * 60 * 1000)
            }
        ];

        for (const msgData of messages) {
            await Message.create({
                conversationId: conversation.id,
                whatsappMessageId: `test_${conversation.id}_${Date.now()}_${Math.random()}`,
                direction: msgData.direction,
                messageType: 'text',
                body: msgData.body,
                sentById: msgData.direction === 'outgoing' ? user.id : null,
                sentAt: msgData.sentAt,
                isRead: msgData.direction === 'outgoing'
            });
        }

        console.log(`💬 ${messages.length} mensajes creados`);

        console.log('\n🎉 ¡Datos de prueba creados exitosamente!');
        console.log('\n📋 Resumen:');
        console.log(`👤 Usuario: ${user.displayName} (${user.email})`);
        console.log(`📱 Instancia: ${instance.numberName} (ID: ${instance.id})`);
        console.log(`💬 Conversación: ${conversation.contactName}`);
        console.log(`🔗 CRM: http://localhost:3000/crm/instance/${instance.id}`);
        console.log('\n🔧 Para iniciar sesión en la app:');
        console.log('   1. Ve a http://localhost:3000');
        console.log('   2. Usa Google OAuth (cualquier cuenta válida se convertirá en admin)');
        console.log('   3. Accede al CRM para ver la conversación de prueba');

    } catch (error) {
        console.error('❌ Error creando datos de prueba:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createTestUser();
}

module.exports = createTestUser;
