/**
 * JavaScript para Funnel Index
 */

class FunnelManager {
    constructor() {
        this.funnels = [];
        this.selectedInstanceId = null;
        this.selectedColor = '#3b82f6';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFunnels();
    }

    bindEvents() {
        // Instance selector
        const instanceSelector = document.getElementById('instanceSelector');
        if (instanceSelector) {
            instanceSelector.addEventListener('change', (e) => {
                this.selectedInstanceId = e.target.value || null;
                this.loadFunnels();
            });
        }

        // Create funnel button
        const createFunnelBtn = document.getElementById('createFunnelBtn');
        if (createFunnelBtn) {
            createFunnelBtn.addEventListener('click', () => {
                this.showCreateFunnelModal();
            });
        }

        // Create funnel form
        const createFunnelForm = document.getElementById('createFunnelForm');
        if (createFunnelForm) {
            createFunnelForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createFunnel();
            });
        }

        // Cancel create funnel
        const cancelCreateFunnel = document.getElementById('cancelCreateFunnel');
        if (cancelCreateFunnel) {
            cancelCreateFunnel.addEventListener('click', () => {
                this.hideCreateFunnelModal();
            });
        }

        // Color selection
        document.querySelectorAll('.funnel-color').forEach(colorBtn => {
            colorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.funnel-color').forEach(btn => {
                    btn.classList.remove('ring-2', 'ring-offset-2');
                });
                e.target.classList.add('ring-2', 'ring-offset-2');
                this.selectedColor = e.target.dataset.color;
            });
        });

        // Close modal on outside click
        const createFunnelModal = document.getElementById('createFunnelModal');
        if (createFunnelModal) {
            createFunnelModal.addEventListener('click', (e) => {
                if (e.target === createFunnelModal) {
                    this.hideCreateFunnelModal();
                }
            });
        }
    }

    async loadFunnels() {
        try {
            this.showLoading();
            
            const url = this.selectedInstanceId 
                ? `/funnel/api?instanceId=${this.selectedInstanceId}`
                : '/funnel/api';
            
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok && data.success) {
                this.funnels = data.data;
                this.renderFunnels();
                this.hideLoading();
                
                if (this.funnels.length === 0) {
                    this.showEmptyState();
                }
            } else {
                this.hideLoading();
                showToast('Error cargando funnels: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error loading funnels:', error);
            this.hideLoading();
            showToast('Error de conexión', 'error');
        }
    }

    renderFunnels() {
        const container = document.getElementById('funnelsGrid');
        if (!container) return;

        container.innerHTML = '';

        this.funnels.forEach(funnel => {
            const funnelCard = this.createFunnelCard(funnel);
            container.appendChild(funnelCard);
        });
    }

    createFunnelCard(funnel) {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-pointer group';
        
        const statusColor = funnel.isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
        const statusText = funnel.isActive ? 'Activo' : 'Inactivo';
        
        const totalConversations = funnel.stages?.reduce((total, stage) => 
            total + (stage.conversations?.length || 0), 0) || 0;

        div.innerHTML = `
            <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center space-x-3 flex-1">
                        <div class="w-4 h-4 rounded-full flex-shrink-0" style="background-color: ${funnel.color}"></div>
                        <div class="flex-1">
                            <h3 class="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">${funnel.name}</h3>
                            <p class="text-sm text-gray-600 mt-1">${funnel.description || 'Sin descripción'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                            ${statusText}
                        </span>
                        <div class="relative">
                            <button class="funnel-menu-btn w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" data-funnel-id="${funnel.id}">
                                <i class="fas fa-ellipsis-v text-gray-400"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Stages Preview -->
                <div class="mb-4">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="text-sm font-medium text-gray-700">Etapas (${funnel.stages?.length || 0})</span>
                    </div>
                    <div class="flex space-x-1">
                        ${(funnel.stages || []).slice(0, 6).map(stage => `
                            <div class="w-8 h-2 rounded-full" style="background-color: ${stage.color}" title="${stage.name}"></div>
                        `).join('')}
                        ${funnel.stages?.length > 6 ? '<div class="w-8 h-2 rounded-full bg-gray-300" title="..."></div>' : ''}
                    </div>
                </div>
                
                <div class="flex items-center justify-between text-sm text-gray-500">
                    <div class="flex items-center space-x-4">
                        <span class="flex items-center">
                            <i class="fas fa-comments mr-1"></i>
                            ${totalConversations} conversaciones
                        </span>
                    </div>
                    <span class="text-xs">
                        ${funnel.whatsappInstance ? funnel.whatsappInstance.numberName : 'Sin instancia'}
                    </span>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span class="text-xs text-gray-500">
                        Actualizado ${new Date(funnel.updatedAt).toLocaleDateString('es-ES')}
                    </span>
                    <div class="flex items-center space-x-2">
                        <button class="view-board-btn px-3 py-1.5 text-sm text-green-600 hover:text-green-700 font-medium" data-funnel-id="${funnel.id}">
                            Ver Tablero
                        </button>
                        <button class="edit-funnel-btn px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700" data-funnel-id="${funnel.id}">
                            Editar
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        const viewBoardBtn = div.querySelector('.view-board-btn');
        if (viewBoardBtn) {
            viewBoardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewBoard(funnel.id);
            });
        }

        const editBtn = div.querySelector('.edit-funnel-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editFunnel(funnel.id);
            });
        }

        const menuBtn = div.querySelector('.funnel-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showFunnelMenu(funnel.id, e.target);
            });
        }

        // Click on card to view board
        div.addEventListener('click', () => {
            this.viewBoard(funnel.id);
        });

        return div;
    }

    showCreateFunnelModal() {
        const modal = document.getElementById('createFunnelModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('funnelName').focus();
        }
    }

    hideCreateFunnelModal() {
        const modal = document.getElementById('createFunnelModal');
        if (modal) {
            modal.classList.add('hidden');
            this.resetCreateFunnelForm();
        }
    }

    resetCreateFunnelForm() {
        const form = document.getElementById('createFunnelForm');
        if (form) {
            form.reset();
            
            // Reset color selection
            document.querySelectorAll('.funnel-color').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-offset-2');
            });
            
            // Select default color (blue)
            const defaultColor = document.querySelector('.funnel-color[data-color="#3b82f6"]');
            if (defaultColor) {
                defaultColor.classList.add('ring-2', 'ring-offset-2');
            }
            
            this.selectedColor = '#3b82f6';
        }
    }

    async createFunnel() {
        try {
            const formData = {
                name: document.getElementById('funnelName').value.trim(),
                description: document.getElementById('funnelDescription').value.trim(),
                whatsappInstanceId: parseInt(document.getElementById('funnelInstance').value),
                color: this.selectedColor
            };

            if (!formData.name || !formData.whatsappInstanceId) {
                showToast('Por favor completa todos los campos requeridos', 'error');
                return;
            }

            const response = await fetch('/funnel/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Funnel creado exitosamente', 'success');
                this.hideCreateFunnelModal();
                this.loadFunnels();
                
                // Redirect to board
                setTimeout(() => {
                    window.location.href = `/funnel/board/${data.data.id}`;
                }, 1000);
            } else {
                showToast('Error creando funnel: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error creating funnel:', error);
            showToast('Error de conexión', 'error');
        }
    }

    viewBoard(funnelId) {
        window.location.href = `/funnel/board/${funnelId}`;
    }

    editFunnel(funnelId) {
        // TODO: Implement edit funnel modal
        showToast('Función de edición en desarrollo', 'info');
    }

    async duplicateFunnel(funnelId) {
        try {
            const funnel = this.funnels.find(f => f.id === funnelId);
            if (!funnel) return;

            const newName = prompt(`Nombre para el funnel duplicado:`, `${funnel.name} (Copia)`);
            if (!newName) return;

            const formData = {
                name: newName,
                description: funnel.description,
                whatsappInstanceId: funnel.whatsappInstanceId,
                color: funnel.color
            };

            const response = await fetch('/funnel/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Funnel duplicado exitosamente', 'success');
                this.loadFunnels();
            } else {
                showToast('Error duplicando funnel: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error duplicating funnel:', error);
            showToast('Error de conexión', 'error');
        }
    }

    async deleteFunnel(funnelId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este funnel? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`/funnel/api/${funnelId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Funnel eliminado exitosamente', 'success');
                this.loadFunnels();
            } else {
                showToast('Error eliminando funnel: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error deleting funnel:', error);
            showToast('Error de conexión', 'error');
        }
    }

    async toggleFunnelStatus(funnelId) {
        try {
            const funnel = this.funnels.find(f => f.id === funnelId);
            if (!funnel) return;

            const response = await fetch(`/funnel/api/${funnelId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isActive: !funnel.isActive
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const status = funnel.isActive ? 'desactivado' : 'activado';
                showToast(`Funnel ${status} exitosamente`, 'success');
                this.loadFunnels();
            } else {
                showToast('Error cambiando estado: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error toggling funnel status:', error);
            showToast('Error de conexión', 'error');
        }
    }

    showFunnelMenu(funnelId, target) {
        const funnel = this.funnels.find(f => f.id === funnelId);
        if (!funnel) return;

        const actions = [
            { text: 'Ver Tablero', action: () => this.viewBoard(funnelId) },
            { text: 'Editar', action: () => this.editFunnel(funnelId) },
            { text: 'Duplicar', action: () => this.duplicateFunnel(funnelId) },
            { text: funnel.isActive ? 'Desactivar' : 'Activar', action: () => this.toggleFunnelStatus(funnelId) },
            { text: 'Eliminar', action: () => this.deleteFunnel(funnelId), danger: true }
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
        const funnelsGrid = document.getElementById('funnelsGrid');

        if (loadingState) loadingState.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        if (funnelsGrid) funnelsGrid.innerHTML = '';
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
    window.funnelManager = new FunnelManager();
});
