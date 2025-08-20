/**
 * Servicio para ejecutar flujos de bots
 */

const { Flow, Node, Edge, FlowExecution, Conversation, Message } = require('../models');
const logger = require('../config/logger');

class FlowExecutor {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }

    /**
     * Verificar si un mensaje debe activar un flujo
     */
    async checkTriggers(message, conversationId, whatsappInstanceId) {
        try {
            const messageText = message.body?.toLowerCase().trim();
            if (!messageText) return;

            // Buscar flows activos con trigger de palabra clave
            const flows = await Flow.findByTrigger(whatsappInstanceId, 'keyword');
            
            for (const flow of flows) {
                if (flow.triggerValue && messageText.includes(flow.triggerValue.toLowerCase())) {
                    await this.executeFlow(flow, conversationId, { triggerMessage: messageText });
                    break; // Solo ejecutar el primer flow que coincida
                }
            }

            // Verificar flows de bienvenida si es el primer mensaje
            const conversation = await Conversation.findByPk(conversationId);
            if (conversation && await this.isFirstMessage(conversationId)) {
                const welcomeFlows = await Flow.findByTrigger(whatsappInstanceId, 'welcome');
                for (const flow of welcomeFlows) {
                    await this.executeFlow(flow, conversationId, { isWelcome: true });
                    break;
                }
            }

        } catch (error) {
            logger.error('Error verificando triggers de flow:', error);
        }
    }

    /**
     * Ejecutar un flujo completo
     */
    async executeFlow(flow, conversationId, context = {}) {
        try {
            logger.info(`Ejecutando flow ${flow.name} para conversación ${conversationId}`);

            // Verificar si ya hay una ejecución activa
            const activeExecution = await FlowExecution.findActiveByConversation(conversationId);
            if (activeExecution) {
                logger.warn(`Ya hay una ejecución activa para la conversación ${conversationId}`);
                return;
            }

            // Crear nueva ejecución
            const execution = await FlowExecution.create({
                flowId: flow.id,
                conversationId,
                status: 'running',
                variables: context
            });

            // Buscar nodo de inicio
            const startNode = await Node.findStartNode(flow.id);
            if (!startNode) {
                await execution.fail('No se encontró nodo de inicio');
                return;
            }

            // Incrementar uso del flow
            await flow.incrementUsage();

            // Ejecutar desde el nodo de inicio
            await this.executeNode(execution, startNode);

        } catch (error) {
            logger.error(`Error ejecutando flow ${flow.name}:`, error);
        }
    }

    /**
     * Ejecutar un nodo específico
     */
    async executeNode(execution, node) {
        try {
            logger.info(`Ejecutando nodo ${node.type}: ${node.name}`);
            
            await execution.moveToNode(node.nodeId);

            switch (node.type) {
                case 'start':
                    await this.executeStartNode(execution, node);
                    break;
                case 'message':
                    await this.executeMessageNode(execution, node);
                    break;
                case 'question':
                    await this.executeQuestionNode(execution, node);
                    break;
                case 'condition':
                    await this.executeConditionNode(execution, node);
                    break;
                case 'delay':
                    await this.executeDelayNode(execution, node);
                    break;
                case 'action':
                    await this.executeActionNode(execution, node);
                    break;
                case 'webhook':
                    await this.executeWebhookNode(execution, node);
                    break;
                case 'human_handoff':
                    await this.executeHumanHandoffNode(execution, node);
                    break;
                case 'end':
                    await this.executeEndNode(execution, node);
                    break;
                default:
                    logger.warn(`Tipo de nodo no reconocido: ${node.type}`);
                    await this.moveToNextNode(execution, node);
            }

        } catch (error) {
            logger.error(`Error ejecutando nodo ${node.nodeId}:`, error);
            await execution.fail(error.message);
        }
    }

    /**
     * Ejecutar nodo de inicio
     */
    async executeStartNode(execution, node) {
        // El nodo de inicio simplemente continúa al siguiente
        await this.moveToNextNode(execution, node);
    }

    /**
     * Ejecutar nodo de mensaje
     */
    async executeMessageNode(execution, node) {
        const config = node.config || {};
        const message = this.replaceVariables(config.message || 'Mensaje no configurado', execution.variables);

        await this.sendMessage(execution.conversationId, message);
        await this.moveToNextNode(execution, node);
    }

    /**
     * Ejecutar nodo de pregunta
     */
    async executeQuestionNode(execution, node) {
        const config = node.config || {};
        const question = this.replaceVariables(config.question || '¿Pregunta?', execution.variables);

        await this.sendMessage(execution.conversationId, question);
        
        // Esperar respuesta del usuario
        await execution.pause();
        
        // La ejecución continuará cuando llegue la respuesta
    }

    /**
     * Continuar ejecución después de recibir respuesta del usuario
     */
    async continueExecution(conversationId, userResponse) {
        try {
            const execution = await FlowExecution.findActiveByConversation(conversationId);
            if (!execution || execution.status !== 'paused') return;

            // Guardar la respuesta como variable
            await execution.setVariable('lastUserResponse', userResponse);
            await execution.resume();

            // Buscar el nodo actual
            const currentNode = await Node.findByNodeId(execution.currentNodeId);
            if (!currentNode) {
                await execution.fail('Nodo actual no encontrado');
                return;
            }

            // Si era una pregunta, procesar la respuesta y continuar
            if (currentNode.type === 'question') {
                const config = currentNode.config || {};
                const variableName = config.saveAs || 'userResponse';
                await execution.setVariable(variableName, userResponse);
                
                await this.moveToNextNode(execution, currentNode);
            }

        } catch (error) {
            logger.error('Error continuando ejecución:', error);
        }
    }

    /**
     * Ejecutar nodo de condición
     */
    async executeConditionNode(execution, node) {
        const config = node.config || {};
        const variable = config.variable || 'lastUserResponse';
        const value = execution.getVariable(variable);

        // Buscar edges con condiciones
        const edges = await Edge.findBySourceNode(node.nodeId);
        
        for (const edge of edges) {
            if (this.evaluateCondition(edge.condition, value, execution.variables)) {
                const targetNode = await Node.findByNodeId(edge.targetNodeId);
                if (targetNode) {
                    await this.executeNode(execution, targetNode);
                    return;
                }
            }
        }

        // Si no hay condición que coincida, buscar edge por defecto
        const defaultEdge = edges.find(edge => !edge.condition || edge.label === 'default');
        if (defaultEdge) {
            const targetNode = await Node.findByNodeId(defaultEdge.targetNodeId);
            if (targetNode) {
                await this.executeNode(execution, targetNode);
                return;
            }
        }

        // Si no hay siguiente nodo, terminar
        await execution.complete();
    }

    /**
     * Ejecutar nodo de delay
     */
    async executeDelayNode(execution, node) {
        const config = node.config || {};
        const delay = parseInt(config.delay) || 1000; // milisegundos

        await new Promise(resolve => setTimeout(resolve, delay));
        await this.moveToNextNode(execution, node);
    }

    /**
     * Ejecutar nodo de acción
     */
    async executeActionNode(execution, node) {
        const config = node.config || {};
        
        switch (config.action) {
            case 'set_variable':
                await execution.setVariable(config.variableName, config.variableValue);
                break;
            case 'add_tag':
                // Implementar agregar tag al contacto
                break;
            case 'change_status':
                // Implementar cambio de status de conversación
                const conversation = await Conversation.findByPk(execution.conversationId);
                if (conversation && config.status) {
                    await conversation.update({ status: config.status });
                }
                break;
        }

        await this.moveToNextNode(execution, node);
    }

    /**
     * Ejecutar nodo de webhook
     */
    async executeWebhookNode(execution, node) {
        const config = node.config || {};
        
        try {
            const response = await fetch(config.url, {
                method: config.method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...config.headers
                },
                body: JSON.stringify({
                    conversationId: execution.conversationId,
                    variables: execution.variables,
                    ...config.payload
                })
            });

            const responseData = await response.json();
            await execution.setVariable('webhookResponse', responseData);

        } catch (error) {
            logger.error('Error ejecutando webhook:', error);
            await execution.setVariable('webhookError', error.message);
        }

        await this.moveToNextNode(execution, node);
    }

    /**
     * Ejecutar nodo de transferencia a humano
     */
    async executeHumanHandoffNode(execution, node) {
        const config = node.config || {};
        
        // Cambiar estado de la conversación a pendiente
        const conversation = await Conversation.findByPk(execution.conversationId);
        if (conversation) {
            await conversation.update({ 
                status: 'pending',
                assignedToId: config.agentId || null
            });
        }

        // Enviar mensaje de transferencia
        const message = config.message || 'Te estoy transfiriendo con un agente humano. En breve te atenderán.';
        await this.sendMessage(execution.conversationId, message);

        // Completar ejecución
        await execution.complete();
    }

    /**
     * Ejecutar nodo de fin
     */
    async executeEndNode(execution, node) {
        const config = node.config || {};
        
        if (config.message) {
            const message = this.replaceVariables(config.message, execution.variables);
            await this.sendMessage(execution.conversationId, message);
        }

        await execution.complete();
    }

    /**
     * Mover al siguiente nodo
     */
    async moveToNextNode(execution, currentNode) {
        const edges = await Edge.findBySourceNode(currentNode.nodeId);
        
        if (edges.length === 0) {
            await execution.complete();
            return;
        }

        // Tomar el primer edge disponible
        const nextEdge = edges[0];
        const nextNode = await Node.findByNodeId(nextEdge.targetNodeId);
        
        if (nextNode) {
            await this.executeNode(execution, nextNode);
        } else {
            await execution.complete();
        }
    }

    /**
     * Evaluar condición
     */
    evaluateCondition(condition, value, variables) {
        if (!condition) return true;

        try {
            const { operator, compareValue, variable } = condition;
            const actualValue = variable ? variables[variable] : value;

            switch (operator) {
                case 'equals':
                    return actualValue == compareValue;
                case 'contains':
                    return String(actualValue).toLowerCase().includes(String(compareValue).toLowerCase());
                case 'starts_with':
                    return String(actualValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
                case 'greater_than':
                    return parseFloat(actualValue) > parseFloat(compareValue);
                case 'less_than':
                    return parseFloat(actualValue) < parseFloat(compareValue);
                default:
                    return true;
            }
        } catch (error) {
            logger.error('Error evaluando condición:', error);
            return false;
        }
    }

    /**
     * Reemplazar variables en texto
     */
    replaceVariables(text, variables) {
        let result = text;
        
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value);
        }
        
        return result;
    }

    /**
     * Enviar mensaje a través del servicio de WhatsApp
     */
    async sendMessage(conversationId, message) {
        try {
            const conversation = await Conversation.findByPk(conversationId);
            if (!conversation) return;

            // Usar el servicio de WhatsApp para enviar el mensaje
            await this.whatsappService.sendMessage(
                conversation.whatsappInstanceId,
                conversation.contactId,
                message
            );

            // Registrar el mensaje en la base de datos
            await Message.create({
                conversationId,
                direction: 'outgoing',
                messageType: 'text',
                body: message,
                sentAt: new Date(),
                isRead: true
            });

        } catch (error) {
            logger.error('Error enviando mensaje de flow:', error);
        }
    }

    /**
     * Verificar si es el primer mensaje de la conversación
     */
    async isFirstMessage(conversationId) {
        const messageCount = await Message.count({
            where: { conversationId }
        });
        return messageCount <= 1;
    }
}

module.exports = FlowExecutor;
