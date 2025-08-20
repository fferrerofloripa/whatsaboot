/**
 * Modern CRM JavaScript - Gestión avanzada de conversaciones
 */

class ModernCRMManager {
    constructor() {
        this.currentInstanceId = null;
        this.currentConversationId = null;
        this.currentStatus = 'inbox';
        this.conversations = new Map();
        this.socket = null;
        this.selectedTagColor = '#3b82f6';
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.bindEvents();
        this.loadInitialData();
        this.setupAutoResize();
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
        // Status tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const status = e.currentTarget.dataset.status;
                this.switchTab(status);
            });
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filterConversations(searchInput.value);
            }, 300));
        }

        // Instance selector
        const instanceSelector = document.getElementById('instanceSelector');
        if (instanceSelector) {
            instanceSelector.addEventListener('change', (e) => {
                this.currentInstanceId = e.target.value || null;
                this.loadConversations();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadConversations();
            });
        }

        // Conversation status change
        const conversationStatus = document.getElementById('conversationStatus');
        if (conversationStatus) {
            conversationStatus.addEventListener('change', (e) => {
                this.changeConversationStatus(e.target.value);
            });
        }

        // Agent assignment
        const assignAgent = document.getElementById('assignAgent');
        if (assignAgent) {
            assignAgent.addEventListener('change', (e) => {
                this.assignAgent(e.target.value);
            });
        }

        // Message input
        this.setupMessageInput();

        // Notes functionality
        this.setupNotesEvents();

        // Tags functionality
        this.setupTagsEvents();

        // Sidebar tabs
        this.setupSidebarTabs();
    }

    setupMessageInput() {
        const messageText = document.getElementById('messageText');
        const sendBtn = document.getElementById('sendMessageBtn');

        if (messageText) {
            messageText.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
    }

    setupNotesEvents() {
        const addNoteBtn = document.getElementById('addNoteBtn');
        const cancelNoteBtn = document.getElementById('cancelNoteBtn');
        const saveNoteBtn = document.getElementById('saveNoteBtn');

        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => {
                this.showAddNoteModal();
            });
        }

        if (cancelNoteBtn) {
            cancelNoteBtn.addEventListener('click', () => {
                this.hideAddNoteModal();
            });
        }

        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', () => {
                this.saveNote();
            });
        }
    }

    setupTagsEvents() {
        const addTagBtn = document.getElementById('addTagBtn');
        const cancelTagBtn = document.getElementById('cancelTagBtn');
        const saveTagBtn = document.getElementById('saveTagBtn');

        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => {
                this.showAddTagModal();
            });
        }

        if (cancelTagBtn) {
            cancelTagBtn.addEventListener('click', () => {
                this.hideAddTagModal();
            });
        }

        if (saveTagBtn) {
            saveTagBtn.addEventListener('click', () => {
                this.saveTag();
            });
        }

        // Color selection
        document.querySelectorAll('.tag-color').forEach(colorBtn => {
            colorBtn.addEventListener('click', (e) => {
                document.querySelectorAll('.tag-color').forEach(btn => btn.classList.remove('ring-2', 'ring-offset-2', 'ring-gray-400'));
                e.target.classList.add('ring-2', 'ring-offset-2', 'ring-gray-400');
                this.selectedTagColor = e.target.dataset.color;
            });
        });
    }

    setupSidebarTabs() {
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchSidebarTab(tabName);
            });
        });
    }

    setupAutoResize() {
        const messageText = document.getElementById('messageText');
        if (messageText) {
            messageText.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }
    }

    async loadInitialData() {
        try {
            console.log('🔧 loadInitialData - window.currentInstanceId:', window.currentInstanceId);
            
            // Parse instance ID from URL
            const pathMatch = window.location.pathname.match(/\/crm\/instance\/(\d+)/);
            if (pathMatch) {
                this.currentInstanceId = parseInt(pathMatch[1]);
                console.log('📍 Instancia desde URL:', this.currentInstanceId);
            } else if (window.currentInstanceId) {
                this.currentInstanceId = window.currentInstanceId;
                console.log('📍 Instancia desde window:', this.currentInstanceId);
            } else {
                // Default to instance 2 (WhatsApp real instance)
                this.currentInstanceId = 2;
                console.log('📍 Instancia por defecto:', this.currentInstanceId);
            }

            // Load instances for selector
            await this.loadInstances();
            
            // Set selector value to current instance
            const selector = document.getElementById('instanceSelector');
            if (selector && this.currentInstanceId) {
                selector.value = this.currentInstanceId.toString();
            }
            
            // Load conversations
            console.log('📊 Cargando conversaciones para instancia:', this.currentInstanceId);
            this.loadConversations();
            
            // Load users for agent assignment
            await this.loadUsers();

        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            showToast('Error cargando datos iniciales', 'error');
        }
    }

    async loadInstances() {
        try {
            const response = await fetch('/api/bot/instances', {
                credentials: 'include'
            });
            const data = await response.json();

            if (response.ok && data.success) {
                const selector = document.getElementById('instanceSelector');
                if (selector) {
                    selector.innerHTML = '<option value="">Todas las instancias</option>';
                    data.data.forEach(instance => {
                        const option = document.createElement('option');
                        option.value = instance.id;
                        option.textContent = `${instance.numberName} (${instance.status})`;
                        if (instance.id === this.currentInstanceId) {
                            option.selected = true;
                        }
                        selector.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error cargando instancias:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();

            if (response.ok && data.success) {
                const selector = document.getElementById('assignAgent');
                if (selector) {
                    selector.innerHTML = '<option value="">Sin asignar</option>';
                    data.data.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.displayName;
                        selector.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        }
    }

    async loadConversations() {
        try {
            this.showLoading();
            
            const url = this.currentInstanceId 
                ? `/api/conversations/instance/${this.currentInstanceId}?status=${this.currentStatus}`
                : `/api/conversations?status=${this.currentStatus}`;

            const response = await fetch(url, {
                credentials: 'include' // Incluir cookies de sesión
            });
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
                showToast('Error cargando conversaciones: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error cargando conversaciones:', error);
            this.hideLoading();
            showToast('Error de conexión', 'error');
        }
    }

    renderConversations(conversations) {
        console.log('🎨 renderConversations llamado con:', conversations.length, 'conversaciones');
        
        const container = document.getElementById('conversationsList');
        if (!container) {
            console.error('❌ No se encontró el container conversationsList');
            return;
        }

        console.log('📦 Container encontrado:', container);
        container.innerHTML = '';

        conversations.forEach((conversation, index) => {
            console.log(`🔧 Renderizando conversación ${index + 1}:`, conversation.contactName);
            const item = this.createConversationItem(conversation);
            container.appendChild(item);
        });
        
        console.log('✅ Renderizado completo. Items en container:', container.children.length);
    }

    createConversationItem(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-primary-500';
        div.dataset.conversationId = conversation.id;
        
        const lastMessageTime = conversation.lastMessageAt ? 
            new Date(conversation.lastMessageAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 
            '';

        div.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                        <span class="text-white font-semibold text-sm">
                            ${(conversation.contactName || 'Usuario').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    ${conversation.unreadCount > 0 ? 
                        `<div class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center -mt-2 ml-8">
                            <span class="text-white text-xs font-bold">${conversation.unreadCount}</span>
                        </div>` : ''
                    }
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <h4 class="font-semibold text-gray-900 truncate">${conversation.contactName || 'Usuario desconocido'}</h4>
                        <span class="text-xs text-gray-500">${lastMessageTime}</span>
                    </div>
                    
                    <p class="text-sm text-gray-600 truncate mt-1">
                        ${conversation.lastMessage || 'Sin mensajes'}
                    </p>
                    
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center space-x-2">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getStatusClass(conversation.status)}">
                                ${this.getStatusLabel(conversation.status)}
                            </span>
                            ${conversation.assignedTo ? 
                                `<span class="text-xs text-gray-500">@${conversation.assignedTo.displayName}</span>` : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

        div.addEventListener('click', () => {
            this.selectConversation(conversation.id);
        });

        return div;
    }

    getStatusClass(status) {
        const classes = {
            'inbox': 'bg-blue-100 text-blue-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'closed': 'bg-green-100 text-green-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusLabel(status) {
        const labels = {
            'inbox': 'Entrada',
            'pending': 'Esperando',
            'closed': 'Finalizado'
        };
        return labels[status] || status;
    }

    selectConversation(conversationId) {
        // Update visual selection
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('bg-primary-50', 'border-primary-500');
        });

        const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('bg-primary-50', 'border-primary-500');
        }

        this.currentConversationId = conversationId;
        this.loadConversationData(conversationId);
    }

    async loadConversationData(conversationId) {
        try {
            const conversation = this.conversations.get(conversationId);
            if (!conversation) return;

            // Show chat interface
            this.showChatInterface(conversation);

            // Load messages
            await this.loadMessages(conversationId);

            // Load notes
            await this.loadNotes(conversationId);

            // Mark as read
            await this.markAsRead(conversationId);

        } catch (error) {
            console.error('Error cargando datos de conversación:', error);
            showToast('Error cargando conversación', 'error');
        }
    }

    showChatInterface(conversation) {
        // Show header
        const header = document.getElementById('chatHeader');
        const emptyState = document.getElementById('chatEmptyState');
        const messageInput = document.getElementById('messageInput');
        const rightSidebar = document.getElementById('rightSidebar');

        if (header) header.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        if (messageInput) messageInput.classList.remove('hidden');
        if (rightSidebar) rightSidebar.style.display = 'flex';

        // Update header info
        const contactAvatar = document.getElementById('contactAvatar');
        const contactName = document.getElementById('contactName');
        const contactStatus = document.getElementById('contactStatus');
        const conversationStatusSelect = document.getElementById('conversationStatus');
        const assignAgentSelect = document.getElementById('assignAgent');

        if (contactAvatar) {
            contactAvatar.textContent = (conversation.contactName || 'U').charAt(0).toUpperCase();
        }
        if (contactName) {
            contactName.textContent = conversation.contactName || 'Usuario desconocido';
        }
        if (contactStatus) {
            contactStatus.textContent = conversation.lastMessageAt ? 
                `Último mensaje: ${new Date(conversation.lastMessageAt).toLocaleString('es-ES')}` :
                'Sin actividad';
        }
        if (conversationStatusSelect) {
            conversationStatusSelect.value = conversation.status;
        }
        if (assignAgentSelect) {
            assignAgentSelect.value = conversation.assignedToId || '';
        }

        // Update info tab
        this.updateInfoTab(conversation);
    }

    updateInfoTab(conversation) {
        const contactPhone = document.getElementById('contactPhone');
        const lastMessageTime = document.getElementById('lastMessageTime');
        const contactStatusInfo = document.getElementById('contactStatusInfo');
        const unreadMessages = document.getElementById('unreadMessages');

        if (contactPhone) {
            const phone = conversation.contactId.replace('@c.us', '');
            contactPhone.textContent = phone;
        }
        if (lastMessageTime) {
            lastMessageTime.textContent = conversation.lastMessageAt ? 
                new Date(conversation.lastMessageAt).toLocaleString('es-ES') : 'Nunca';
        }
        if (contactStatusInfo) {
            contactStatusInfo.textContent = this.getStatusLabel(conversation.status);
        }
        if (unreadMessages) {
            unreadMessages.textContent = conversation.unreadCount || 0;
        }
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (response.ok && data.success) {
                this.renderMessages(data.data);
                
                // Update total messages count
                const totalMessages = document.getElementById('totalMessages');
                if (totalMessages) {
                    totalMessages.textContent = data.data.length;
                }
            }
        } catch (error) {
            console.error('Error cargando mensajes:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesList');
        if (!container) return;

        container.innerHTML = '';
        container.classList.remove('hidden');

        messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            container.appendChild(messageEl);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isOutgoing = message.direction === 'outgoing';
        
        div.className = `flex ${isOutgoing ? 'justify-end' : 'justify-start'}`;
        
        const messageTime = new Date(message.sentAt).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        div.innerHTML = `
            <div class="message-bubble ${isOutgoing ? 'message-outgoing' : 'message-incoming'} rounded-lg px-4 py-2 shadow-sm">
                <p class="text-sm">${this.escapeHtml(message.body)}</p>
                <span class="text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-500'} mt-1 block">
                    ${messageTime}
                </span>
            </div>
        `;

        return div;
    }

    async sendMessage() {
        const messageText = document.getElementById('messageText');
        if (!messageText || !messageText.value.trim() || !this.currentConversationId) return;

        const text = messageText.value.trim();
        messageText.value = '';
        messageText.style.height = 'auto';

        try {
            const conversation = this.conversations.get(this.currentConversationId);
            if (!conversation) return;

            const response = await fetch(`/api/conversations/${this.currentConversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    body: text,
                    whatsappInstanceId: conversation.whatsappInstanceId
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Message will be added via socket event
                showToast('Mensaje enviado', 'success');
            } else {
                showToast('Error enviando mensaje: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            showToast('Error de conexión', 'error');
        }
    }

    // Notes functionality
    async loadNotes(conversationId) {
        try {
            const response = await fetch(`/api/notes?conversationId=${conversationId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.renderNotes(data.data);
            }
        } catch (error) {
            console.error('Error cargando notas:', error);
        }
    }

    renderNotes(notes) {
        const container = document.getElementById('notesList');
        const emptyState = document.getElementById('notesEmptyState');
        
        if (!container) return;

        container.innerHTML = '';

        if (notes.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        notes.forEach(note => {
            const noteEl = this.createNoteElement(note);
            container.appendChild(noteEl);
        });
    }

    createNoteElement(note) {
        const div = document.createElement('div');
        div.className = `p-3 bg-gray-50 rounded-lg ${note.isImportant ? 'border-l-4 border-red-500' : ''}`;
        
        const noteTime = new Date(note.createdAt).toLocaleString('es-ES');

        div.innerHTML = `
            <p class="text-sm text-gray-800 mb-2">${this.escapeHtml(note.body)}</p>
            <div class="flex items-center justify-between text-xs text-gray-500">
                <span>por ${note.author?.displayName || 'Usuario'}</span>
                <span>${noteTime}</span>
            </div>
            ${note.isImportant ? '<i class="fas fa-exclamation text-red-500 text-xs mt-1"></i>' : ''}
        `;

        return div;
    }

    showAddNoteModal() {
        const modal = document.getElementById('addNoteModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('noteText').focus();
        }
    }

    hideAddNoteModal() {
        const modal = document.getElementById('addNoteModal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('noteText').value = '';
            document.getElementById('noteImportant').checked = false;
        }
    }

    async saveNote() {
        const noteText = document.getElementById('noteText').value.trim();
        const isImportant = document.getElementById('noteImportant').checked;

        if (!noteText || !this.currentConversationId) return;

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversationId: this.currentConversationId,
                    body: noteText,
                    isImportant
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.hideAddNoteModal();
                this.loadNotes(this.currentConversationId);
                showToast('Nota guardada', 'success');
            } else {
                showToast('Error guardando nota: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error guardando nota:', error);
            showToast('Error de conexión', 'error');
        }
    }

    // Tags functionality
    showAddTagModal() {
        const modal = document.getElementById('addTagModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('tagName').focus();
        }
    }

    hideAddTagModal() {
        const modal = document.getElementById('addTagModal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('tagName').value = '';
            document.querySelectorAll('.tag-color').forEach(btn => btn.classList.remove('ring-2', 'ring-offset-2', 'ring-gray-400'));
            this.selectedTagColor = '#3b82f6';
        }
    }

    async saveTag() {
        const tagName = document.getElementById('tagName').value.trim();
        
        if (!tagName || !this.currentConversationId) return;

        try {
            const conversation = this.conversations.get(this.currentConversationId);
            if (!conversation) return;

            const response = await fetch('/api/tags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    whatsappInstanceId: conversation.whatsappInstanceId,
                    name: tagName,
                    color: this.selectedTagColor
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.hideAddTagModal();
                showToast('Etiqueta creada', 'success');
            } else {
                showToast('Error creando etiqueta: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error creando etiqueta:', error);
            showToast('Error de conexión', 'error');
        }
    }

    // UI helper methods
    switchTab(status) {
        this.currentStatus = status;
        
        // Update tab appearance
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('bg-white', 'text-primary-600', 'shadow-sm');
            button.classList.add('text-gray-600', 'hover:text-gray-900');
        });

        const activeTab = document.querySelector(`[data-status="${status}"]`);
        if (activeTab) {
            activeTab.classList.add('bg-white', 'text-primary-600', 'shadow-sm');
            activeTab.classList.remove('text-gray-600', 'hover:text-gray-900');
        }

        this.loadConversations();
    }

    switchSidebarTab(tabName) {
        // Update tab appearance
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('border-primary-500', 'text-primary-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('border-primary-500', 'text-primary-600');
            activeTab.classList.remove('border-transparent', 'text-gray-500');
        }

        // Show/hide content
        document.getElementById('notesTab').style.display = tabName === 'notes' ? 'flex' : 'none';
        document.getElementById('infoTab').style.display = tabName === 'info' ? 'block' : 'none';
    }

    filterConversations(query) {
        const items = document.querySelectorAll('.conversation-item');
        
        items.forEach(item => {
            const name = item.querySelector('h4').textContent.toLowerCase();
            const message = item.querySelector('p').textContent.toLowerCase();
            const matches = name.includes(query.toLowerCase()) || message.includes(query.toLowerCase());
            
            item.style.display = matches ? 'block' : 'none';
        });
    }

    updateStatusCounts(statusCounts) {
        const counts = { inbox: 0, pending: 0, closed: 0 };
        
        statusCounts.forEach(item => {
            counts[item.status] = parseInt(item.count);
        });

        document.getElementById('inbox-count').textContent = counts.inbox;
        document.getElementById('pending-count').textContent = counts.pending;
        document.getElementById('closed-count').textContent = counts.closed;
    }

    async changeConversationStatus(newStatus) {
        if (!this.currentConversationId) return;

        try {
            const response = await fetch(`/api/conversations/${this.currentConversationId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Estado actualizado', 'success');
                this.loadConversations(); // Refresh list
            } else {
                showToast('Error actualizando estado: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            showToast('Error de conexión', 'error');
        }
    }

    async assignAgent(userId) {
        if (!this.currentConversationId) return;

        try {
            const response = await fetch(`/api/conversations/${this.currentConversationId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: userId || null })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Agente asignado', 'success');
                this.loadConversations(); // Refresh list
            } else {
                showToast('Error asignando agente: ' + (data.message || 'Error del servidor'), 'error');
            }
        } catch (error) {
            console.error('Error asignando agente:', error);
            showToast('Error de conexión', 'error');
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

    // Socket event handlers
    handleNewMessage(data) {
        if (data.conversationId === this.currentConversationId) {
            this.loadMessages(this.currentConversationId);
        }
        this.loadConversations(); // Refresh list to show new message
    }

    handleConversationUpdate(data) {
        if (data.conversationId === this.currentConversationId) {
            this.loadConversationData(this.currentConversationId);
        }
        this.loadConversations(); // Refresh list
    }

    handleChatsSynced(data) {
        showToast(`🎉 Sincronización completada: ${data.syncedCount} conversaciones sincronizadas de ${data.totalChats} chats encontrados`, 'success');
        this.loadConversations();
    }

    // Utility methods
    showLoading() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const conversationsList = document.getElementById('conversationsList');

        if (loadingState) loadingState.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        if (conversationsList) {
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
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-inbox text-2xl text-gray-400"></i>
                </div>
                <p class="text-lg font-medium text-gray-700 mb-2">No hay conversaciones en ${statusLabel}</p>
                <p class="text-sm text-gray-500">Las conversaciones aparecerán aquí cuando cambien a este estado</p>
            `;
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.crmManager = new ModernCRMManager();
});
