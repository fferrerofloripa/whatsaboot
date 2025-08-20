/**
 * Script para agregar conversaciones de prueba a instancias existentes
 */

const { User, WhatsappInstance, Conversation, Message, sequelize } = require('../models');

async function addTestConversations() {
    try {
        console.log('🧪 Creando conversaciones de prueba...');
        
        // Sincronizar base de datos
        await sequelize.sync({ alter: true });
        
        // Buscar usuario existente o usar el primer admin
        let user = await User.findOne({ where: { email: 'fferrerofloripa@gmail.com' } });
        if (!user) {
            user = await User.findOne({ where: { role: 'admin' } });
        }
        if (!user) {
            console.log('❌ No se encontró ningún usuario. Inicia sesión en la app primero.');
            return;
        }
        
        console.log(`✅ Usuario encontrado: ${user.displayName} (${user.email})`);
        
        // Buscar instancia activa existente
        let instance = await WhatsappInstance.findOne({ 
            where: { userId: user.id, isActive: true } 
        });
        
        if (!instance) {
            // Crear instancia de prueba
            instance = await WhatsappInstance.create({
                numberName: 'Test CRM Instance',
                status: 'connected',
                userId: user.id,
                isActive: true
            });
            console.log(`✅ Instancia creada: ${instance.numberName} (ID: ${instance.id})`);
        } else {
            console.log(`✅ Instancia encontrada: ${instance.numberName} (ID: ${instance.id})`);
        }
        
        // Limpiar conversaciones existentes de esta instancia
        await Conversation.destroy({
            where: { whatsappInstanceId: instance.id }
        });
        console.log('🧹 Conversaciones anteriores limpiadas');
        
        // Crear conversaciones de prueba
        const testConversations = [
            {
                contactId: '5491123456789@c.us',
                contactName: 'Juan Pérez',
                status: 'inbox',
                assignedToId: user.id,
                messages: [
                    { body: 'Hola, necesito información sobre sus servicios', direction: 'incoming', sentAt: new Date(Date.now() - 2 * 60 * 1000) },
                    { body: 'Hola! Por supuesto, ¿en qué puedo ayudarte?', direction: 'outgoing', sentAt: new Date(Date.now() - 1 * 60 * 1000), sentById: user.id },
                    { body: '¿Cuáles son sus precios?', direction: 'incoming', sentAt: new Date() }
                ]
            },
            {
                contactId: '5491987654321@c.us',
                contactName: 'María González',
                status: 'pending',
                assignedToId: user.id,
                messages: [
                    { body: 'Buenos días, ¿tienen disponibilidad para mañana?', direction: 'incoming', sentAt: new Date(Date.now() - 30 * 60 * 1000) },
                    { body: 'Buenos días! Déjame revisar la agenda...', direction: 'outgoing', sentAt: new Date(Date.now() - 25 * 60 * 1000), sentById: user.id }
                ]
            },
            {
                contactId: '5491555666777@c.us',
                contactName: 'Carlos Rodriguez',
                status: 'closed',
                assignedToId: user.id,
                messages: [
                    { body: 'Gracias por el excelente servicio', direction: 'incoming', sentAt: new Date(Date.now() - 60 * 60 * 1000) },
                    { body: '¡Muchas gracias! Fue un placer ayudarte', direction: 'outgoing', sentAt: new Date(Date.now() - 55 * 60 * 1000), sentById: user.id }
                ]
            },
            {
                contactId: '5491444555666@c.us',
                contactName: 'Ana López',
                status: 'inbox',
                assignedToId: null, // Sin asignar
                messages: [
                    { body: 'Hola! Quisiera hacer una consulta', direction: 'incoming', sentAt: new Date(Date.now() - 5 * 60 * 1000) }
                ]
            }
        ];
        
        let conversationCount = 0;
        let messageCount = 0;
        
        for (const convData of testConversations) {
            // Crear conversación
            const conversation = await Conversation.create({
                whatsappInstanceId: instance.id,
                contactId: convData.contactId,
                contactName: convData.contactName,
                status: convData.status,
                assignedToId: convData.assignedToId,
                lastMessage: convData.messages[convData.messages.length - 1].body,
                lastMessageAt: convData.messages[convData.messages.length - 1].sentAt,
                unreadCount: convData.messages.filter(m => m.direction === 'incoming').length,
                isActive: true
            });
            
            conversationCount++;
            
            // Crear mensajes
            for (const msgData of convData.messages) {
                await Message.create({
                    conversationId: conversation.id,
                    whatsappMessageId: `test_${conversation.id}_${Date.now()}_${Math.random()}`,
                    direction: msgData.direction,
                    messageType: 'text',
                    body: msgData.body,
                    sentById: msgData.sentById || null,
                    sentAt: msgData.sentAt,
                    isRead: msgData.direction === 'outgoing'
                });
                messageCount++;
            }
            
            console.log(`💬 Conversación creada: ${convData.contactName} (${convData.status})`);
        }
        
        console.log(`\n🎉 ¡Datos de prueba creados exitosamente!`);
        console.log(`\n📊 Resumen:`);
        console.log(`👤 Usuario: ${user.displayName} (${user.email})`);
        console.log(`📱 Instancia: ${instance.numberName} (ID: ${instance.id})`);
        console.log(`💬 Conversaciones: ${conversationCount}`);
        console.log(`📝 Mensajes: ${messageCount}`);
        console.log(`\n🔗 Enlaces directos:`);
        console.log(`📋 Dashboard: http://localhost:3000/dashboard`);
        console.log(`💬 CRM: http://localhost:3000/crm`);
        console.log(`🎯 CRM de esta instancia: http://localhost:3000/crm/instance/${instance.id}`);
        
    } catch (error) {
        console.error('❌ Error creando conversaciones de prueba:', error);
    } finally {
        await sequelize.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    addTestConversations();
}

module.exports = addTestConversations;
