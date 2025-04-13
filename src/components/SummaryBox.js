import CONFIG from '../js/config.js';

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

export default SummaryBox; 