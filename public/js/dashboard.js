console.log('🚀 DEBUG: Dashboard JavaScript loaded successfully');

// Create instance functions
function createInstance() {
    console.log('🔍 DEBUG: createInstance() called');
    const modal = document.getElementById('createInstanceModal');
    console.log('🔍 DEBUG: Modal element:', modal);
    if (modal) {
        modal.classList.remove('hidden');
        console.log('✅ DEBUG: Modal should be visible now');
    } else {
        console.error('❌ DEBUG: Modal element not found!');
    }
}

function closeCreateInstanceModal() {
    document.getElementById('createInstanceModal').classList.add('hidden');
    document.getElementById('createInstanceForm').reset();
}

// Test message functions
function testMessage(instanceId) {
    document.getElementById('testInstanceId').value = instanceId;
    document.getElementById('testMessageModal').classList.remove('hidden');
}

function closeTestMessageModal() {
    document.getElementById('testMessageModal').classList.add('hidden');
    document.getElementById('testMessageForm').reset();
}

// Instance actions
async function connectInstance(instanceId) {
    try {
        const result = await apiCall(`/api/bot/instances/${instanceId}/connect`, {
            method: 'POST'
        });
        
        showToast(result.message, 'success');
        setTimeout(() => location.reload(), 2000);
        
    } catch (error) {
        console.error('Error connecting instance:', error);
    }
}

async function disconnectInstance(instanceId) {
    if (!confirm('¿Estás seguro de que quieres desconectar esta instancia?')) {
        return;
    }
    
    try {
        const result = await apiCall(`/api/bot/instances/${instanceId}/disconnect`, {
            method: 'POST'
        });
        
        showToast(result.message, 'success');
        setTimeout(() => location.reload(), 1000);
        
    } catch (error) {
        console.error('Error disconnecting instance:', error);
    }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DEBUG: DOM loaded, setting up form handlers...');
    
    // Form handlers
    const createForm = document.getElementById('createInstanceForm');
    if (createForm) {
        createForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔍 DEBUG: Form submitted');
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            console.log('🔍 DEBUG: Form data:', data);
            
            try {
                console.log('🔍 DEBUG: Making API call to /api/bot/instances');
                const result = await apiCall('/api/bot/instances', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                console.log('✅ DEBUG: API call successful:', result);
                showToast(result.message, 'success');
                closeCreateInstanceModal();
                setTimeout(() => location.reload(), 1000);
                
            } catch (error) {
                console.error('❌ DEBUG: Error creating instance:', error);
            }
        });
    }
    
    const testForm = document.getElementById('testMessageForm');
    if (testForm) {
        testForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            const instanceId = data.instanceId;
            
            try {
                const result = await apiCall(`/api/bot/instances/${instanceId}/send`, {
                    method: 'POST',
                    body: JSON.stringify({
                        to: data.to,
                        message: data.message
                    })
                });
                
                showToast(result.message, 'success');
                closeTestMessageModal();
                
            } catch (error) {
                console.error('Error sending test message:', error);
            }
        });
    }
    
    // Close modals when clicking outside
    const createModal = document.getElementById('createInstanceModal');
    if (createModal) {
        createModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCreateInstanceModal();
            }
        });
    }
    
    const testModal = document.getElementById('testMessageModal');
    if (testModal) {
        testModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeTestMessageModal();
            }
        });
    }
});
