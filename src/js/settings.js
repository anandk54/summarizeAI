// DOM elements
const apiKeyInput = document.getElementById('api-key');
const saveButton = document.getElementById('save-button');
const statusMessage = document.getElementById('status-message');
const infoMessage = document.getElementById('info-message');

// Show info message
infoMessage.style.display = 'block';

// Load saved API key
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['huggingfaceApiKey'], (result) => {
        if (result.huggingfaceApiKey) {
            apiKeyInput.value = result.huggingfaceApiKey;
        }
    });
});

// Save API key
saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
    }
    
    // Basic validation for Hugging Face API key format
    if (!apiKey.startsWith('hf_')) {
        showStatus('Invalid API key format. Hugging Face API keys should start with "hf_"', 'error');
        return;
    }
    
    chrome.storage.sync.set({ huggingfaceApiKey: apiKey }, () => {
        showStatus('API key saved successfully!', 'success');
    });
});

// Helper function to show status messages
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
} 