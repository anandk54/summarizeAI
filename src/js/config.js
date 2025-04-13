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

export default CONFIG; 