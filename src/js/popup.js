import CONFIG from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const settingsLink = document.getElementById('openSettings');
    
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SUMMARY_STATUS') {
            statusElement.textContent = message.text;
        }
    });

    // Request initial status
    chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    
    // Open settings page when link is clicked
    settingsLink.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Check if API key is set
    chrome.storage.sync.get(['huggingfaceApiKey'], (result) => {
        if (!result.huggingfaceApiKey) {
            // If no API key is set, show a warning
            const warning = document.createElement('div');
            warning.style.color = '#d9534f';
            warning.style.marginTop = '10px';
            warning.style.fontSize = '12px';
            warning.textContent = '⚠️ Please set up your Hugging Face API key in the settings.';
            document.body.appendChild(warning);
        }
    });
}); 