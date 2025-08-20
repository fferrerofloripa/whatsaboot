/**
 * Script para crear conversaciones de muestra en el CRM
 */

const { sequelize, User, WhatsappInstance, Conversation, Message, Tag, ConversationTag } = require('../models');

async function createSampleConversations() {
    try {
        console.log('🔄 Iniciando creación de conversaciones de muestra...');

        // Obtener el primer usuario
        const user = await User.findOne();
        if (!user) {
            console.log('❌ No se encontró ningún usuario. Primero inicia sesión en la aplicación.');
            return;
        }

        // Obtener las instancias de WhatsApp del usuario
        const instances = await WhatsappInstance.findAll({
            where: { userId: user.id, isActive: true }
        });

        if (instances.length === 0) {
            console.log('❌ No se encontraron instancias de WhatsApp. Crea una instancia primero.');
            return;
        }

        const instance = instances[0];
        console.log(`📱 Usando instancia: ${instance.numberName}`);

        // Crear etiquetas de muestra
        const tags = await Promise.all([
            Tag.create({
                whatsappInstanceId: instance.id,
                name: 'Ventas',
                color: '#10B981',
                description: 'Consultas relacionadas con ventas'
            }),
            Tag.create({
                whatsappInstanceId: instance.id,
                name: 'Soporte',
                color: '#3B82F6',
                description: 'Consultas de soporte técnico'
            }),
            Tag.create({
                whatsappInstanceId: instance.id,
                name: 'Urgente',
                color: '#EF4444',
                description: 'Consultas urgentes'
            }),
            Tag.create({
                whatsappInstanceId: instance.id,
                name: 'Información',
                color: '#8B5CF6',
                description: 'Solicitudes de información'
            })
        ]);

        console.log('🏷️  Etiquetas creadas:', tags.map(t => t.name).join(', '));

        // Crear conversaciones de muestra
        const conversations = [
            {
                contactPhone: '+5511999887766',
                contactName: 'María García',
                status: 'inbox',
                lastMessageText: 'Hola, me interesa conocer más sobre sus productos',
                lastMessageDirection: 'incoming',
                lastMessageAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutos atrás
                unreadCount: 2,
                tags: ['Ventas', 'Información']
            },
            {
                contactPhone: '+5511888776655',
                contactName: 'Carlos Rodriguez',
                status: 'pending',
                lastMessageText: 'Perfecto, esperamos su respuesta',
                lastMessageDirection: 'outgoing',
                lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
                unreadCount: 0,
                assignedToId: user.id,
                tags: ['Ventas']
            },
            {
                contactPhone: '+5511777665544',
                contactName: 'Ana Silva',
                status: 'inbox',
                lastMessageText: '¡Tengo un problema urgente con mi pedido!',
                lastMessageDirection: 'incoming',
                lastMessageAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
                unreadCount: 1,
                tags: ['Soporte', 'Urgente']
            },
            {
                contactPhone: '+5511666554433',
                contactName: 'Pedro Santos',
                status: 'closed',
                lastMessageText: 'Muchas gracias por su ayuda!',
                lastMessageDirection: 'incoming',
                lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
                unreadCount: 0,
                assignedToId: user.id,
                tags: ['Soporte']
            },
            {
                contactPhone: '+5511555443322',
                contactName: 'Lucía Fernández',
                status: 'inbox',
                lastMessageText: '¿Tienen descuentos para compras al por mayor?',
                lastMessageDirection: 'incoming',
                lastMessageAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
                unreadCount: 1,
                tags: ['Ventas']
            },
            {
                contactPhone: '+5511444332211',
                contactName: 'Roberto Lima',
                status: 'pending',
                lastMessageText: 'Le envié la cotización por email',
                lastMessageDirection: 'outgoing',
                lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
                unreadCount: 0,
                tags: ['Ventas']
            }
        ];

        console.log('💬 Creando conversaciones...');

        for (let i = 0; i < conversations.length; i++) {
            const convData = conversations[i];
            
            // Crear conversación
            const conversation = await Conversation.create({
                whatsappInstanceId: instance.id,
                contactPhone: convData.contactPhone,
                contactName: convData.contactName,
                status: convData.status,
                assignedToId: convData.assignedToId || null,
                lastMessageAt: convData.lastMessageAt,
                lastMessageText: convData.lastMessageText,
                lastMessageDirection: convData.lastMessageDirection,
                unreadCount: convData.unreadCount,
                isActive: true
            });

            console.log(`  ✅ Conversación creada: ${convData.contactName}`);

            // Asignar etiquetas
            const conversationTags = convData.tags.map(tagName => {
                const tag = tags.find(t => t.name === tagName);
                return tag ? {
                    conversationId: conversation.id,
                    tagId: tag.id,
                    assignedById: user.id
                } : null;
            }).filter(Boolean);

            if (conversationTags.length > 0) {
                await ConversationTag.bulkCreate(conversationTags);
                console.log(`    🏷️  Etiquetas asignadas: ${convData.tags.join(', ')}`);
            }

            // Crear algunos mensajes de muestra
            const messages = [
                {
                    direction: convData.lastMessageDirection === 'incoming' ? 'outgoing' : 'incoming',
                    body: convData.lastMessageDirection === 'incoming' 
                        ? '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?'
                        : 'Hola, buenas tardes',
                    sentAt: new Date(convData.lastMessageAt.getTime() - 5 * 60 * 1000), // 5 min antes
                    sentById: convData.lastMessageDirection === 'incoming' ? user.id : null
                },
                {
                    direction: convData.lastMessageDirection,
                    body: convData.lastMessageText,
                    sentAt: convData.lastMessageAt,
                    sentById: convData.lastMessageDirection === 'outgoing' ? user.id : null
                }
            ];

            for (const msgData of messages) {
                await Message.create({
                    conversationId: conversation.id,
                    direction: msgData.direction,
                    messageType: 'text',
                    body: msgData.body,
                    sentById: msgData.sentById,
                    sentAt: msgData.sentAt,
                    isRead: msgData.direction === 'outgoing' || convData.unreadCount === 0
                });
            }

            console.log(`    💬 Mensajes creados: ${messages.length}`);
        }

        console.log('\n🎉 ¡Conversaciones de muestra creadas exitosamente!');
        console.log(`📊 Resumen:`);
        console.log(`   - ${conversations.filter(c => c.status === 'inbox').length} conversaciones en Entrada`);
        console.log(`   - ${conversations.filter(c => c.status === 'pending').length} conversaciones Esperando`);
        console.log(`   - ${conversations.filter(c => c.status === 'closed').length} conversaciones Finalizadas`);
        console.log(`   - ${tags.length} etiquetas creadas`);
        console.log(`\n🔗 Accede al CRM en: http://localhost:3000/crm/instance/${instance.id}`);

    } catch (error) {
        console.error('❌ Error creando conversaciones de muestra:', error);
    } finally {
        await sequelize.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createSampleConversations();
}

module.exports = createSampleConversations;
