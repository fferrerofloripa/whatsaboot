const { User, WhatsappInstance, Conversation, Message } = require('../models');

async function createTestData() {
    try {
        console.log('👤 Buscando o creando usuario...');
        let user = await User.findOne({ where: { email: 'fferrerofloripa@gmail.com' } });
        if (!user) {
            console.log('👤 Creando usuario de prueba...');
            user = await User.create({
                googleId: '123456789',
                email: 'fferrerofloripa@gmail.com',
                displayName: 'Franco Ferrero',
                role: 'admin',
                isActive: true
            });
            console.log('✅ Usuario creado');
        }
        
        console.log('📱 Creando instancia de prueba...');
        const instance = await WhatsappInstance.create({
            userId: user.id,
            numberName: 'Test CRM Instance',
            status: 'connected',
            isActive: true
        });
        
        console.log('💬 Creando conversación de prueba...');
        const conversation = await Conversation.create({
            whatsappInstanceId: instance.id,
            contactId: '554888278579@c.us',
            contactName: 'Franco Test',
            lastMessage: 'Hola! Este es un mensaje de prueba',
            status: 'inbox',
            lastMessageAt: new Date(),
            unreadCount: 1
        });
        
        console.log('📨 Creando mensajes de prueba...');
        await Message.create({
            conversationId: conversation.id,
            direction: 'incoming',
            content: 'Hola! Este es un mensaje de prueba',
            messageType: 'text',
            sentAt: new Date()
        });
        
        await Message.create({
            conversationId: conversation.id,
            direction: 'outgoing',
            content: 'Hola! ¿En qué puedo ayudarte?',
            messageType: 'text',
            sentAt: new Date()
        });
        
        console.log('✅ Todo creado correctamente!');
        console.log(`   - Instancia: ${instance.numberName} (ID: ${instance.id})`);
        console.log(`   - Conversación: ${conversation.contactName}`);
        console.log('   - 2 mensajes de prueba');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createTestData();
