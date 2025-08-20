/**
 * Funnel Kanban Board JavaScript
 */

class KanbanBoard {
    constructor() {
        this.funnelId = window.funnelData.id;
        this.stages = [];
        this.conversations = new Map();
        this.selectedStageColor = '#6b7280';
        this.currentConversation = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadBoardData();
    }

    bindEvents() {
        // Add stage button
        const addStageBtn = document.getElementById('addStageBtn');
        if (addStageBtn) {
            addStageBtn.addEventListener('click', () => {
                this.showAddStageModal();
            });
        }

        // Add stage form
        const addStageForm = document.getElementById('addStageForm');
        if (addStageForm) {
            addStageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addStage();
            });
        }

        // Cancel add stage
        const cancelAddStage = document.getElementById('cancelAddStage');
        if (cancelAddStage) {
            cancelAddStage.addEventListener('click', () => {
                this.hideAddStageModal();
            });
        }

        // Stage color selection
        document.querySelectorAll('.stage-color').forEach(colorBtn => {
            colorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.stage-color').forEach(btn => {
                    btn.classList.remove('ring-2', 'ring-offset-2');
                });
                e.target.classList.add('ring-2', 'ring-offset-2');
                this.selectedStageColor = e.target.dataset.color;
            });
        });

        // Modal events
        this.bindModalEvents();

        // Close modals on outside click
        document.querySelectorAll('.fixed').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    bindModalEvents() {
        // Conversation modal close
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this.hideConversationModal();
            });
        }

        // Move to stage
        const moveToStage = document.getElementById('moveToStage');
        if (moveToStage) {
            moveToStage.addEventListener('change', (e) => {
                if (e.target.value && this.currentConversation) {
                    this.moveConversation(this.currentConversation.id, parseInt(e.target.value));
                }
            });
        }

        // Quick message
        const sendQuickMessage = document.getElementById('sendQuickMessage');
        if (sendQuickMessage) {
            sendQuickMessage.addEventListener('click', () => {
                this.sendQuickMessage();
            });
        }

        const quickMessage = document.getElementById('quickMessage');
        if (quickMessage) {
            quickMessage.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.sendQuickMessage();
                }
            });
        }
    }

    async loadBoardData() {
        try {
            const response = await fetch(`/funnel/api/${this.funnelId}/board`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.stages = data.data.stages || [];
                this.renderBoard();
                this.updateStats();
            } else {
                showToast('Error cargando tablero: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error loading board data:', error);
            showToast('Error de conexión', 'error');
        }
    }

    renderBoard() {
        const board = document.getElementById('kanbanBoard');
        if (!board) return;

        board.innerHTML = '';

        this.stages.forEach(stage => {
            const stageColumn = this.createStageColumn(stage);
            board.appendChild(stageColumn);
        });
    }

    createStageColumn(stage) {
        const div = document.createElement('div');
        div.className = 'flex-shrink-0 w-80 bg-gray-50 rounded-lg';
        div.dataset.stageId = stage.id;

        const conversations = stage.conversations || [];

        div.innerHTML = `
            <!-- Stage Header -->
            <div class="p-4 border-b border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${stage.color}"></div>
                        <h3 class="font-semibold text-gray-800">${stage.name}</h3>
                        <span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">${conversations.length}</span>
                    </div>
                    <button class="stage-menu-btn w-6 h-6 rounded hover:bg-gray-200 flex items-center justify-center" data-stage-id="${stage.id}">
                        <i class="fas fa-ellipsis-h text-gray-400 text-sm"></i>
                    </button>
                </div>
                ${stage.description ? `<p class="text-sm text-gray-600">${stage.description}</p>` : ''}
            </div>
            
            <!-- Conversations -->
            <div class="stage-content p-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto" data-stage-id="${stage.id}">
                ${conversations.length === 0 ? 
                    `<div class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-2xl mb-2"></i>
                        <p class="text-sm">Sin conversaciones</p>
                    </div>` :
                    conversations.map(conv => this.createConversationCard(conv)).join('')
                }
            </div>
        `;

        // Make stage sortable
        const stageContent = div.querySelector('.stage-content');
        if (stageContent) {
            this.makeSortable(stageContent, stage.id);
        }

        // Bind stage menu
        const menuBtn = div.querySelector('.stage-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showStageMenu(stage.id, e.target);
            });
        }

        return div;
    }

    createConversationCard(conversation) {
        const lastMessageTime = conversation.lastMessageAt ? 
            new Date(conversation.lastMessageAt).toLocaleString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '';

        const avatar = (conversation.contactName || 'U').charAt(0).toUpperCase();

        return `
            <div class="conversation-card bg-white rounded-lg border border-gray-200 p-3 mb-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all" 
                 data-conversation-id="${conversation.id}"
                 onclick="window.kanbanBoard.openConversationModal(${conversation.id})">
                
                <div class="flex items-start space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-white font-semibold text-sm">${avatar}</span>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="font-medium text-gray-900 text-sm truncate">${conversation.contactName || 'Usuario'}</h4>
                            ${conversation.unreadCount > 0 ? 
                                `<span class="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">${conversation.unreadCount}</span>` :
                                ''
                            }
                        </div>
                        
                        <p class="text-sm text-gray-600 line-clamp-2 mb-2">
                            ${conversation.lastMessage || 'Sin mensajes'}
                        </p>
                        
                        <div class="flex items-center justify-between text-xs text-gray-500">
                            <span>${lastMessageTime}</span>
                            ${conversation.assignedTo ? 
                                `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded">@${conversation.assignedTo.displayName}</span>` :
                                ''
                            }
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="flex items-center justify-end space-x-1 mt-3 pt-2 border-t border-gray-100">
                    <button class="quick-reply-btn w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center" onclick="event.stopPropagation(); window.kanbanBoard.quickReply(${conversation.id})" title="Respuesta rápida">
                        <i class="fas fa-reply text-gray-400 text-xs"></i>
                    </button>
                    <button class="assign-btn w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center" onclick="event.stopPropagation(); window.kanbanBoard.assignConversation(${conversation.id})" title="Asignar">
                        <i class="fas fa-user text-gray-400 text-xs"></i>
                    </button>
                    <button class="tag-btn w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center" onclick="event.stopPropagation(); window.kanbanBoard.tagConversation(${conversation.id})" title="Etiquetar">
                        <i class="fas fa-tag text-gray-400 text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }

    makeSortable(element, stageId) {
        new Sortable(element, {
            group: 'shared',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: (evt) => {
                const conversationId = evt.item.dataset.conversationId;
                const newStageId = evt.to.dataset.stageId;
                
                if (conversationId && newStageId && evt.from !== evt.to) {
                    this.moveConversation(parseInt(conversationId), parseInt(newStageId));
                }
            }
        });
    }

    async moveConversation(conversationId, newStageId) {
        try {
            const response = await fetch(`/funnel/api/conversations/${conversationId}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stageId: newStageId })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Conversación movida exitosamente', 'success');
                // Reload board to reflect changes
                await this.loadBoardData();
                
                // Update modal if open
                if (this.currentConversation && this.currentConversation.id === conversationId) {
                    this.populateStageSelector();
                }
            } else {
                showToast('Error moviendo conversación: ' + (data.message || 'Error del servidor'), 'error');
                // Reload to revert visual change
                this.loadBoardData();
            }
        } catch (error) {
            console.error('Error moving conversation:', error);
            showToast('Error de conexión', 'error');
            this.loadBoardData();
        }
    }

    showAddStageModal() {
        const modal = document.getElementById('addStageModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('stageName').focus();
        }
    }

    hideAddStageModal() {
        const modal = document.getElementById('addStageModal');
        if (modal) {
            modal.classList.add('hidden');
            this.resetAddStageForm();
        }
    }

    resetAddStageForm() {
        const form = document.getElementById('addStageForm');
        if (form) {
            form.reset();
            
            // Reset color selection
            document.querySelectorAll('.stage-color').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-offset-2');
            });
            
            // Select default color
            const defaultColor = document.querySelector('.stage-color[data-color="#6b7280"]');
            if (defaultColor) {
                defaultColor.classList.add('ring-2', 'ring-offset-2');
            }
            
            this.selectedStageColor = '#6b7280';
        }
    }

    async addStage() {
        try {
            const formData = {
                name: document.getElementById('stageName').value.trim(),
                description: document.getElementById('stageDescription').value.trim(),
                color: this.selectedStageColor,
                order: this.stages.length + 1
            };

            if (!formData.name) {
                showToast('Por favor ingresa un nombre para la etapa', 'error');
                return;
            }

            const response = await fetch(`/funnel/api/${this.funnelId}/stages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Etapa agregada exitosamente', 'success');
                this.hideAddStageModal();
                this.loadBoardData();
            } else {
                showToast('Error agregando etapa: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error adding stage:', error);
            showToast('Error de conexión', 'error');
        }
    }

    openConversationModal(conversationId) {
        // Find conversation in stages
        let conversation = null;
        for (const stage of this.stages) {
            conversation = stage.conversations?.find(c => c.id === conversationId);
            if (conversation) break;
        }

        if (!conversation) {
            showToast('Conversación no encontrada', 'error');
            return;
        }

        this.currentConversation = conversation;
        this.showConversationModal(conversation);
    }

    showConversationModal(conversation) {
        const modal = document.getElementById('conversationModal');
        if (!modal) return;

        // Update modal content
        const avatar = (conversation.contactName || 'U').charAt(0).toUpperCase();
        const phone = conversation.contactId.replace('@c.us', '');

        document.getElementById('modalContactAvatar').innerHTML = `<span class="text-white font-semibold">${avatar}</span>`;
        document.getElementById('modalContactName').textContent = conversation.contactName || 'Usuario';
        document.getElementById('modalContactInfo').textContent = phone;

        // Populate stage selector
        this.populateStageSelector();

        // Load messages
        this.loadConversationMessages(conversation.id);

        // Load notes
        this.loadConversationNotes(conversation.id);

        // Show modal
        modal.classList.remove('hidden');
    }

    hideConversationModal() {
        const modal = document.getElementById('conversationModal');
        if (modal) {
            modal.classList.add('hidden');
            this.currentConversation = null;
        }
    }

    populateStageSelector() {
        const selector = document.getElementById('moveToStage');
        if (!selector) return;

        selector.innerHTML = '<option value="">Seleccionar etapa...</option>';
        
        this.stages.forEach(stage => {
            const option = document.createElement('option');
            option.value = stage.id;
            option.textContent = stage.name;
            option.style.color = stage.color;
            
            if (this.currentConversation && this.currentConversation.stageId === stage.id) {
                option.selected = true;
            }
            
            selector.appendChild(option);
        });
    }

    async loadConversationMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.renderMessages(data.data);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('modalMessages');
        if (!container) return;

        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-comments text-2xl mb-2"></i>
                    <p>No hay mensajes en esta conversación</p>
                </div>
            `;
            return;
        }

        messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            container.appendChild(messageEl);
        });

        container.scrollTop = container.scrollHeight;
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isOutgoing = message.direction === 'outgoing';
        
        div.className = `flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-3`;
        
        const messageTime = new Date(message.sentAt).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        div.innerHTML = `
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOutgoing 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
            }">
                <p class="text-sm">${this.escapeHtml(message.body)}</p>
                <span class="text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-500'} mt-1 block">
                    ${messageTime}
                </span>
            </div>
        `;

        return div;
    }

    async loadConversationNotes(conversationId) {
        try {
            const response = await fetch(`/api/notes?conversationId=${conversationId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.renderNotes(data.data);
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    renderNotes(notes) {
        const container = document.getElementById('modalNotes');
        if (!container) return;

        container.innerHTML = '';

        if (notes.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">Sin notas</p>';
            return;
        }

        notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'p-2 bg-yellow-50 border border-yellow-200 rounded text-sm';
            noteEl.innerHTML = `
                <p class="text-gray-800">${this.escapeHtml(note.body)}</p>
                <span class="text-xs text-gray-500">${new Date(note.createdAt).toLocaleString('es-ES')}</span>
            `;
            container.appendChild(noteEl);
        });
    }

    async sendQuickMessage() {
        const input = document.getElementById('quickMessage');
        if (!input || !input.value.trim() || !this.currentConversation) return;

        const message = input.value.trim();
        input.value = '';

        try {
            const response = await fetch(`/api/conversations/${this.currentConversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: message,
                    whatsappInstanceId: window.funnelData.instanceId
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Mensaje enviado', 'success');
                // Reload messages
                this.loadConversationMessages(this.currentConversation.id);
            } else {
                showToast('Error enviando mensaje: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Error de conexión', 'error');
        }
    }

    quickReply(conversationId) {
        // Simple implementation - just open the modal
        this.openConversationModal(conversationId);
    }

    assignConversation(conversationId) {
        showToast('Función de asignación en desarrollo', 'info');
    }

    tagConversation(conversationId) {
        showToast('Función de etiquetas en desarrollo', 'info');
    }

    showStageMenu(stageId, target) {
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) return;

        const actions = [
            { text: 'Editar', action: () => this.editStage(stageId) },
            { text: 'Cambiar color', action: () => this.changeStageColor(stageId) },
            { text: 'Eliminar', action: () => this.deleteStage(stageId), danger: true }
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

    editStage(stageId) {
        showToast('Función de edición de etapa en desarrollo', 'info');
    }

    changeStageColor(stageId) {
        showToast('Función de cambio de color en desarrollo', 'info');
    }

    async deleteStage(stageId) {
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) return;

        if (!confirm(`¿Estás seguro de que quieres eliminar la etapa "${stage.name}"?`)) {
            return;
        }

        showToast('Función de eliminación de etapa en desarrollo', 'info');
    }

    updateStats() {
        const totalConversations = this.stages.reduce((total, stage) => 
            total + (stage.conversations?.length || 0), 0);

        const totalConversationsEl = document.getElementById('totalConversations');
        if (totalConversationsEl) {
            totalConversationsEl.innerHTML = `
                <i class="fas fa-comments mr-1"></i>
                ${totalConversations} conversación${totalConversations !== 1 ? 'es' : ''}
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.kanbanBoard = new KanbanBoard();
});

// Add Sortable styles
const style = document.createElement('style');
style.textContent = `
    .sortable-ghost {
        opacity: 0.4;
    }
    
    .sortable-chosen {
        transform: rotate(5deg);
    }
    
    .sortable-drag {
        transform: rotate(15deg);
    }
    
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);
