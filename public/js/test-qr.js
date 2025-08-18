console.log('🚀 TEST: Archivo test-qr.js cargado correctamente!');

// Test function super simple
function testCreateInstance() {
    console.log('🔥 TEST: testCreateInstance llamada!');
    
    fetch('/api/bot/instances', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            numberName: 'TEST QR BOT'
        })
    })
    .then(response => {
        console.log('🔥 TEST: Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('🔥 TEST: Response data:', data);
        alert('✅ SUCCESS: ' + JSON.stringify(data));
    })
    .catch(error => {
        console.error('🔥 TEST: Error:', error);
        alert('❌ ERROR: ' + error.message);
    });
}

console.log('🔥 TEST: testCreateInstance definida:', typeof testCreateInstance);

// Functions for Auto-Responses Management
function openAddResponseModal() {
    console.log('🔍 DEBUG: openAddResponseModal called');
    const modal = document.getElementById('addResponseModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('❌ Modal addResponseModal not found');
        // Fallback: crear respuesta automática de forma simple
        const keyword = prompt('Ingresa la palabra clave:');
        const response = prompt('Ingresa la respuesta automática:');
        
        if (keyword && response) {
            addAutoResponse(keyword, response);
        }
    }
}

// Function to add auto response via API
function addAutoResponse(keyword, responseMessage, instanceId = null) {
    console.log('🔍 DEBUG: addAutoResponse called', {keyword, responseMessage, instanceId});
    
    // Try to get instance ID from URL if not provided
    if (!instanceId) {
        const path = window.location.pathname;
        const match = path.match(/\/dashboard\/instance\/(\d+)/);
        if (match) {
            instanceId = match[1];
        } else {
            alert('❌ No se pudo determinar la instancia');
            return;
        }
    }
    
    fetch(`/api/bot/instances/${instanceId}/autoresponses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            keyword: keyword,
            responseMessage: responseMessage
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Auto response created:', data);
        alert('✅ Respuesta automática creada exitosamente!');
        location.reload(); // Refresh to show new response
    })
    .catch(error => {
        console.error('❌ Error creating auto response:', error);
        alert('❌ Error: ' + error.message);
    });
}

function closeAddResponseModal() {
    console.log('🔍 DEBUG: closeAddResponseModal called');
    const modal = document.getElementById('addResponseModal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        const form = document.getElementById('addResponseForm');
        if (form) form.reset();
    }
}

function editResponse(responseId) {
    console.log('🔍 DEBUG: editResponse called for ID:', responseId);
    alert('Función de editar respuesta - ID: ' + responseId);
    // TODO: Implement edit functionality
}

function deleteResponse(responseId) {
    console.log('🔍 DEBUG: deleteResponse called for ID:', responseId);
    if (confirm('¿Estás seguro de que quieres eliminar esta respuesta?')) {
        // TODO: Implement delete functionality
        alert('Eliminando respuesta ID: ' + responseId);
    }
}

function openTestMessageModal() {
    console.log('🔍 DEBUG: openTestMessageModal called');
    const modal = document.getElementById('testMessageModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeTestMessageModal() {
    console.log('🔍 DEBUG: closeTestMessageModal called');
    const modal = document.getElementById('testMessageModal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('testMessageForm');
        if (form) form.reset();
    }
}

function connectInstance(instanceId) {
    console.log('🔍 DEBUG: connectInstance called for ID:', instanceId);
    alert('Conectando instancia ID: ' + instanceId);
    // TODO: Implement connect functionality
}

function disconnectInstance(instanceId) {
    console.log('🔍 DEBUG: disconnectInstance called for ID:', instanceId);
    alert('Desconectando instancia ID: ' + instanceId);
    // TODO: Implement disconnect functionality
}

console.log('✅ Todas las funciones del dashboard definidas correctamente');
