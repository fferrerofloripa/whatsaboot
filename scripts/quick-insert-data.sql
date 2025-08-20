-- Script SQL para insertar datos de prueba directamente
-- Ejecutar con: sqlite3 database.sqlite < scripts/quick-insert-data.sql

-- Insertar una instancia de prueba si no existe
INSERT OR IGNORE INTO whatsapp_instances (id, numberName, status, userId, isActive, createdAt, updatedAt)
VALUES (999, 'Test CRM Instance', 'connected', (SELECT id FROM users LIMIT 1), 1, datetime('now'), datetime('now'));

-- Insertar conversaciones de prueba
INSERT OR REPLACE INTO conversations (id, whatsappInstanceId, contactId, contactName, status, assignedToId, lastMessage, lastMessageAt, unreadCount, isActive, createdAt, updatedAt)
VALUES 
(1, 999, '5491123456789@c.us', 'Juan Pérez', 'inbox', (SELECT id FROM users LIMIT 1), 'Hola, necesito información sobre sus servicios', datetime('now', '-1 hour'), 2, 1, datetime('now'), datetime('now')),
(2, 999, '5491987654321@c.us', 'María González', 'pending', (SELECT id FROM users LIMIT 1), 'Buenos días, ¿tienen disponibilidad para mañana?', datetime('now', '-2 hours'), 1, 1, datetime('now'), datetime('now')),
(3, 999, '5491555666777@c.us', 'Carlos Rodriguez', 'closed', (SELECT id FROM users LIMIT 1), 'Gracias por el excelente servicio', datetime('now', '-1 day'), 0, 1, datetime('now'), datetime('now')),
(4, 999, '5491444555666@c.us', 'Ana López', 'inbox', NULL, 'Hola! Quisiera hacer una consulta', datetime('now', '-30 minutes'), 1, 1, datetime('now'), datetime('now'));

-- Insertar mensajes de prueba
INSERT OR REPLACE INTO messages (id, conversationId, whatsappMessageId, direction, messageType, body, sentById, sentAt, isRead, createdAt, updatedAt)
VALUES 
-- Conversación con Juan Pérez
(1, 1, 'test_msg_1', 'incoming', 'text', 'Hola, necesito información sobre sus servicios', NULL, datetime('now', '-1 hour'), 0, datetime('now'), datetime('now')),
(2, 1, 'test_msg_2', 'outgoing', 'text', 'Hola! Por supuesto, ¿en qué puedo ayudarte?', (SELECT id FROM users LIMIT 1), datetime('now', '-50 minutes'), 1, datetime('now'), datetime('now')),
(3, 1, 'test_msg_3', 'incoming', 'text', '¿Cuáles son sus precios?', NULL, datetime('now', '-45 minutes'), 0, datetime('now'), datetime('now')),

-- Conversación con María González
(4, 2, 'test_msg_4', 'incoming', 'text', 'Buenos días, ¿tienen disponibilidad para mañana?', NULL, datetime('now', '-2 hours'), 0, datetime('now'), datetime('now')),
(5, 2, 'test_msg_5', 'outgoing', 'text', 'Buenos días! Déjame revisar la agenda...', (SELECT id FROM users LIMIT 1), datetime('now', '-1 hour 50 minutes'), 1, datetime('now'), datetime('now')),

-- Conversación con Carlos Rodriguez
(6, 3, 'test_msg_6', 'incoming', 'text', 'Gracias por el excelente servicio', NULL, datetime('now', '-1 day'), 1, datetime('now'), datetime('now')),
(7, 3, 'test_msg_7', 'outgoing', 'text', '¡Muchas gracias! Fue un placer ayudarte', (SELECT id FROM users LIMIT 1), datetime('now', '-1 day', '+5 minutes'), 1, datetime('now'), datetime('now')),

-- Conversación con Ana López
(8, 4, 'test_msg_8', 'incoming', 'text', 'Hola! Quisiera hacer una consulta', NULL, datetime('now', '-30 minutes'), 0, datetime('now'), datetime('now'));

-- Mostrar resumen
SELECT 'Conversaciones creadas:' as info;
SELECT id, contactName, status, unreadCount FROM conversations WHERE whatsappInstanceId = 999;

SELECT 'Mensajes creados:' as info;
SELECT COUNT(*) as total_messages FROM messages;

SELECT 'Para ver en el CRM, ve a:' as info;
SELECT 'http://localhost:3000/crm/instance/999' as url;
