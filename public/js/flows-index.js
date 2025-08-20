/**
 * JavaScript para Flow Builder Index
 */

class FlowsManager {
    constructor() {
        this.flows = [];
        this.selectedInstanceId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFlows();
    }

    bindEvents() {
        // Instance selector
        const instanceSelector = document.getElementById('instanceSelector');
        if (instanceSelector) {
            instanceSelector.addEventListener('change', (e) => {
                this.selectedInstanceId = e.target.value || null;
                this.loadFlows();
            });
        }

        // Create flow button
        const createFlowBtn = document.getElementById('createFlowBtn');
        if (createFlowBtn) {
            createFlowBtn.addEventListener('click', () => {
                this.showCreateFlowModal();
            });
        }

        // Create flow form
        const createFlowForm = document.getElementById('createFlowForm');
        if (createFlowForm) {
            createFlowForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createFlow();
            });
        }

        // Cancel create flow
        const cancelCreateFlow = document.getElementById('cancelCreateFlow');
        if (cancelCreateFlow) {
            cancelCreateFlow.addEventListener('click', () => {
                this.hideCreateFlowModal();
            });
        }

        // Trigger type change
        const flowTrigger = document.getElementById('flowTrigger');
        if (flowTrigger) {
            flowTrigger.addEventListener('change', (e) => {
                this.updateTriggerValueField(e.target.value);
            });
        }

        // Close modal on outside click
        const createFlowModal = document.getElementById('createFlowModal');
        if (createFlowModal) {
            createFlowModal.addEventListener('click', (e) => {
                if (e.target === createFlowModal) {
                    this.hideCreateFlowModal();
                }
            });
        }
    }

    async loadFlows() {
        try {
            this.showLoading();
            
            const url = this.selectedInstanceId 
                ? `/flows/api?instanceId=${this.selectedInstanceId}`
                : '/flows/api';
            
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok && data.success) {
                this.flows = data.data;
                this.renderFlows();
                this.hideLoading();
                
                if (this.flows.length === 0) {
                    this.showEmptyState();
                }
            } else {
                this.hideLoading();
                showToast('Error cargando flows: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error loading flows:', error);
            this.hideLoading();
            showToast('Error de conexión', 'error');
        }
    }

    renderFlows() {
        const container = document.getElementById('flowsGrid');
        if (!container) return;

        container.innerHTML = '';

        this.flows.forEach(flow => {
            const flowCard = this.createFlowCard(flow);
            container.appendChild(flowCard);
        });
    }

    createFlowCard(flow) {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 cursor-pointer group';
        
        const statusColor = flow.isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
        const statusText = flow.isActive ? 'Activo' : 'Inactivo';
        
        const triggerText = this.getTriggerText(flow.trigger, flow.triggerValue);

        div.innerHTML = `
            <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">${flow.name}</h3>
                        <p class="text-sm text-gray-600 mt-1">${flow.description || 'Sin descripción'}</p>
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                            ${statusText}
                        </span>
                        <div class="relative">
                            <button class="flow-menu-btn w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" data-flow-id="${flow.id}">
                                <i class="fas fa-ellipsis-v text-gray-400"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center justify-between text-sm text-gray-500">
                    <div class="flex items-center space-x-4">
                        <span class="flex items-center">
                            <i class="fas fa-bolt mr-1"></i>
                            ${triggerText}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-play-circle mr-1"></i>
                            ${flow.usageCount || 0} ejecuciones
                        </span>
                    </div>
                    <span class="text-xs">
                        ${flow.whatsappInstance ? flow.whatsappInstance.numberName : 'Sin instancia'}
                    </span>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span class="text-xs text-gray-500">
                        Actualizado ${new Date(flow.updatedAt).toLocaleDateString('es-ES')}
                    </span>
                    <div class="flex items-center space-x-2">
                        <button class="edit-flow-btn px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium" data-flow-id="${flow.id}">
                            Editar
                        </button>
                        <button class="duplicate-flow-btn px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700" data-flow-id="${flow.id}">
                            Duplicar
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        const editBtn = div.querySelector('.edit-flow-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editFlow(flow.id);
            });
        }

        const duplicateBtn = div.querySelector('.duplicate-flow-btn');
        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.duplicateFlow(flow.id);
            });
        }

        const menuBtn = div.querySelector('.flow-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showFlowMenu(flow.id, e.target);
            });
        }

        // Click on card to edit
        div.addEventListener('click', () => {
            this.editFlow(flow.id);
        });

        return div;
    }

    getTriggerText(trigger, triggerValue) {
        switch (trigger) {
            case 'keyword':
                return `Palabra: "${triggerValue || 'No definida'}"`;
            case 'welcome':
                return 'Mensaje de bienvenida';
            case 'manual':
                return 'Activación manual';
            default:
                return 'Sin trigger';
        }
    }

    showCreateFlowModal() {
        const modal = document.getElementById('createFlowModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('flowName').focus();
        }
    }

    hideCreateFlowModal() {
        const modal = document.getElementById('createFlowModal');
        if (modal) {
            modal.classList.add('hidden');
            this.resetCreateFlowForm();
        }
    }

    resetCreateFlowForm() {
        const form = document.getElementById('createFlowForm');
        if (form) {
            form.reset();
            this.updateTriggerValueField('keyword');
        }
    }

    updateTriggerValueField(triggerType) {
        const container = document.getElementById('triggerValueContainer');
        const label = container?.querySelector('label');
        const input = document.getElementById('flowTriggerValue');
        
        if (!container || !label || !input) return;

        switch (triggerType) {
            case 'keyword':
                container.style.display = 'block';
                label.textContent = 'Palabra Clave';
                input.placeholder = 'ej: hola, menu, ayuda';
                input.required = true;
                break;
            case 'welcome':
            case 'manual':
                container.style.display = 'none';
                input.required = false;
                break;
        }
    }

    async createFlow() {
        try {
            const formData = {
                name: document.getElementById('flowName').value.trim(),
                description: document.getElementById('flowDescription').value.trim(),
                whatsappInstanceId: parseInt(document.getElementById('flowInstance').value),
                trigger: document.getElementById('flowTrigger').value,
                triggerValue: document.getElementById('flowTriggerValue').value.trim()
            };

            if (!formData.name || !formData.whatsappInstanceId) {
                showToast('Por favor completa todos los campos requeridos', 'error');
                return;
            }

            const response = await fetch('/flows/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Flow creado exitosamente', 'success');
                this.hideCreateFlowModal();
                this.loadFlows();
                
                // Redirect to editor
                setTimeout(() => {
                    window.location.href = `/flows/editor/${data.data.id}`;
                }, 1000);
            } else {
                showToast('Error creando flow: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error creating flow:', error);
            showToast('Error de conexión', 'error');
        }
    }

    editFlow(flowId) {
        window.location.href = `/flows/editor/${flowId}`;
    }

    async duplicateFlow(flowId) {
        try {
            const flow = this.flows.find(f => f.id === flowId);
            if (!flow) return;

            const newName = prompt(`Nombre para el flow duplicado:`, `${flow.name} (Copia)`);
            if (!newName) return;

            const formData = {
                name: newName,
                description: flow.description,
                whatsappInstanceId: flow.whatsappInstanceId,
                trigger: flow.trigger,
                triggerValue: flow.triggerValue
            };

            const response = await fetch('/flows/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Flow duplicado exitosamente', 'success');
                this.loadFlows();
            } else {
                showToast('Error duplicando flow: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error duplicating flow:', error);
            showToast('Error de conexión', 'error');
        }
    }

    async deleteFlow(flowId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este flow? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`/flows/api/${flowId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Flow eliminado exitosamente', 'success');
                this.loadFlows();
            } else {
                showToast('Error eliminando flow: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error deleting flow:', error);
            showToast('Error de conexión', 'error');
        }
    }

    async toggleFlowStatus(flowId) {
        try {
            const flow = this.flows.find(f => f.id === flowId);
            if (!flow) return;

            const response = await fetch(`/flows/api/${flowId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isActive: !flow.isActive
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const status = flow.isActive ? 'desactivado' : 'activado';
                showToast(`Flow ${status} exitosamente`, 'success');
                this.loadFlows();
            } else {
                showToast('Error cambiando estado: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error toggling flow status:', error);
            showToast('Error de conexión', 'error');
        }
    }

    showFlowMenu(flowId, target) {
        // Simple context menu implementation
        const flow = this.flows.find(f => f.id === flowId);
        if (!flow) return;

        const actions = [
            { text: 'Editar', action: () => this.editFlow(flowId) },
            { text: 'Duplicar', action: () => this.duplicateFlow(flowId) },
            { text: flow.isActive ? 'Desactivar' : 'Activar', action: () => this.toggleFlowStatus(flowId) },
            { text: 'Eliminar', action: () => this.deleteFlow(flowId), danger: true }
        ];

        // Create simple menu
        const menu = document.createElement('div');
        menu.className = 'fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50';
        menu.style.left = target.getBoundingClientRect().left + 'px';
        menu.style.top = (target.getBoundingClientRect().bottom + 5) + 'px';

        actions.forEach(action => {
            const item = document.createElement('button');
            item.className = `block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${action.danger ? 'text-red-600' : 'text-gray-700'}`;
            item.textContent = action.text;
            item.addEventListener('click', () => {
                action.action();
                menu.remove();
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Remove menu on outside click
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 10);
    }

    showLoading() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const flowsGrid = document.getElementById('flowsGrid');

        if (loadingState) loadingState.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        if (flowsGrid) flowsGrid.innerHTML = '';
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.classList.add('hidden');
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.classList.remove('hidden');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.flowsManager = new FlowsManager();
});
