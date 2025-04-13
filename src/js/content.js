// Content script for handling page interactions

// API Configuration
const API_CONFIG = {
    baseUrl: 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    maxTokens: 130,
    temperature: 0.7,
    topP: 0.9,
    repetitionPenalty: 1.2
};

// UI Components
class SummaryBox {
    constructor() {
        this.summaryBox = null;
        this.closeButton = null;
    }

    createSummaryBox(selectedText) {
        const summaryBox = document.createElement('div');
        summaryBox.id = 'ai-summary-box';
        summaryBox.className = 'summary-box';
        
        summaryBox.innerHTML = `
            <div style="margin-bottom: 10px;"><strong>Selected Text:</strong></div>
            <div class="selected-text">${selectedText}</div>
            <div><strong>Summary:</strong></div>
            <div id="summary-content" class="summary-content">Loading summary...</div>
        `;

        this.summaryBox = summaryBox;
        return summaryBox;
    }

    createCloseButton() {
        const closeBtn = document.createElement('span');
        closeBtn.innerText = '✖';
        closeBtn.className = 'close-button';
        closeBtn.title = 'Close';
        
        this.closeButton = closeBtn;
        return closeBtn;
    }

    setupEventListeners() {
        this.closeButton.addEventListener('click', () => {
            this.remove();
        });
    }

    remove() {
        this.summaryBox?.remove();
    }

    updateSummary(summaryText) {
        const summaryContent = document.getElementById('summary-content');
        if (summaryContent) {
            summaryContent.textContent = summaryText;
            summaryContent.style.color = '#333333'; // Ensure text is dark
            summaryContent.style.fontSize = '14px';
            summaryContent.style.lineHeight = '1.5';
        }
    }
}

// Error handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// API Integration
async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['huggingfaceApiKey'], (result) => {
            resolve(result.huggingfaceApiKey);
        });
    });
}

async function summarizeText(text) {
    console.log('Content script: Starting API call to summarize text');
    const apiKey = await getApiKey();
    
    if (!apiKey) {
        throw new Error('API key not found. Please set up your Hugging Face API key in the extension settings.');
    }
    
    let retries = 0;
    let lastError = null;
    
    while (retries < API_CONFIG.maxRetries) {
        try {
            console.log(`Content script: API call attempt ${retries + 1}/${API_CONFIG.maxRetries}`);
            
            const response = await fetch(API_CONFIG.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: text,
                    parameters: {
                        max_length: API_CONFIG.maxTokens,
                        temperature: API_CONFIG.temperature,
                        top_p: API_CONFIG.topP,
                        repetition_penalty: API_CONFIG.repetitionPenalty
                    }
                })
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit reached. Please try again in a few minutes.');
                } else if (response.status === 403) {
                    throw new Error('API key is invalid or has insufficient permissions.');
                } else {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            
            if (!data || !data[0] || !data[0].summary_text) {
                throw new Error('Unexpected response format from API');
            }
            
            console.log('Content script: API call successful');
            return data[0].summary_text;
            
        } catch (error) {
            console.error(`Content script: API call attempt ${retries + 1} failed:`, error);
            lastError = error;
            
            if (error.message.includes('Rate limit')) {
                // For rate limit errors, wait longer between retries
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * (retries + 1)));
            } else if (error.message.includes('API key')) {
                // Don't retry if API key is invalid
                break;
            } else {
                // For other errors, wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
            }
            
            retries++;
        }
    }
    
    throw lastError || new Error('Failed to generate summary after multiple attempts');
}

// Main function to handle text selection and summary creation
async function handleTextSelection(selectedText) {
    console.log('Content script: Handling text selection:', selectedText.substring(0, 50) + '...');
    
    // Avoid duplicate injection
    if (document.getElementById('ai-summary-box')) {
        console.log('Content script: Summary box already exists, removing old one');
        const existingBox = document.getElementById('ai-summary-box');
        existingBox?.remove();
    }

    try {
        // Create and setup UI components
        const summaryBox = new SummaryBox();
        const summaryBoxElement = summaryBox.createSummaryBox(selectedText);
        const closeButton = summaryBox.createCloseButton();

        // Add elements to the page
        summaryBoxElement.appendChild(closeButton);
        document.body.appendChild(summaryBoxElement);

        // Setup event listeners
        summaryBox.setupEventListeners();

        // Fetch and update summary
        console.log('Content script: Fetching summary from API');
        const summary = await summarizeText(selectedText);
        summaryBox.updateSummary(summary);
        console.log('Content script: Summary updated in UI');
        
    } catch (error) {
        console.error('Content script: Error in handleTextSelection:', error);
        let errorMessage = 'An error occurred while generating the summary.';
        
        if (error.message.includes('403') || error.message.includes('API key')) {
            errorMessage = 'Your Hugging Face API key is invalid or has insufficient permissions. Please check your API key in the extension settings.';
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
            errorMessage = 'Hugging Face API rate limit reached. Please try again in a few minutes.';
        } else if (error.message.includes('API key not found')) {
            errorMessage = 'Please set up your Hugging Face API key in the extension settings.';
        } else if (error.message.includes('Unexpected response format')) {
            errorMessage = 'Received an unexpected response from the API. Please try again.';
        }
        
        showError(errorMessage);
        const summaryBox = document.getElementById('ai-summary-box');
        if (summaryBox) {
            summaryBox.innerHTML = `<div style="color: #ff4444;">Failed to generate summary: ${errorMessage}</div>`;
        }
    }
}

// Listen for messages from the background script
console.log('Content script: Setting up message listener');
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script: Received message:', message);
    if (message.type === 'SUMMARIZE_TEXT') {
        handleTextSelection(message.text);
        sendResponse({ success: true });
    }
    return true;
});

// Notify background script that content script is loaded
console.log('Content script: Sending CONTENT_SCRIPT_LOADED message');
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED' }); 