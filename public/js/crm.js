/**
 * JavaScript para el sistema CRM
 */

class CRMManager {
    constructor() {
        this.currentInstanceId = null;
        this.currentConversationId = null;
        this.currentStatus = 'inbox';
        this.conversations = new Map();
        this.socket = null;
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.bindEvents();
        this.loadInitialData();
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 Conectado a Socket.IO');
            });

            this.socket.on('new_message', (data) => {
                this.handleNewMessage(data);
            });

            this.socket.on('conversation_updated', (data) => {
                this.handleConversationUpdate(data);
            });

            this.socket.on('chats_synced', (data) => {
                this.handleChatsSynced(data);
            });

        } catch (error) {
            console.error('Error inicializando Socket.IO:', error);
        }
    }

    bindEvents() {
        // Pestañas de estado
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const status = e.target.dataset.status;
                this.switchTab(status);
            });
        });

        // Pestañas de contenido
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchContentTab(tabName);
            });
        });

        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterConversations(e.target.value);
            });
        }

        // Envío de mensajes
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendMessage');
        
        if (messageInput && sendButton) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Añadir notas
        const addNoteButton = document.getElementById('addNote');
        if (addNoteButton) {
            addNoteButton.addEventListener('click', () => {
                this.addNote();
            });
        }

        // Menú de acciones
        const actionsMenu = document.getElementById('actionsMenu');
        if (actionsMenu) {
            actionsMenu.addEventListener('click', () => {
                this.toggleActionsMenu();
            });
        }

        // Acciones del menú
        document.querySelectorAll('.change-status').forEach(button => {
            button.addEventListener('click', (e) => {
                const status = e.target.dataset.status;
                this.changeConversationStatus(status);
            });
        });

        document.querySelectorAll('.assign-conversation').forEach(button => {
            button.addEventListener('click', () => {
                this.showAssignModal();
            });
        });

        document.querySelectorAll('.manage-tags').forEach(button => {
            button.addEventListener('click', () => {
                this.showTagsModal();
            });
        });

        // Modales
        this.bindModalEvents();

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#actionsMenu') && !e.target.closest('#actionsDropdown')) {
                this.hideActionsMenu();
            }
        });
    }

    bindModalEvents() {
        // Modal de asignación
        const assignModal = document.getElementById('assignModal');
        const cancelAssign = document.getElementById('cancelAssign');
        const confirmAssign = document.getElementById('confirmAssign');

        if (cancelAssign) {
            cancelAssign.addEventListener('click', () => {
                this.hideAssignModal();
            });
        }

        if (confirmAssign) {
            confirmAssign.addEventListener('click', () => {
                this.assignConversation();
            });
        }

        // Modal de etiquetas
        const tagsModal = document.getElementById('tagsModal');
        const cancelTags = document.getElementById('cancelTags');
        const saveTags = document.getElementById('saveTags');

        if (cancelTags) {
            cancelTags.addEventListener('click', () => {
                this.hideTagsModal();
            });
        }

        if (saveTags) {
            saveTags.addEventListener('click', () => {
                this.saveTags();
            });
        }
    }

    loadInitialData() {
        // Obtener la instancia seleccionada de la URL o de la variable global
        const pathMatch = window.location.pathname.match(/\/crm\/instance\/(\d+)/);
        if (pathMatch) {
            this.currentInstanceId = parseInt(pathMatch[1]);
            this.loadConversations();
        } else if (window.currentInstanceId) {
            this.currentInstanceId = window.currentInstanceId;
            this.loadConversations();
        }
    }

    async loadConversations() {
        if (!this.currentInstanceId) {
            this.showEmptyState();
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`/api/conversations/instance/${this.currentInstanceId}?status=${this.currentStatus}`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.conversations.clear();
                data.data.conversations.forEach(conv => {
                    this.conversations.set(conv.id, conv);
                });

                this.renderConversations(data.data.conversations);
                this.updateStatusCounts(data.data.statusCounts);
                this.hideLoading();
                
                if (data.data.conversations.length === 0) {
                    this.showEmptyStateForStatus();
                }
            } else {
                this.hideLoading();
                this.showError('Error cargando conversaciones: ' + (data.message || 'Error del servidor'));
            }
        } catch (error) {
            console.error('Error cargando conversaciones:', error);
            this.hideLoading();
            this.showError('Error de conexión');
        }
    }

    renderConversations(conversations) {
        const list = document.getElementById('conversationsList');
        if (!list) return;

        if (conversations.length === 0) {
            list.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-4 text-gray-300"></i>
                    <p class="text-lg font-medium mb-2">No hay conversaciones</p>
                    <p class="text-sm">No hay conversaciones en esta categoría</p>
                </div>
            `;
            return;
        }

        list.innerHTML = conversations.map(conv => this.renderConversationItem(conv)).join('');

        // Bind click events
        list.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const convId = parseInt(item.dataset.conversationId);
                this.selectConversation(convId);
            });
        });
    }

    renderConversationItem(conversation) {
        const isActive = conversation.id === this.currentConversationId ? 'active' : '';
        const timeAgo = this.formatTimeAgo(conversation.lastMessageAt);
        const unreadBadge = conversation.unreadCount > 0 ? 
            `<span class="bg-blue-600 text-white text-xs rounded-full px-2 py-1">${conversation.unreadCount}</span>` : '';

        const tags = conversation.tags?.map(tag => 
            `<span class="tag-badge text-xs" style="background-color: ${tag.color}20; color: ${tag.color};">${tag.name}</span>`
        ).join('') || '';

        const assignedTo = conversation.assignedTo ? 
            `<span class="text-xs text-gray-500">• ${conversation.assignedTo.displayName}</span>` : '';

        return `
            <div class="conversation-item cursor-pointer p-4 hover:bg-gray-50 ${isActive}" data-conversation-id="${conversation.id}">
                <div class="flex items-start space-x-3">
                    <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-gray-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                ${conversation.contactName || conversation.contactPhone}
                            </p>
                            <div class="flex items-center space-x-2">
                                ${unreadBadge}
                                <span class="text-xs text-gray-500">${timeAgo}</span>
                            </div>
                        </div>
                        <p class="text-sm text-gray-500 truncate mt-1">
                            ${conversation.lastMessageText || 'Sin mensajes'}
                        </p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex flex-wrap gap-1">
                                ${tags}
                            </div>
                            <div class="text-right">
                                ${assignedTo}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async selectConversation(conversationId) {
        this.currentConversationId = conversationId;
        
        // Actualizar UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        // Cargar datos de la conversación
        await this.loadConversationData(conversationId);
        
        // Mostrar vista de chat
        this.showChatView();
    }

    async loadConversationData(conversationId) {
        try {
            const conversation = this.conversations.get(conversationId);
            if (!conversation) return;

            // Actualizar header del chat
            this.updateChatHeader(conversation);

            // Cargar mensajes
            await this.loadMessages(conversationId);

            // Cargar notas
            await this.loadNotes(conversationId);

            // Marcar como leída
            await this.markAsRead(conversationId);

        } catch (error) {
            console.error('Error cargando datos de conversación:', error);
        }
    }

    updateChatHeader(conversation) {
        const contactName = document.getElementById('contactName');
        const contactPhone = document.getElementById('contactPhone');
        const conversationStatus = document.getElementById('conversationStatus');
        const conversationTags = document.getElementById('conversationTags');
        const assignedAgent = document.getElementById('assignedAgent');
        const agentName = document.getElementById('agentName');

        if (contactName) {
            contactName.textContent = conversation.contactName || 'Sin nombre';
        }

        if (contactPhone) {
            contactPhone.textContent = conversation.contactPhone;
        }

        if (conversationStatus) {
            conversationStatus.className = `status-badge status-${conversation.status}`;
            conversationStatus.textContent = this.getStatusLabel(conversation.status);
        }

        if (conversationTags) {
            conversationTags.innerHTML = conversation.tags?.map(tag => 
                `<span class="tag-badge" style="background-color: ${tag.color}20; color: ${tag.color};">
                    ${tag.name}
                </span>`
            ).join('') || '';
        }

        if (assignedAgent && agentName) {
            if (conversation.assignedTo) {
                assignedAgent.classList.remove('hidden');
                agentName.textContent = conversation.assignedTo.displayName;
            } else {
                assignedAgent.classList.add('hidden');
            }
        }
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`);
            const data = await response.json();

            if (data.success) {
                this.renderMessages(data.data);
            }
        } catch (error) {
            console.error('Error cargando mensajes:', error);
        }
    }

    renderMessages(messages) {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;

        if (messages.length === 0) {
            messagesArea.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-comment text-3xl mb-4"></i>
                    <p>No hay mensajes en esta conversación</p>
                </div>
            `;
            return;
        }

        messagesArea.innerHTML = messages.map(message => this.renderMessage(message)).join('');
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    renderMessage(message) {
        const isIncoming = message.direction === 'incoming';
        const alignment = isIncoming ? 'items-start' : 'items-end';
        const bubbleClass = isIncoming ? 'message-incoming' : 'message-outgoing';
        const time = this.formatTime(message.sentAt);

        return `
            <div class="flex ${alignment}">
                <div class="message-bubble ${bubbleClass} px-4 py-2 rounded-lg">
                    <p class="text-sm">${this.escapeHtml(message.body)}</p>
                    <p class="text-xs opacity-75 mt-1">${time}</p>
                </div>
            </div>
        `;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input || !this.currentConversationId) return;

        const message = input.value.trim();
        if (!message) return;

        try {
            const response = await fetch(`/api/conversations/${this.currentConversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ body: message })
            });

            const data = await response.json();

            if (data.success) {
                input.value = '';
                await this.loadMessages(this.currentConversationId);
                this.showToast('Mensaje enviado', 'success');
            } else {
                this.showToast('Error enviando mensaje: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            this.showToast('Error de conexión', 'error');
        }
    }

    async loadNotes(conversationId) {
        try {
            const response = await fetch(`/api/notes/conversation/${conversationId}`);
            const data = await response.json();

            if (data.success) {
                this.renderNotes(data.data);
                this.updateNotesCount(data.data.length);
            }
        } catch (error) {
            console.error('Error cargando notas:', error);
        }
    }

    renderNotes(notes) {
        const notesArea = document.getElementById('notesArea');
        if (!notesArea) return;

        if (notes.length === 0) {
            notesArea.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-sticky-note text-3xl mb-4"></i>
                    <p>No hay notas en esta conversación</p>
                </div>
            `;
            return;
        }

        notesArea.innerHTML = notes.map(note => this.renderNote(note)).join('');
    }

    renderNote(note) {
        const time = this.formatTime(note.createdAt);
        const importantClass = note.isImportant ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white';

        return `
            <div class="note-item border ${importantClass} rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-medium text-gray-900">${note.author.displayName}</span>
                        ${note.isImportant ? '<i class="fas fa-star text-yellow-500 text-xs"></i>' : ''}
                    </div>
                    <span class="text-xs text-gray-500">${time}</span>
                </div>
                <p class="text-sm text-gray-700">${this.escapeHtml(note.body)}</p>
            </div>
        `;
    }

    async addNote() {
        const input = document.getElementById('noteInput');
        const importantCheckbox = document.getElementById('noteImportant');
        
        if (!input || !this.currentConversationId) return;

        const body = input.value.trim();
        if (!body) return;

        try {
            const response = await fetch(`/api/notes/conversation/${this.currentConversationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    body: body,
                    isImportant: importantCheckbox?.checked || false
                })
            });

            const data = await response.json();

            if (data.success) {
                input.value = '';
                if (importantCheckbox) importantCheckbox.checked = false;
                await this.loadNotes(this.currentConversationId);
                this.showToast('Nota añadida', 'success');
            } else {
                this.showToast('Error añadiendo nota: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error añadiendo nota:', error);
            this.showToast('Error de conexión', 'error');
        }
    }

    // Métodos de UI y utilidades
    switchTab(status) {
        this.currentStatus = status;
        
        // Actualizar botones activos
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active', 'bg-blue-100', 'text-blue-700');
            button.classList.add('text-gray-600', 'hover:bg-gray-100');
        });

        const activeButton = document.querySelector(`[data-status="${status}"]`);
        if (activeButton) {
            activeButton.classList.add('active', 'bg-blue-100', 'text-blue-700');
            activeButton.classList.remove('text-gray-600', 'hover:bg-gray-100');
        }

        // Recargar conversaciones
        this.loadConversations();
    }

    switchContentTab(tabName) {
        // Actualizar pestañas
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            activeTab.classList.remove('border-transparent', 'text-gray-500');
        }

        // Mostrar/ocultar contenido
        document.getElementById('messagesTab').classList.toggle('hidden', tabName !== 'messages');
        document.getElementById('notesTab').classList.toggle('hidden', tabName !== 'notes');
    }

    showChatView() {
        document.getElementById('emptyChatState').classList.add('hidden');
        document.getElementById('chatView').classList.remove('hidden');
    }

    showEmptyState() {
        document.getElementById('emptyState').classList.remove('hidden');
    }

    hideEmptyState() {
        document.getElementById('emptyState').classList.add('hidden');
    }

    showLoading() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const conversationsList = document.getElementById('conversationsList');
        
        if (loadingState) loadingState.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        if (conversationsList) {
            // Ocultar conversaciones mientras carga
            conversationsList.querySelectorAll('.conversation-item').forEach(item => {
                item.style.display = 'none';
            });
        }
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.classList.add('hidden');
    }

    showEmptyStateForStatus() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            const statusLabels = {
                'inbox': 'Entrada',
                'pending': 'Esperando', 
                'closed': 'Finalizados'
            };
            const statusLabel = statusLabels[this.currentStatus] || this.currentStatus;
            emptyState.innerHTML = `
                <i class="fas fa-inbox text-4xl mb-4 text-gray-300"></i>
                <p class="text-lg font-medium mb-2">No hay conversaciones en ${statusLabel}</p>
                <p class="text-sm">Las conversaciones aparecerán aquí cuando cambien a este estado</p>
            `;
        }
    }

    updateStatusCounts(counts) {
        Object.keys(counts).forEach(status => {
            const badge = document.querySelector(`[data-status="${status}"] .count-badge`);
            if (badge) {
                badge.textContent = counts[status];
            }
        });
    }

    updateNotesCount(count) {
        const badge = document.getElementById('notesCount');
        if (badge) {
            badge.textContent = count;
        }
    }

    toggleActionsMenu() {
        const dropdown = document.getElementById('actionsDropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    hideActionsMenu() {
        const dropdown = document.getElementById('actionsDropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    showAssignModal() {
        const modal = document.getElementById('assignModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
        this.hideActionsMenu();
    }

    hideAssignModal() {
        const modal = document.getElementById('assignModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showTagsModal() {
        const modal = document.getElementById('tagsModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
        this.hideActionsMenu();
    }

    hideTagsModal() {
        const modal = document.getElementById('tagsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Métodos de utilidad
    formatTimeAgo(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    }

    formatTime(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getStatusLabel(status) {
        const labels = {
            'inbox': 'Entrada',
            'pending': 'Esperando',
            'closed': 'Finalizado'
        };
        return labels[status] || status;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        // Implementar sistema de toasts
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    // Manejo de eventos en tiempo real
    handleNewMessage(data) {
        if (data.conversationId === this.currentConversationId) {
            this.loadMessages(this.currentConversationId);
        }
        
        // Actualizar lista de conversaciones
        this.loadConversations();
    }

    handleConversationUpdate(data) {
        if (data.conversationId === this.currentConversationId) {
            this.loadConversationData(this.currentConversationId);
        }
        
        // Actualizar lista de conversaciones
        this.loadConversations();
    }

    handleChatsSynced(data) {
        try {
            console.log('📱 Chats sincronizados:', data);
            
            // Mostrar notificación de sincronización
            this.showToast(
                `🎉 Sincronización completada: ${data.syncedCount} conversaciones sincronizadas de ${data.totalChats} chats encontrados`,
                'success'
            );
            
            // Recargar conversaciones para mostrar las nuevas
            this.loadConversations();
            
        } catch (error) {
            console.error('Error manejando sincronización de chats:', error);
        }
    }

    async markAsRead(conversationId) {
        try {
            await fetch(`/api/conversations/${conversationId}/read`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error marcando como leída:', error);
        }
    }

    async changeConversationStatus(status) {
        if (!this.currentConversationId) return;

        try {
            const response = await fetch(`/api/conversations/${this.currentConversationId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Estado actualizado', 'success');
                await this.loadConversationData(this.currentConversationId);
                await this.loadConversations();
            } else {
                this.showToast('Error actualizando estado: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            this.showToast('Error de conexión', 'error');
        }

        this.hideActionsMenu();
    }

    async assignConversation() {
        const select = document.getElementById('agentSelect');
        if (!select || !this.currentConversationId) return;

        const userId = select.value || null;

        try {
            const response = await fetch(`/api/conversations/${this.currentConversationId}/assign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Conversación asignada', 'success');
                await this.loadConversationData(this.currentConversationId);
                await this.loadConversations();
                this.hideAssignModal();
            } else {
                this.showToast('Error asignando conversación: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error asignando conversación:', error);
            this.showToast('Error de conexión', 'error');
        }
    }

    filterConversations(query) {
        const items = document.querySelectorAll('.conversation-item');
        const searchTerm = query.toLowerCase();

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

// Inicializar CRM cuando la página esté lista
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.startsWith('/crm')) {
        window.crm = new CRMManager();
    }
});
