/**
 * Flow Editor - Visual Flow Builder
 */

class FlowEditor {
    constructor() {
        this.canvas = null;
        this.nodes = new Map();
        this.edges = new Map();
        this.selectedNode = null;
        this.selectedEdge = null;
        this.isDragging = false;
        this.isConnecting = false;
        this.connectionStart = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.nodeIdCounter = 1;
        this.edgeIdCounter = 1;
        
        this.init();
    }

    init() {
        this.canvas = document.getElementById('flowCanvas');
        if (!this.canvas) return;

        this.setupCanvas();
        this.bindEvents();
        this.loadExistingFlow();
    }

    setupCanvas() {
        // Create SVG for connections
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.pointerEvents = 'none';
        this.svg.style.zIndex = '1';

        // Add arrow marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#6b7280');

        marker.appendChild(polygon);
        defs.appendChild(marker);
        this.svg.appendChild(defs);

        this.canvas.appendChild(this.svg);
    }

    bindEvents() {
        // Node templates dragging
        document.querySelectorAll('.node-template').forEach(template => {
            template.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: template.dataset.type,
                    name: template.dataset.name
                }));
            });
            template.draggable = true;
        });

        // Canvas drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.createNode(data.type, data.name, x, y);
        });

        // Canvas click to deselect
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                this.deselectAll();
            }
        });

        // Save button
        const saveBtn = document.getElementById('saveFlowBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveFlow();
            });
        }

        // Test button
        const testBtn = document.getElementById('testFlowBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.testFlow();
            });
        }

        // Publish button
        const publishBtn = document.getElementById('publishFlowBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                this.publishFlow();
            });
        }

        // Modal events
        this.bindModalEvents();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteNode(this.selectedNode.id);
            }
            if (e.key === 'Escape') {
                this.deselectAll();
            }
        });
    }

    bindModalEvents() {
        // Generic modal handlers
        document.querySelectorAll('.modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.fixed');
                if (modal) modal.classList.add('hidden');
            });
        });

        document.querySelectorAll('.modal-save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.fixed');
                this.saveNodeConfiguration(modal);
            });
        });

        // Close modals on outside click
        document.querySelectorAll('.fixed').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    createNode(type, name, x, y) {
        const nodeId = `node_${this.nodeIdCounter++}`;
        
        const nodeElement = document.createElement('div');
        nodeElement.className = 'node';
        nodeElement.dataset.nodeId = nodeId;
        nodeElement.dataset.type = type;
        
        const color = this.getNodeColor(type);
        const icon = this.getNodeIcon(type);
        
        nodeElement.style.left = x + 'px';
        nodeElement.style.top = y + 'px';
        
        nodeElement.innerHTML = `
            <div class="flex items-center mb-2">
                <div class="w-6 h-6 ${color} rounded-full flex items-center justify-center mr-2">
                    <i class="${icon} text-white text-xs"></i>
                </div>
                <div class="font-medium text-sm">${name}</div>
            </div>
            <div class="text-xs text-gray-500 node-description">
                ${this.getNodeDescription(type)}
            </div>
            
            ${type !== 'end' ? '<div class="node-handle output"></div>' : ''}
            ${type !== 'start' ? '<div class="node-handle input"></div>' : ''}
        `;

        // Add event listeners
        this.addNodeEventListeners(nodeElement);
        
        // Add to canvas
        this.canvas.appendChild(nodeElement);
        
        // Store node data
        this.nodes.set(nodeId, {
            id: nodeId,
            type,
            name,
            position: { x, y },
            config: this.getDefaultConfig(type),
            element: nodeElement
        });

        // Auto-open configuration for non-start/end nodes
        if (type !== 'start' && type !== 'end') {
            setTimeout(() => {
                this.openNodeConfiguration(nodeId);
            }, 100);
        }

        return nodeElement;
    }

    addNodeEventListeners(nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;

        // Node selection
        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(nodeId);
        });

        // Node dragging
        let isDragging = false;
        let startPos = { x: 0, y: 0 };

        nodeElement.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node-handle')) return;
            
            isDragging = true;
            const rect = this.canvas.getBoundingClientRect();
            startPos = {
                x: e.clientX - rect.left - parseFloat(nodeElement.style.left),
                y: e.clientY - rect.top - parseFloat(nodeElement.style.top)
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - startPos.x;
            const y = e.clientY - rect.top - startPos.y;
            
            nodeElement.style.left = Math.max(0, x) + 'px';
            nodeElement.style.top = Math.max(0, y) + 'px';
            
            // Update node data
            const node = this.nodes.get(nodeId);
            if (node) {
                node.position = { x, y };
            }
            
            this.updateConnections();
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        // Handle connections
        const handles = nodeElement.querySelectorAll('.node-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startConnection(nodeId, handle.classList.contains('output'));
            });
        });

        // Double click to configure
        nodeElement.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openNodeConfiguration(nodeId);
        });
    }

    getNodeColor(type) {
        const colors = {
            start: 'bg-green-500',
            message: 'bg-blue-500',
            question: 'bg-purple-500',
            condition: 'bg-yellow-500',
            delay: 'bg-orange-500',
            action: 'bg-indigo-500',
            webhook: 'bg-teal-500',
            human_handoff: 'bg-pink-500',
            end: 'bg-red-500'
        };
        return colors[type] || 'bg-gray-500';
    }

    getNodeIcon(type) {
        const icons = {
            start: 'fas fa-play',
            message: 'fas fa-comment',
            question: 'fas fa-question',
            condition: 'fas fa-code-branch',
            delay: 'fas fa-clock',
            action: 'fas fa-cog',
            webhook: 'fas fa-link',
            human_handoff: 'fas fa-user',
            end: 'fas fa-stop'
        };
        return icons[type] || 'fas fa-circle';
    }

    getNodeDescription(type) {
        const descriptions = {
            start: 'Punto de entrada del flujo',
            message: 'Haz clic para configurar',
            question: 'Haz clic para configurar',
            condition: 'Haz clic para configurar',
            delay: 'Haz clic para configurar',
            action: 'Haz clic para configurar',
            webhook: 'Haz clic para configurar',
            human_handoff: 'Transfiere a agente',
            end: 'Termina el flujo'
        };
        return descriptions[type] || 'Configurar nodo';
    }

    getDefaultConfig(type) {
        const configs = {
            message: { message: 'Escribe tu mensaje aquí...' },
            question: { question: '¿Cuál es tu pregunta?', saveAs: 'userResponse' },
            condition: { variable: 'lastUserResponse', operator: 'equals', compareValue: '' },
            delay: { delay: 5000 },
            action: { action: 'set_variable', variableName: '', variableValue: '' },
            webhook: { url: '', method: 'POST' },
            human_handoff: { message: 'Te transfiero con un agente...' }
        };
        return configs[type] || {};
    }

    selectNode(nodeId) {
        this.deselectAll();
        
        const node = this.nodes.get(nodeId);
        if (node) {
            this.selectedNode = node;
            node.element.classList.add('selected');
            this.showProperties(node);
        }
    }

    deselectAll() {
        this.selectedNode = null;
        this.selectedEdge = null;
        
        document.querySelectorAll('.node.selected').forEach(node => {
            node.classList.remove('selected');
        });
        
        document.querySelectorAll('.connection-line.selected').forEach(line => {
            line.classList.remove('selected');
        });
        
        this.hideProperties();
    }

    showProperties(node) {
        const sidebar = document.getElementById('propertiesSidebar');
        const nameElement = document.getElementById('selectedNodeName');
        
        if (sidebar && nameElement) {
            sidebar.classList.remove('hidden');
            nameElement.textContent = node.name;
            
            // Show basic properties
            const content = document.getElementById('propertiesContent');
            if (content) {
                content.innerHTML = `
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                            <div class="text-sm text-gray-600">${node.type}</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Posición</label>
                            <div class="text-sm text-gray-600">${Math.round(node.position.x)}, ${Math.round(node.position.y)}</div>
                        </div>
                        <div class="pt-4 border-t border-gray-200">
                            <button onclick="window.flowEditor.openNodeConfiguration('${node.id}')" 
                                    class="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                                Configurar
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }

    hideProperties() {
        const sidebar = document.getElementById('propertiesSidebar');
        if (sidebar) {
            sidebar.classList.add('hidden');
        }
    }

    openNodeConfiguration(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        const modalId = `${node.type}NodeModal`;
        const modal = document.getElementById(modalId);
        
        if (modal) {
            this.currentConfigNode = nodeId;
            this.populateConfigModal(node, modal);
            modal.classList.remove('hidden');
        }
    }

    populateConfigModal(node, modal) {
        const config = node.config || {};
        
        switch (node.type) {
            case 'message':
                const messageText = modal.querySelector('#messageText');
                if (messageText) messageText.value = config.message || '';
                break;
                
            case 'question':
                const questionText = modal.querySelector('#questionText');
                const saveResponseAs = modal.querySelector('#saveResponseAs');
                if (questionText) questionText.value = config.question || '';
                if (saveResponseAs) saveResponseAs.value = config.saveAs || 'userResponse';
                break;
                
            case 'condition':
                const conditionVariable = modal.querySelector('#conditionVariable');
                const conditionOperator = modal.querySelector('#conditionOperator');
                const conditionValue = modal.querySelector('#conditionValue');
                if (conditionVariable) conditionVariable.value = config.variable || 'lastUserResponse';
                if (conditionOperator) conditionOperator.value = config.operator || 'equals';
                if (conditionValue) conditionValue.value = config.compareValue || '';
                break;
                
            case 'delay':
                const delayTime = modal.querySelector('#delayTime');
                const delayUnit = modal.querySelector('#delayUnit');
                if (delayTime) delayTime.value = Math.floor((config.delay || 5000) / 1000);
                if (delayUnit) delayUnit.value = '1000';
                break;
                
            case 'webhook':
                const webhookUrl = modal.querySelector('#webhookUrl');
                const webhookMethod = modal.querySelector('#webhookMethod');
                if (webhookUrl) webhookUrl.value = config.url || '';
                if (webhookMethod) webhookMethod.value = config.method || 'POST';
                break;
        }
    }

    saveNodeConfiguration(modal) {
        if (!this.currentConfigNode) return;
        
        const node = this.nodes.get(this.currentConfigNode);
        if (!node) return;
        
        let config = {};
        
        switch (node.type) {
            case 'message':
                config.message = modal.querySelector('#messageText').value;
                break;
                
            case 'question':
                config.question = modal.querySelector('#questionText').value;
                config.saveAs = modal.querySelector('#saveResponseAs').value;
                break;
                
            case 'condition':
                config.variable = modal.querySelector('#conditionVariable').value;
                config.operator = modal.querySelector('#conditionOperator').value;
                config.compareValue = modal.querySelector('#conditionValue').value;
                break;
                
            case 'delay':
                const time = parseInt(modal.querySelector('#delayTime').value);
                const unit = parseInt(modal.querySelector('#delayUnit').value);
                config.delay = time * unit;
                break;
                
            case 'webhook':
                config.url = modal.querySelector('#webhookUrl').value;
                config.method = modal.querySelector('#webhookMethod').value;
                break;
        }
        
        // Update node configuration
        node.config = config;
        
        // Update node description
        this.updateNodeDescription(node);
        
        // Hide modal
        modal.classList.add('hidden');
        this.currentConfigNode = null;
        
        showToast('Configuración guardada', 'success');
    }

    updateNodeDescription(node) {
        const descElement = node.element.querySelector('.node-description');
        if (!descElement) return;
        
        let description = '';
        
        switch (node.type) {
            case 'message':
                description = (node.config.message || '').substring(0, 30) + '...';
                break;
            case 'question':
                description = (node.config.question || '').substring(0, 30) + '...';
                break;
            case 'condition':
                description = `${node.config.variable} ${node.config.operator} ${node.config.compareValue}`;
                break;
            case 'delay':
                const seconds = Math.floor(node.config.delay / 1000);
                description = `Esperar ${seconds}s`;
                break;
            case 'webhook':
                description = `${node.config.method} ${node.config.url}`;
                break;
            default:
                description = this.getNodeDescription(node.type);
        }
        
        descElement.textContent = description;
    }

    startConnection(nodeId, isOutput) {
        this.isConnecting = true;
        this.connectionStart = { nodeId, isOutput };
        
        this.canvas.style.cursor = 'crosshair';
        
        const onMouseMove = (e) => {
            if (!this.isConnecting) return;
            
            // Draw temporary connection line
            this.drawTemporaryConnection(e);
        };
        
        const onMouseUp = (e) => {
            this.isConnecting = false;
            this.canvas.style.cursor = 'default';
            
            // Remove temporary line
            const tempLine = this.svg.querySelector('.temp-connection');
            if (tempLine) tempLine.remove();
            
            // Check if we're over a valid target
            const target = e.target.closest('.node');
            if (target && target.dataset.nodeId !== nodeId) {
                this.createConnection(nodeId, target.dataset.nodeId);
            }
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    drawTemporaryConnection(e) {
        const rect = this.canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        const startNode = this.nodes.get(this.connectionStart.nodeId);
        if (!startNode) return;
        
        const startX = startNode.position.x + 75; // Center of node
        const startY = startNode.position.y + (this.connectionStart.isOutput ? 60 : 0);
        
        // Remove existing temporary line
        const tempLine = this.svg.querySelector('.temp-connection');
        if (tempLine) tempLine.remove();
        
        // Create new temporary line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', '#3b82f6');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.classList.add('temp-connection');
        
        this.svg.appendChild(line);
    }

    createConnection(sourceNodeId, targetNodeId) {
        const edgeId = `edge_${this.edgeIdCounter++}`;
        
        const sourceNode = this.nodes.get(sourceNodeId);
        const targetNode = this.nodes.get(targetNodeId);
        
        if (!sourceNode || !targetNode) return;
        
        // Store edge data
        this.edges.set(edgeId, {
            id: edgeId,
            sourceNodeId,
            targetNodeId,
            condition: null,
            label: null
        });
        
        this.updateConnections();
        showToast('Conexión creada', 'success');
    }

    updateConnections() {
        // Clear existing connections
        const existingLines = this.svg.querySelectorAll('.connection-line');
        existingLines.forEach(line => line.remove());
        
        // Redraw all connections
        this.edges.forEach(edge => {
            this.drawConnection(edge);
        });
    }

    drawConnection(edge) {
        const sourceNode = this.nodes.get(edge.sourceNodeId);
        const targetNode = this.nodes.get(edge.targetNodeId);
        
        if (!sourceNode || !targetNode) return;
        
        const startX = sourceNode.position.x + 75;
        const startY = sourceNode.position.y + 60;
        const endX = targetNode.position.x + 75;
        const endY = targetNode.position.y;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Create curved path
        const midY = startY + (endY - startY) / 2;
        const d = `M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`;
        
        path.setAttribute('d', d);
        path.setAttribute('class', 'connection-line');
        path.setAttribute('data-edge-id', edge.id);
        
        // Add click handler
        path.style.pointerEvents = 'stroke';
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectEdge(edge.id);
        });
        
        this.svg.appendChild(path);
    }

    selectEdge(edgeId) {
        this.deselectAll();
        
        const edge = this.edges.get(edgeId);
        if (edge) {
            this.selectedEdge = edge;
            const lineElement = this.svg.querySelector(`[data-edge-id="${edgeId}"]`);
            if (lineElement) {
                lineElement.classList.add('selected');
            }
        }
    }

    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        // Remove node element
        node.element.remove();
        
        // Remove associated edges
        const edgesToRemove = [];
        this.edges.forEach((edge, edgeId) => {
            if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
                edgesToRemove.push(edgeId);
            }
        });
        
        edgesToRemove.forEach(edgeId => {
            this.edges.delete(edgeId);
        });
        
        // Remove node
        this.nodes.delete(nodeId);
        
        // Update connections
        this.updateConnections();
        
        showToast('Nodo eliminado', 'success');
    }

    async saveFlow() {
        try {
            if (!window.flowEditor.flowId) {
                showToast('Error: No hay flow para guardar', 'error');
                return;
            }
            
            // Convert nodes and edges to API format
            const nodes = Array.from(this.nodes.values()).map(node => ({
                nodeId: node.id,
                type: node.type,
                name: node.name,
                position: node.position,
                config: node.config
            }));
            
            const edges = Array.from(this.edges.values()).map(edge => ({
                edgeId: edge.id,
                sourceNodeId: edge.sourceNodeId,
                targetNodeId: edge.targetNodeId,
                condition: edge.condition,
                label: edge.label
            }));
            
            // Save nodes
            for (const node of nodes) {
                await this.saveNode(node);
            }
            
            // Save edges
            for (const edge of edges) {
                await this.saveEdge(edge);
            }
            
            showToast('Flow guardado exitosamente', 'success');
        } catch (error) {
            console.error('Error saving flow:', error);
            showToast('Error guardando flow', 'error');
        }
    }

    async saveNode(node) {
        const response = await fetch(`/flows/api/${window.flowEditor.flowId}/nodes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(node)
        });
        
        if (!response.ok) {
            throw new Error('Error saving node');
        }
    }

    async saveEdge(edge) {
        const response = await fetch(`/flows/api/${window.flowEditor.flowId}/edges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(edge)
        });
        
        if (!response.ok) {
            throw new Error('Error saving edge');
        }
    }

    loadExistingFlow() {
        if (!window.flowEditor.nodes || !window.flowEditor.edges) return;
        
        // Load nodes
        window.flowEditor.nodes.forEach(nodeData => {
            const element = this.createNode(
                nodeData.type,
                nodeData.name,
                nodeData.position.x,
                nodeData.position.y
            );
            
            const node = this.nodes.get(element.dataset.nodeId);
            if (node) {
                node.config = nodeData.config || {};
                this.updateNodeDescription(node);
            }
        });
        
        // Load edges
        window.flowEditor.edges.forEach(edgeData => {
            const edgeId = `edge_${this.edgeIdCounter++}`;
            this.edges.set(edgeId, {
                id: edgeId,
                sourceNodeId: edgeData.sourceNodeId,
                targetNodeId: edgeData.targetNodeId,
                condition: edgeData.condition,
                label: edgeData.label
            });
        });
        
        this.updateConnections();
    }

    testFlow() {
        showToast('Función de prueba en desarrollo', 'info');
    }

    async publishFlow() {
        try {
            const response = await fetch(`/flows/api/${window.flowEditor.flowId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isActive: true
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showToast('Flow publicado exitosamente', 'success');
            } else {
                showToast('Error publicando flow: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error publishing flow:', error);
            showToast('Error de conexión', 'error');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.flowEditor = new FlowEditor();
});
