/**
 * SchoolCBT Sheets Submission Module
 * Handles result submission to Google Sheets via Apps Script webhook
 * 
 * @version 1.0.0
 * @author Sheets Integration Agent
 */

const SheetsSubmitter = (function () {
    // Configuration - Must be set before use
    let _config = {
        webhookUrl: '', // Google Apps Script Web App URL
        maxRetries: 3,
        retryDelay: 2000 // ms
    };

    /**
     * Configure the submitter
     * @param {Object} config - { webhookUrl: string }
     */
    function configure(config) {
        if (config.webhookUrl) {
            _config.webhookUrl = config.webhookUrl;
        }
        if (config.maxRetries !== undefined) {
            _config.maxRetries = config.maxRetries;
        }
    }

    /**
     * Generate unique submission ID
     * Format: SUB-YYYYMMDD-RANDOM
     */
    function generateSubmissionId() {
        const now = new Date();
        const datePart = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 6; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return `SUB-${datePart}-${randomPart}`;
    }

    /**
     * Submit result to Google Sheets
     * @param {Object} resultData - Data conforming to results.schema.json
     * @returns {Promise<Object>} - { success, submissionId, timestamp, error }
     */
    async function submit(resultData) {
        if (!_config.webhookUrl) {
            return {
                success: false,
                submissionId: resultData.submissionId,
                timestamp: new Date().toISOString(),
                error: 'Webhook URL not configured. Results saved locally only.'
            };
        }

        let lastError = null;

        for (let attempt = 1; attempt <= _config.maxRetries; attempt++) {
            try {
                const response = await fetch(_config.webhookUrl, {
                    method: 'POST',
                    mode: 'no-cors', // Google Apps Script requires this
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(resultData)
                });

                // With no-cors, we can't read the response, but if no error, consider success
                return {
                    success: true,
                    submissionId: resultData.submissionId,
                    timestamp: new Date().toISOString(),
                    error: null
                };

            } catch (error) {
                lastError = error;
                console.warn(`Submission attempt ${attempt} failed:`, error);

                if (attempt < _config.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, _config.retryDelay));
                }
            }
        }

        return {
            success: false,
            submissionId: resultData.submissionId,
            timestamp: new Date().toISOString(),
            error: `Network error after ${_config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
        };
    }

    // Public API
    return {
        configure,
        generateSubmissionId,
        submit
    };
})();

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SheetsSubmitter;
} else {
    window.SheetsSubmitter = SheetsSubmitter;
}
