import CONFIG from './config.js';

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
                // Wait a bit and retry once
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.summarizeText(text);
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
            console.error('Summarization error:', error);
            throw error;
        }
    }
}

export default new SummarizationAPI(); 