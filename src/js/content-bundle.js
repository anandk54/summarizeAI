// Configuration
const CONFIG = {
    API: {
        BASE_URL: 'https://api-inference.huggingface.co/models',
        MODEL: 'facebook/bart-large-cnn',
        ENDPOINTS: {
            SUMMARIZE: '/facebook/bart-large-cnn'
        }
    },
    UI: {
        SUMMARY_BOX: {
            WIDTH: '350px',
            MAX_HEIGHT: '400px',
            POSITION: {
                BOTTOM: '70px',
                RIGHT: '20px'
            }
        },
        TOGGLE_BUTTON: {
            POSITION: {
                BOTTOM: '20px',
                RIGHT: '20px'
            }
        }
    },
    STYLES: {
        SUMMARY_BOX: {
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5'
        },
        TOGGLE_BUTTON: {
            background: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        }
    }
};

// API Service
class SummarizationAPI {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL;
        this.model = CONFIG.API.MODEL;
        this.apiKey = null;
    }

    async getApiKey() {
        if (!this.apiKey) {
            const result = await chrome.storage.sync.get(['apiKey']);
            this.apiKey = result.apiKey;
            if (!this.apiKey) {
                throw new Error('API key not found. Please set up your Hugging Face API key in the extension settings.');
            }
        }
        return this.apiKey;
    }

    async summarizeText(text) {
        const maxRetries = 5;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                const apiKey = await this.getApiKey();
                const response = await fetch(`${this.baseURL}${CONFIG.API.ENDPOINTS.SUMMARIZE}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        inputs: text,
                        parameters: {
                            max_length: 130,
                            min_length: 30,
                            do_sample: false
                        }
                    })
                });

                if (response.status === 403) {
                    throw new Error('FORBIDDEN: Your API key may be invalid or have insufficient permissions. Please check your Hugging Face API key.');
                }

                if (response.status === 429) {
                    // Rate limit hit, wait and retry
                    const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retryCount++;
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Handle the response format from Hugging Face
                if (Array.isArray(data) && data.length > 0 && data[0].summary_text) {
                    return data[0].summary_text;
                } else {
                    throw new Error('Unexpected response format from API');
                }
            } catch (error) {
                console.error(`Attempt ${retryCount + 1} failed:`, error);
                
                // If it's a network error or rate limit, retry
                if (error.message.includes('429') || 
                    error.name === 'TypeError' || 
                    error.message.includes('Failed to fetch')) {
                    
                    if (retryCount < maxRetries - 1) {
                        const waitTime = Math.pow(2, retryCount) * 1000;
                        console.log(`Error occurred, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        retryCount++;
                        continue;
                    }
                }
                
                // For other errors or if we've exhausted retries, throw
                throw error;
            }
        }
        
        throw new Error('Maximum retry attempts reached. Please try again later.');
    }
}

// UI Components
class SummaryBox {
    constructor() {
        this.summaryBox = null;
        this.toggleButton = null;
        this.closeButton = null;
    }

    createToggleButton() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'ai-summary-toggle';
        toggleButton.innerText = '🧠 Summary';
        
        Object.assign(toggleButton.style, {
            position: 'fixed',
            bottom: CONFIG.UI.TOGGLE_BUTTON.POSITION.BOTTOM,
            right: CONFIG.UI.TOGGLE_BUTTON.POSITION.RIGHT,
            zIndex: 10000,
            padding: '10px 12px',
            ...CONFIG.STYLES.TOGGLE_BUTTON
        });

        this.toggleButton = toggleButton;
        return toggleButton;
    }

    createSummaryBox(selectedText) {
        const summaryBox = document.createElement('div');
        summaryBox.id = 'ai-summary-box';
        
        Object.assign(summaryBox.style, {
            position: 'fixed',
            bottom: CONFIG.UI.SUMMARY_BOX.POSITION.BOTTOM,
            right: CONFIG.UI.SUMMARY_BOX.POSITION.RIGHT,
            width: CONFIG.UI.SUMMARY_BOX.WIDTH,
            maxHeight: CONFIG.UI.SUMMARY_BOX.MAX_HEIGHT,
            overflowY: 'auto',
            padding: '15px 20px',
            zIndex: 9999,
            display: 'block',
            ...CONFIG.STYLES.SUMMARY_BOX
        });

        summaryBox.innerHTML = `
            <div style="margin-bottom: 10px;"><strong>Selected Text:</strong></div>
            <div style="font-style: italic; color: #555; background: #f9f9f9; padding: 8px; border-radius: 6px; margin-bottom: 15px;">
                ${selectedText}
            </div>
            <div><strong>Summary:</strong></div>
            <div id="summary-content" style="margin-top: 8px;">Loading summary...</div>
        `;

        this.summaryBox = summaryBox;
        return summaryBox;
    }

    createCloseButton() {
        const closeBtn = document.createElement('span');
        closeBtn.innerText = '✖';
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '8px',
            right: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#888'
        });
        closeBtn.title = 'Close';
        
        this.closeButton = closeBtn;
        return closeBtn;
    }

    setupEventListeners() {
        this.toggleButton.addEventListener('click', () => {
            const visible = this.summaryBox.style.display !== 'none';
            this.summaryBox.style.display = visible ? 'none' : 'block';
        });

        this.closeButton.addEventListener('click', () => {
            this.remove();
        });
    }

    remove() {
        this.summaryBox?.remove();
        this.toggleButton?.remove();
    }

    updateSummary(summaryText) {
        const summaryContent = document.getElementById('summary-content');
        if (summaryContent) {
            summaryContent.textContent = summaryText;
        }
    }
}

// Initialize API
const summarizationAPI = new SummarizationAPI();

// Main function to handle text selection and summary creation
async function handleTextSelection(selectedText) {
    console.log('Starting text selection handling');
    // Avoid duplicate injection
    if (document.getElementById('ai-summary-box')) {
        console.log('Summary box already exists, returning');
        return;
    }

    try {
        console.log('Creating UI components');
        // Create and setup UI components
        const summaryBox = new SummaryBox();
        const toggleButton = summaryBox.createToggleButton();
        const summaryBoxElement = summaryBox.createSummaryBox(selectedText);
        const closeButton = summaryBox.createCloseButton();

        // Add elements to the page
        document.body.appendChild(toggleButton);
        summaryBoxElement.appendChild(closeButton);
        document.body.appendChild(summaryBoxElement);

        // Setup event listeners
        summaryBox.setupEventListeners();

        console.log('Fetching summary from API');
        // Fetch and update summary
        const summary = await summarizationAPI.summarizeText(selectedText);
        console.log('Summary received:', summary);
        summaryBox.updateSummary(summary);
    } catch (error) {
        console.error('Error in handleTextSelection:', error);
        let errorMessage = 'An error occurred while generating the summary.';
        
        if (error.message.includes('403') || error.message.includes('FORBIDDEN')) {
            errorMessage = 'Your Hugging Face API key is invalid or has insufficient permissions. Please check your API key in the extension settings.';
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
            errorMessage = 'Hugging Face API rate limit reached. Please try again in a few minutes.';
        } else if (error.message.includes('API key')) {
            errorMessage = 'Please set up your Hugging Face API key in the extension settings.';
        } else if (error.message.includes('Maximum retry attempts')) {
            errorMessage = 'Unable to connect to Hugging Face API after multiple attempts. Please try again later.';
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

function showError(message, isRetrying = false) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10001;
    `;
    errorDiv.textContent = isRetrying ? `${message} Retrying...` : message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    if (message.type === 'SUMMARIZE_TEXT') {
        console.log('Received text to summarize:', message.text);
        handleTextSelection(message.text);
        sendResponse({ success: true });
    }
    return true;
});

// Notify background script that content script is loaded
console.log('Content script loaded and initialized');
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED' }); 