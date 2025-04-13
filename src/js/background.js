// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed - creating context menu');
    chrome.contextMenus.create({
        id: 'summarize-selection',
        title: 'Summarize Selected Text',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('Context menu clicked:', info.menuItemId);
    if (info.menuItemId === 'summarize-selection' && info.selectionText) {
        console.log('Selected text from context menu:', info.selectionText);
        handleSelectedText(info.selectionText, tab.id);
    }
});

// Handle keyboard shortcuts
console.log('Setting up commands listener, chrome.commands exists:', !!chrome.commands);
if (chrome.commands) {
    chrome.commands.onCommand.addListener(async (command) => {
        console.log('Keyboard command received:', command);
        if (command === 'summarize-selection') {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                console.log('Active tab found:', tab?.id);
                if (tab) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: () => {
                            const selectedText = window.getSelection().toString();
                            console.log('Selected text from keyboard shortcut:', selectedText);
                            if (selectedText) {
                                chrome.runtime.sendMessage({
                                    type: 'SUMMARIZE_TEXT',
                                    text: selectedText
                                });
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error executing keyboard shortcut:', error);
            }
        }
    });
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in background:', message);
    if (message.type === 'SUMMARIZE_TEXT' && message.text) {
        console.log('Processing summarize text message for tab:', sender.tab.id);
        handleSelectedText(message.text, sender.tab.id);
    }
    return true;
});

// Helper function to handle selected text
function handleSelectedText(text, tabId) {
    console.log('Handling selected text for tab:', tabId, 'text:', text.substring(0, 50) + '...');
    chrome.tabs.sendMessage(tabId, {
        type: 'SUMMARIZE_TEXT',
        text: text
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending message to content script:', chrome.runtime.lastError);
        } else {
            console.log('Message sent successfully to content script');
        }
    });
} 