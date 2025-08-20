/**
 * Archivo principal de modelos
 * Configura las relaciones entre modelos
 */

const sequelize = require('../config/database');
const User = require('./User');
const WhatsappInstance = require('./WhatsappInstance');
const AutoResponse = require('./AutoResponse');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Note = require('./Note');
const Tag = require('./Tag');
const ConversationTag = require('./ConversationTag');

// Flow Builder models
const Flow = require('./Flow');
const Node = require('./Node');
const Edge = require('./Edge');
const FlowExecution = require('./FlowExecution');

// Funnel models
const Funnel = require('./Funnel');
const Stage = require('./Stage');

// Relaciones existentes
User.hasMany(WhatsappInstance, {
    foreignKey: 'userId',
    as: 'whatsappInstances'
});

WhatsappInstance.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

WhatsappInstance.hasMany(AutoResponse, {
    foreignKey: 'whatsappInstanceId',
    as: 'autoResponses'
});

AutoResponse.belongsTo(WhatsappInstance, {
    foreignKey: 'whatsappInstanceId',
    as: 'whatsappInstance'
});

// Nuevas relaciones para CRM

// WhatsappInstance - Conversation
WhatsappInstance.hasMany(Conversation, {
    foreignKey: 'whatsappInstanceId',
    as: 'conversations'
});

Conversation.belongsTo(WhatsappInstance, {
    foreignKey: 'whatsappInstanceId',
    as: 'whatsappInstance'
});

// User - Conversation (asignación)
User.hasMany(Conversation, {
    foreignKey: 'assignedToId',
    as: 'assignedConversations'
});

Conversation.belongsTo(User, {
    foreignKey: 'assignedToId',
    as: 'assignedTo'
});

// Conversation - Message
Conversation.hasMany(Message, {
    foreignKey: 'conversationId',
    as: 'messages'
});

Message.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation'
});

// User - Message (para mensajes salientes)
User.hasMany(Message, {
    foreignKey: 'sentById',
    as: 'sentMessages'
});

Message.belongsTo(User, {
    foreignKey: 'sentById',
    as: 'sentBy'
});

// Conversation - Note
Conversation.hasMany(Note, {
    foreignKey: 'conversationId',
    as: 'notes'
});

Note.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation'
});

// User - Note
User.hasMany(Note, {
    foreignKey: 'authorId',
    as: 'authoredNotes'
});

Note.belongsTo(User, {
    foreignKey: 'authorId',
    as: 'author'
});

// WhatsappInstance - Tag
WhatsappInstance.hasMany(Tag, {
    foreignKey: 'whatsappInstanceId',
    as: 'tags'
});

Tag.belongsTo(WhatsappInstance, {
    foreignKey: 'whatsappInstanceId',
    as: 'whatsappInstance'
});

// Conversation - Tag (relación muchos a muchos)
Conversation.belongsToMany(Tag, {
    through: ConversationTag,
    foreignKey: 'conversationId',
    otherKey: 'tagId',
    as: 'tags'
});

Tag.belongsToMany(Conversation, {
    through: ConversationTag,
    foreignKey: 'tagId',
    otherKey: 'conversationId',
    as: 'conversations'
});

// User - ConversationTag (quien asignó la etiqueta)
User.hasMany(ConversationTag, {
    foreignKey: 'assignedById',
    as: 'assignedTags'
});

ConversationTag.belongsTo(User, {
    foreignKey: 'assignedById',
    as: 'assignedBy'
});

// Relaciones para Flow Builder
WhatsappInstance.hasMany(Flow, {
    foreignKey: 'whatsappInstanceId',
    as: 'flows'
});
Flow.belongsTo(WhatsappInstance, {
    foreignKey: 'whatsappInstanceId',
    as: 'whatsappInstance'
});

User.hasMany(Flow, {
    foreignKey: 'createdById',
    as: 'createdFlows'
});
Flow.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'creator'
});

Flow.hasMany(Node, {
    foreignKey: 'flowId',
    as: 'nodes'
});
Node.belongsTo(Flow, {
    foreignKey: 'flowId',
    as: 'flow'
});

Flow.hasMany(Edge, {
    foreignKey: 'flowId',
    as: 'edges'
});
Edge.belongsTo(Flow, {
    foreignKey: 'flowId',
    as: 'flow'
});

Flow.hasMany(FlowExecution, {
    foreignKey: 'flowId',
    as: 'executions'
});
FlowExecution.belongsTo(Flow, {
    foreignKey: 'flowId',
    as: 'flow'
});

Conversation.hasMany(FlowExecution, {
    foreignKey: 'conversationId',
    as: 'flowExecutions'
});
FlowExecution.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation'
});

// Relaciones para Funnel System
WhatsappInstance.hasMany(Funnel, {
    foreignKey: 'whatsappInstanceId',
    as: 'funnels'
});
Funnel.belongsTo(WhatsappInstance, {
    foreignKey: 'whatsappInstanceId',
    as: 'whatsappInstance'
});

User.hasMany(Funnel, {
    foreignKey: 'createdById',
    as: 'createdFunnels'
});
Funnel.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'creator'
});

Funnel.hasMany(Stage, {
    foreignKey: 'funnelId',
    as: 'stages'
});
Stage.belongsTo(Funnel, {
    foreignKey: 'funnelId',
    as: 'funnel'
});

Stage.hasMany(Conversation, {
    foreignKey: 'stageId',
    as: 'conversations'
});
Conversation.belongsTo(Stage, {
    foreignKey: 'stageId',
    as: 'stage'
});

module.exports = {
    sequelize,
    User,
    WhatsappInstance,
    AutoResponse,
    Conversation,
    Message,
    Note,
    Tag,
    ConversationTag,
    Flow,
    Node,
    Edge,
    FlowExecution,
    Funnel,
    Stage
};
