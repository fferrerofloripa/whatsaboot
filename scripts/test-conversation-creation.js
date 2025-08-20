/**
 * Script para simular la creación de una conversación real
 * (útil para testing antes de tener mensajes reales de WhatsApp)
 */

const { Conversation, Message, WhatsappInstance, User } = require('../models');

async function createTestConversation() {
    try {
        console.log('🧪 Creando conversación de prueba para demostrar integración...');

        // Obtener el primer usuario y instancia
        const user = await User.findOne();
        const instance = await WhatsappInstance.findOne({
            where: { userId: user.id, isActive: true }
        });

        if (!instance) {
            console.log('❌ No se encontró una instancia de WhatsApp activa');
            return;
        }

        console.log(`📱 Usando instancia: ${instance.numberName} (ID: ${instance.id})`);

        // Crear una conversación real como la haría WhatsApp
        const contactId = '5511999887766@c.us'; // Formato real de WhatsApp
        const contactName = 'Cliente Test Real';

        // Verificar si ya existe la conversación
        let conversation = await Conversation.findOne({
            where: {
                whatsappInstanceId: instance.id,
                contactId: contactId
            }
        });

        if (conversation) {
            console.log('ℹ️  La conversación ya existe, actualizando...');
        } else {
            conversation = await Conversation.create({
                whatsappInstanceId: instance.id,
                contactId: contactId,
                contactName: contactName,
                status: 'inbox',
                lastMessage: 'Hola, necesito ayuda con mi pedido',
                lastMessageAt: new Date(),
                unreadCount: 1,
                isActive: true
            });

            console.log(`✅ Conversación creada para ${contactName}`);
        }

        // Crear algunos mensajes de ejemplo
        const messages = [
            {
                body: 'Hola, necesito ayuda con mi pedido',
                fromMe: false,
                timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutos atrás
            },
            {
                body: '¡Hola! Por supuesto, te ayudo con tu pedido. ¿Cuál es tu número de orden?',
                fromMe: true,
                timestamp: new Date(Date.now() - 3 * 60 * 1000) // 3 minutos atrás
            },
            {
                body: 'Es el pedido #12345',
                fromMe: false,
                timestamp: new Date(Date.now() - 1 * 60 * 1000) // 1 minuto atrás
            }
        ];

        for (const msgData of messages) {
            await Message.create({
                conversationId: conversation.id,
                whatsappMessageId: `test_${conversation.id}_${Date.now()}_${Math.random()}`,
                direction: msgData.fromMe ? 'outgoing' : 'incoming',
                messageType: 'text',
                body: msgData.body,
                sentById: msgData.fromMe ? user.id : null,
                sentAt: msgData.timestamp,
                isRead: msgData.fromMe
            });
        }

        console.log(`💬 ${messages.length} mensajes creados`);

        // Actualizar último mensaje de la conversación
        await conversation.update({
            lastMessage: messages[messages.length - 1].body,
            lastMessageAt: messages[messages.length - 1].timestamp,
            unreadCount: messages.filter(m => !m.fromMe).length - messages.filter(m => m.fromMe).length
        });

        console.log('\n🎉 ¡Conversación de prueba creada exitosamente!');
        console.log(`🔗 Ve al CRM: http://localhost:3000/crm/instance/${instance.id}`);
        console.log('\n📝 Esta conversación simula cómo se verían las conversaciones reales.');
        console.log('💡 Cuando conectes WhatsApp y recibas mensajes reales, aparecerán automáticamente.');

    } catch (error) {
        console.error('❌ Error creando conversación de prueba:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createTestConversation();
}

module.exports = createTestConversation;
