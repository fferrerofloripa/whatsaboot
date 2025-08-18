console.log('🚀 Dashboard JS cargado correctamente!');

// Global variables for Socket.IO connection
let socket = null;

// Initialize Socket.IO connection
try {
    socket = io();
    console.log('📱 Socket.IO inicializado');
    
    if (socket) {
        // Listen for QR code updates
        socket.on('qr-code', (data) => {
            console.log('📱 QR Code recibido via Socket:', data);
            updateQRCode(data.instanceId, data.qrCode);
        });

        // Listen for status updates
        socket.on('status-update', (data) => {
            console.log('📱 Status update recibido:', data);
            updateInstanceStatus(data.instanceId, data.status, data.phoneNumber);
        });

        // Listen for connection events
        socket.on('connect', () => {
            console.log('📱 Conectado a Socket.IO');
        });

        socket.on('disconnect', () => {
            console.log('📱 Desconectado de Socket.IO');
        });
    }
} catch (error) {
    console.error('❌ Error inicializando Socket.IO:', error);
}

// Helper function for API calls with optimized performance
function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    return fetch(url, { 
        ...defaultOptions, 
        ...options,
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    console.log(`📢 Toast (${type}):`, message);
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm transform transition-transform duration-300 translate-x-full`;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            toast.className += ' bg-green-500';
            break;
        case 'error':
            toast.className += ' bg-red-500';
            break;
        case 'warning':
            toast.className += ' bg-yellow-500';
            break;
        default:
            toast.className += ' bg-blue-500';
    }
    
    toast.innerHTML = `
        <div class="flex items-center">
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 5000);
}

// Loading functions
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Cargando...';
        element.disabled = true;
    }
}

function hideLoading(elementId, originalText) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = originalText;
        element.disabled = false;
    }
}

// Create Instance Functions
function createInstance() {
    console.log('🔧 DEBUG: createInstance called');
    
    const form = document.getElementById('createInstanceForm');
    const numberName = document.getElementById('numberName').value.trim();
    
    if (!numberName) {
        showToast('Por favor ingresa un nombre para la instancia', 'warning');
        return;
    }
    
    console.log('🔧 DEBUG: Creating instance with name:', numberName);
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando...';
    submitBtn.disabled = true;
    
    apiCall('/api/bot/instances', {
        method: 'POST',
        body: JSON.stringify({ numberName })
    })
    .then(data => {
        console.log('✅ Instance created successfully:', data);
        showToast('Instancia creada exitosamente! Generando código QR...', 'success');
        
        // Close modal
        closeCreateInstanceModal();
        
        // Reload page to show new instance
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    })
    .catch(error => {
        console.error('❌ Error creating instance:', error);
        showToast(`Error al crear instancia: ${error.message}`, 'error');
    })
    .finally(() => {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function closeCreateInstanceModal() {
    const modal = document.getElementById('createInstanceModal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        const form = document.getElementById('createInstanceForm');
        if (form) form.reset();
    }
}

// Instance Management Functions
function connectInstance(instanceId) {
    console.log('🔌 Connecting instance:', instanceId);
    
    const button = document.querySelector(`button[onclick="connectInstance(${instanceId})"]`);
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Conectando...';
        button.disabled = true;
        
        // Use fetch with timeout to avoid long waits
        Promise.race([
            apiCall(`/api/bot/instances/${instanceId}/connect`, {
                method: 'POST'
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
        ])
        .then(data => {
            console.log('✅ Instance connection initiated:', data);
            showToast('Iniciando conexión... Se generará un código QR en breve.', 'success');
            
            // Update button immediately
            if (button) {
                button.innerHTML = '<i class="fas fa-qrcode mr-1"></i>Generando QR...';
                button.className = button.className.replace('bg-green-600', 'bg-yellow-500');
            }
            
            // Reload after delay
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        })
        .catch(error => {
            console.error('❌ Error connecting instance:', error);
            const errorMsg = error.message === 'Timeout' ? 'La conexión tardó demasiado' : error.message;
            showToast(`Error al conectar: ${errorMsg}`, 'error');
            
            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;
        });
    }
}

function disconnectInstance(instanceId) {
    console.log('🔌 Disconnecting instance:', instanceId);
    
    // Show immediate feedback
    const button = document.querySelector(`button[onclick="disconnectInstance(${instanceId})"]`);
    const originalText = button ? button.innerHTML : '';
    
    if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Procesando...';
        button.disabled = true;
    }
    
    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
        if (confirm('¿Estás seguro de que quieres desconectar esta instancia?')) {
            
            if (button) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Desconectando...';
            }
            
            // Use fetch with shorter timeout and optimistic updates
            Promise.race([
                apiCall(`/api/bot/instances/${instanceId}/disconnect`, {
                    method: 'POST'
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ])
            .then(data => {
                console.log('✅ Instance disconnected:', data);
                showToast('Instancia desconectada exitosamente', 'success');
                
                // Update button immediately
                if (button) {
                    button.innerHTML = '<i class="fas fa-check mr-1"></i>Desconectado';
                    button.className = button.className.replace('bg-red-600', 'bg-gray-500');
                }
                
                // Reload after delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            })
            .catch(error => {
                console.error('❌ Error disconnecting instance:', error);
                
                if (error.message === 'Timeout') {
                    // Handle timeout optimistically - the disconnect is probably happening
                    showToast('Desconexión en proceso... Actualizando estado', 'warning');
                    
                    // Update UI optimistically
                    if (button) {
                        button.innerHTML = '<i class="fas fa-hourglass mr-1"></i>Desconectando...';
                        button.disabled = true;
                    }
                    
                    // Check status after a delay
                    setTimeout(() => {
                        refreshInstanceStatus(instanceId);
                    }, 3000);
                    
                } else {
                    // Real error - restore button
                    showToast(`Error al desconectar: ${error.message}`, 'error');
                    if (button) {
                        button.innerHTML = originalText;
                        button.disabled = false;
                    }
                }
            });
        } else {
            // User cancelled - restore button
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }
    }, 100); // Small delay to show immediate feedback
}

// Test Message Functions
function testMessage(instanceId) {
    console.log('📨 Opening test message modal for instance:', instanceId);
    
    const modal = document.getElementById('testMessageModal');
    const instanceIdField = document.getElementById('testInstanceId');
    
    if (modal && instanceIdField) {
        instanceIdField.value = instanceId;
        modal.classList.remove('hidden');
    } else {
        showToast('Error al abrir modal de prueba', 'error');
    }
}

function sendTestMessage() {
    console.log('📨 Sending test message');
    
    const form = document.getElementById('testMessageForm');
    const instanceId = document.getElementById('testInstanceId').value;
    const phoneNumber = document.getElementById('testPhoneNumber').value.trim();
    const message = document.getElementById('testMessage').value.trim();
    
    if (!phoneNumber || !message) {
        showToast('Por favor completa todos los campos', 'warning');
        return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
    submitBtn.disabled = true;
    
    apiCall(`/api/bot/instances/${instanceId}/send`, {
        method: 'POST',
        body: JSON.stringify({
            to: phoneNumber,
            message: message
        })
    })
    .then(data => {
        console.log('✅ Test message sent:', data);
        showToast('Mensaje de prueba enviado exitosamente!', 'success');
        closeTestMessageModal();
    })
    .catch(error => {
        console.error('❌ Error sending test message:', error);
        showToast(`Error al enviar mensaje: ${error.message}`, 'error');
    })
    .finally(() => {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function closeTestMessageModal() {
    const modal = document.getElementById('testMessageModal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('testMessageForm');
        if (form) form.reset();
    }
}

// QR Code Functions
function updateQRCode(instanceId, qrCode) {
    console.log('📱 Updating QR code for instance:', instanceId);
    
    const instanceElement = document.querySelector(`[data-instance-id="${instanceId}"]`);
    if (instanceElement) {
        const qrImage = instanceElement.querySelector('#qr-image');
        if (qrImage) {
            qrImage.src = qrCode;
            
            // Add glow effect
            qrImage.classList.add('qr-glow');
            setTimeout(() => {
                qrImage.classList.remove('qr-glow');
            }, 2000);
        }
    }
}

function updateInstanceStatus(instanceId, status, phoneNumber) {
    console.log('📱 Updating status for instance:', instanceId, 'to:', status);
    
    // Reload the page to show updated status
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// QR Tutorial Functions
function startQRTutorial() {
    console.log('🎯 Starting QR tutorial');
    
    const steps = [
        {
            target: '.qr-container',
            title: 'Paso 1: Código QR',
            content: 'Este es tu código QR único para conectar WhatsApp'
        },
        {
            target: null,
            title: 'Paso 2: Abre WhatsApp',
            content: 'Abre WhatsApp en tu teléfono móvil'
        },
        {
            target: null,
            title: 'Paso 3: Menú',
            content: 'Toca el menú de 3 puntos (⋮) en la esquina superior derecha'
        },
        {
            target: null,
            title: 'Paso 4: Dispositivos',
            content: 'Selecciona "Dispositivos vinculados"'
        },
        {
            target: null,
            title: 'Paso 5: Vincular',
            content: 'Toca "Vincular un dispositivo"'
        },
        {
            target: '.qr-container',
            title: 'Paso 6: Escanear',
            content: 'Apunta tu teléfono hacia este código QR para escanearlo'
        }
    ];
    
    showTutorialSteps(steps);
}

function showTutorialSteps(steps) {
    let currentStep = 0;
    
    function showStep(stepIndex) {
        if (stepIndex >= steps.length) {
            showToast('¡Tutorial completado! Ya puedes escanear el código QR.', 'success');
            return;
        }
        
        const step = steps[stepIndex];
        const modal = createTutorialModal(step, stepIndex + 1, steps.length);
        
        document.body.appendChild(modal);
        
        // Auto advance to next step
        setTimeout(() => {
            modal.remove();
            showStep(stepIndex + 1);
        }, 3000);
    }
    
    showStep(0);
}

function createTutorialModal(step, currentNumber, totalSteps) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4 text-center animate-pulse">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-blue-600 font-bold text-lg">${currentNumber}</span>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${step.title}</h3>
            <p class="text-gray-600 mb-4">${step.content}</p>
            <div class="flex justify-center space-x-1">
                ${Array(totalSteps).fill(0).map((_, i) => 
                    `<div class="w-2 h-2 rounded-full ${i < currentNumber ? 'bg-blue-600' : 'bg-gray-300'}"></div>`
                ).join('')}
            </div>
        </div>
    `;
    
    return modal;
}

// Form Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, setting up event listeners');
    
    // Create Instance Form
    const createInstanceForm = document.getElementById('createInstanceForm');
    if (createInstanceForm) {
        createInstanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createInstance();
        });
    }
    
    // Test Message Form
    const testMessageForm = document.getElementById('testMessageForm');
    if (testMessageForm) {
        testMessageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendTestMessage();
        });
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
            // Close any open modal
            e.target.classList.add('hidden');
        }
    });
    
    console.log('✅ Event listeners configurados correctamente');
});

// Auto-Response Management Functions
function addAutoResponse() {
    console.log('📝 Adding auto response');
    
    const keyword = prompt('Ingresa la palabra clave:');
    const responseMessage = prompt('Ingresa la respuesta automática:');
    
    if (!keyword || !responseMessage) {
        showToast('Por favor completa todos los campos', 'warning');
        return;
    }
    
    // Try to get instance ID from URL
    const path = window.location.pathname;
    const match = path.match(/\/dashboard\/instance\/(\d+)/);
    
    if (!match) {
        showToast('No se pudo determinar la instancia', 'error');
        return;
    }
    
    const instanceId = match[1];
    
    apiCall(`/api/bot/instances/${instanceId}/autoresponses`, {
        method: 'POST',
        body: JSON.stringify({
            keyword: keyword.trim(),
            responseMessage: responseMessage.trim()
        })
    })
    .then(data => {
        console.log('✅ Auto response created:', data);
        showToast('Respuesta automática creada exitosamente!', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('❌ Error creating auto response:', error);
        showToast(`Error al crear respuesta: ${error.message}`, 'error');
    });
}

function editResponse(responseId) {
    console.log('✏️ Editing response:', responseId);
    
    const newKeyword = prompt('Nueva palabra clave:');
    const newMessage = prompt('Nuevo mensaje de respuesta:');
    
    if (!newKeyword || !newMessage) {
        showToast('Operación cancelada', 'info');
        return;
    }
    
    // Try to get instance ID from URL
    const path = window.location.pathname;
    const match = path.match(/\/dashboard\/instance\/(\d+)/);
    
    if (!match) {
        showToast('No se pudo determinar la instancia', 'error');
        return;
    }
    
    const instanceId = match[1];
    
    apiCall(`/api/bot/instances/${instanceId}/autoresponses/${responseId}`, {
        method: 'PUT',
        body: JSON.stringify({
            keyword: newKeyword.trim(),
            responseMessage: newMessage.trim()
        })
    })
    .then(data => {
        console.log('✅ Auto response updated:', data);
        showToast('Respuesta automática actualizada exitosamente!', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('❌ Error updating auto response:', error);
        showToast(`Error al actualizar respuesta: ${error.message}`, 'error');
    });
}

function deleteResponse(responseId) {
    console.log('🗑️ Deleting response:', responseId);
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta respuesta automática?')) {
        return;
    }
    
    // Try to get instance ID from URL
    const path = window.location.pathname;
    const match = path.match(/\/dashboard\/instance\/(\d+)/);
    
    if (!match) {
        showToast('No se pudo determinar la instancia', 'error');
        return;
    }
    
    const instanceId = match[1];
    
    apiCall(`/api/bot/instances/${instanceId}/autoresponses/${responseId}`, {
        method: 'DELETE'
    })
    .then(data => {
        console.log('✅ Auto response deleted:', data);
        showToast('Respuesta automática eliminada exitosamente!', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('❌ Error deleting auto response:', error);
        showToast(`Error al eliminar respuesta: ${error.message}`, 'error');
    });
}

function toggleResponse(responseId) {
    console.log('🔄 Toggling response:', responseId);
    
    // Try to get instance ID from URL
    const path = window.location.pathname;
    const match = path.match(/\/dashboard\/instance\/(\d+)/);
    
    if (!match) {
        showToast('No se pudo determinar la instancia', 'error');
        return;
    }
    
    const instanceId = match[1];
    
    apiCall(`/api/bot/instances/${instanceId}/autoresponses/${responseId}`, {
        method: 'PUT',
        body: JSON.stringify({
            isActive: 'toggle' // Special value to toggle current state
        })
    })
    .then(data => {
        console.log('✅ Auto response toggled:', data);
        showToast('Estado de respuesta automática actualizado!', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('❌ Error toggling auto response:', error);
        showToast(`Error al cambiar estado: ${error.message}`, 'error');
    });
}

// Instance Management Helper Functions
function refreshInstanceStatus(instanceId) {
    console.log('🔄 Refreshing instance status:', instanceId);
    
    apiCall(`/api/bot/instances/${instanceId}/status`)
    .then(data => {
        console.log('✅ Instance status:', data);
        // Reload page to show updated status
        window.location.reload();
    })
    .catch(error => {
        console.error('❌ Error refreshing status:', error);
        showToast(`Error al obtener estado: ${error.message}`, 'error');
    });
}

function deleteInstance(instanceId) {
    console.log('🗑️ Deleting instance:', instanceId);
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta instancia? Esta acción no se puede deshacer.')) {
        return;
    }
    
    apiCall(`/api/bot/instances/${instanceId}`, {
        method: 'DELETE'
    })
    .then(data => {
        console.log('✅ Instance deleted:', data);
        showToast('Instancia eliminada exitosamente!', 'success');
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1500);
    })
    .catch(error => {
        console.error('❌ Error deleting instance:', error);
        showToast(`Error al eliminar instancia: ${error.message}`, 'error');
    });
}

// Global function for opening modals (if needed from other scripts)
window.openAddResponseModal = function() {
    addAutoResponse();
};

// Add custom CSS for QR glow effect
const style = document.createElement('style');
style.textContent = `
    .qr-glow {
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        transition: box-shadow 0.3s ease;
    }
    
    .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: .5;
        }
    }
    
    .loading-button {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

console.log('✅ Dashboard JavaScript completamente cargado con todas las funciones');