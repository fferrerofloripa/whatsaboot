/**
 * Script para migrar de conversaciones mock a conversaciones reales
 */

const { sequelize } = require('../models');

async function migrateToRealConversations() {
    try {
        console.log('🔄 Iniciando migración a conversaciones reales...');

        // 1. Eliminar datos de muestra
        console.log('🗑️  Eliminando datos de muestra...');
        
        await sequelize.query('DELETE FROM conversation_tags');
        await sequelize.query('DELETE FROM messages');
        await sequelize.query('DELETE FROM notes');
        await sequelize.query('DELETE FROM conversations');
        await sequelize.query('DELETE FROM tags');
        
        console.log('✅ Datos de muestra eliminados');

        // 2. Actualizar estructura de la tabla conversations
        console.log('🔧 Actualizando estructura de la tabla conversations...');
        
        try {
            // Verificar si la columna contactPhone existe
            const [results] = await sequelize.query(`
                SELECT COUNT(*) as count 
                FROM pragma_table_info('conversations') 
                WHERE name = 'contactPhone'
            `);
            
            if (results[0].count > 0) {
                // Eliminar columna contactPhone y agregar contactId
                await sequelize.query('ALTER TABLE conversations RENAME TO conversations_old');
                
                // Crear nueva tabla con la estructura correcta
                await sequelize.query(`
                    CREATE TABLE conversations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        whatsappInstanceId INTEGER NOT NULL,
                        contactId VARCHAR(255) NOT NULL,
                        contactName VARCHAR(255),
                        contactAvatar TEXT,
                        status VARCHAR(255) DEFAULT 'inbox' NOT NULL,
                        assignedToId INTEGER,
                        lastMessageAt DATETIME,
                        lastMessage TEXT,
                        unreadCount INTEGER DEFAULT 0 NOT NULL,
                        isActive BOOLEAN DEFAULT 1 NOT NULL,
                        metadata TEXT,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        FOREIGN KEY (whatsappInstanceId) REFERENCES whatsapp_instances(id),
                        FOREIGN KEY (assignedToId) REFERENCES users(id)
                    )
                `);
                
                // Crear índices
                await sequelize.query('CREATE INDEX conversations_whatsapp_instance_id ON conversations(whatsappInstanceId)');
                await sequelize.query('CREATE INDEX conversations_contact_id ON conversations(contactId)');
                await sequelize.query('CREATE UNIQUE INDEX conversations_unique_contact ON conversations(whatsappInstanceId, contactId)');
                await sequelize.query('CREATE INDEX conversations_status ON conversations(status)');
                await sequelize.query('CREATE INDEX conversations_assigned_to_id ON conversations(assignedToId)');
                
                // Eliminar tabla antigua
                await sequelize.query('DROP TABLE conversations_old');
                
                console.log('✅ Estructura de tabla actualizada');
            }
        } catch (error) {
            console.log('⚠️  La tabla ya tiene la estructura correcta o error menor:', error.message);
        }

        // 3. Actualizar estructura de la tabla messages
        console.log('🔧 Verificando estructura de la tabla messages...');
        
        try {
            // Verificar si la tabla messages tiene la estructura correcta
            const [messageColumns] = await sequelize.query(`
                SELECT name FROM pragma_table_info('messages')
            `);
            
            const columnNames = messageColumns.map(col => col.name);
            const requiredColumns = ['conversationId', 'whatsappMessageId', 'fromMe', 'body', 'type', 'sentById', 'timestamp'];
            
            const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
            
            if (missingColumns.length > 0) {
                console.log(`⚠️  Faltan columnas en messages: ${missingColumns.join(', ')}`);
                
                // Recrear tabla messages si es necesario
                await sequelize.query('DROP TABLE IF EXISTS messages');
                await sequelize.query(`
                    CREATE TABLE messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        conversationId INTEGER NOT NULL,
                        whatsappMessageId VARCHAR(255) UNIQUE,
                        fromMe BOOLEAN NOT NULL,
                        body TEXT NOT NULL,
                        type VARCHAR(255) DEFAULT 'chat' NOT NULL,
                        mediaUrl VARCHAR(255),
                        sentById INTEGER,
                        timestamp DATETIME NOT NULL,
                        isRead BOOLEAN DEFAULT 0,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        FOREIGN KEY (conversationId) REFERENCES conversations(id),
                        FOREIGN KEY (sentById) REFERENCES users(id)
                    )
                `);
                
                // Crear índices para messages
                await sequelize.query('CREATE INDEX messages_conversation_id ON messages(conversationId)');
                await sequelize.query('CREATE INDEX messages_whatsapp_message_id ON messages(whatsappMessageId)');
                await sequelize.query('CREATE INDEX messages_from_me ON messages(fromMe)');
                await sequelize.query('CREATE INDEX messages_sent_by_id ON messages(sentById)');
                
                console.log('✅ Tabla messages recreada');
            }
        } catch (error) {
            console.log('⚠️  Error menor en messages:', error.message);
        }

        // 4. Sincronizar modelos
        console.log('🔄 Sincronizando modelos...');
        await sequelize.sync({ alter: true });
        console.log('✅ Modelos sincronizados');

        console.log('\n🎉 ¡Migración completada exitosamente!');
        console.log('📝 Ahora las conversaciones se crearán automáticamente cuando lleguen mensajes de WhatsApp reales.');
        console.log('\n📱 Para probar:');
        console.log('   1. Conecta una instancia de WhatsApp');
        console.log('   2. Envía un mensaje a ese número desde otro teléfono');
        console.log('   3. Ve al CRM para ver la conversación real');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    migrateToRealConversations().catch(console.error);
}

module.exports = migrateToRealConversations;
