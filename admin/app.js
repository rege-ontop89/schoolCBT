/**
 * Admin Tool Application Controller
 * Coordinates UI, parsing, and validation
 */

const App = (function () {
    'use strict';

    // DOM elements
    let inputTextarea;
    let parseButton;
    let downloadButton;
    let clearButton;
    let loadSampleButton;
    let messageDiv;
    let previewDiv;
    let previewContent;
    let togglePreviewButton;

    // State
    let currentExamData = null;

    /**
     * Initialize the application
     */
    function init() {
        // Get DOM elements
        inputTextarea = document.getElementById('input-text');
        parseButton = document.getElementById('parse-btn');
        downloadButton = document.getElementById('download-btn');
        clearButton = document.getElementById('clear-btn');
        loadSampleButton = document.getElementById('load-sample-btn');
        messageDiv = document.getElementById('message');
        previewDiv = document.getElementById('preview');
        previewContent = document.getElementById('preview-content');
        togglePreviewButton = document.getElementById('toggle-preview');

        // Attach event listeners
        parseButton.addEventListener('click', handleParse);
        downloadButton.addEventListener('click', handleDownload);
        clearButton.addEventListener('click', handleClear);
        loadSampleButton.addEventListener('click', handleLoadSample);
        togglePreviewButton.addEventListener('click', handleTogglePreview);

        // Initialize download button as disabled
        downloadButton.disabled = true;

        // Load exam schema and initialize validator
        loadSchema();
    }

    /**
     * Load exam schema and initialize validator
     */
    async function loadSchema() {
        try {
            // Check if schema is loaded via script tag
            if (!window.examSchema) {
                throw new Error('Exam schema not found. Ensure schemas/exam_schema.js is loaded.');
            }

            const examSchema = window.examSchema;

            // Initialize validator with Ajv from CDN
            if (window.Validator) {
                Validator.init(window.ajv2020, examSchema);
                showMessage('Ready to parse exam questions', 'info');
            } else {
                throw new Error('Validator module not loaded');
            }
        } catch (error) {
            showMessage(`Failed to load schema: ${error.message}`, 'error');
        }
    }

    /**
     * Handle parse button click
     */
    function handleParse() {
        const inputText = inputTextarea.value.trim();

        if (!inputText) {
            showMessage('Please enter exam questions in the text area', 'error');
            return;
        }

        try {
            // Parse the input text
            const examData = Parser.parseExam(inputText);

            // Validate against schema
            const validation = Validator.validate(examData, 'exam');

            if (!validation.valid) {
                const errorMsg = 'Validation failed:\n' + Validator.formatErrors(validation.errors);
                showMessage(errorMsg, 'error');
                currentExamData = null;
                downloadButton.disabled = true;
                return;
            }

            // Success!
            currentExamData = examData;
            downloadButton.disabled = false;

            // Show preview
            previewContent.textContent = JSON.stringify(examData, null, 2);
            previewDiv.classList.remove('hidden');

            showMessage(
                `✓ Successfully parsed ${examData.questions.length} question(s). Exam ID: ${examData.examId}`,
                'success'
            );

        } catch (error) {
            showMessage(`Parse error: ${error.message}`, 'error');
            currentExamData = null;
            downloadButton.disabled = true;
        }
    }

    /**
     * Handle download button click
     */
    function handleDownload() {
        if (!currentExamData) {
            showMessage('No exam data to download. Please parse first.', 'error');
            return;
        }

        try {
            // Convert to JSON string
            const jsonString = JSON.stringify(currentExamData, null, 2);

            // Create blob and download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create temporary link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentExamData.examId}.json`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showMessage(
                `✓ Downloaded ${currentExamData.examId}.json. Save it to the /exams/ folder.`,
                'success'
            );

        } catch (error) {
            showMessage(`Download error: ${error.message}`, 'error');
        }
    }

    /**
     * Handle clear button click
     */
    function handleClear() {
        if (confirm('Are you sure you want to clear all data?')) {
            inputTextarea.value = '';
            currentExamData = null;
            downloadButton.disabled = true;
            previewDiv.classList.add('hidden');
            previewContent.textContent = '';
            showMessage('Form cleared', 'info');
        }
    }

    /**
     * Handle load sample button click
     */
    async function handleLoadSample() {
        if (window.SAMPLE_INPUT_TEXT) {
            inputTextarea.value = window.SAMPLE_INPUT_TEXT;
            showMessage('Sample input loaded. Click "Parse & Validate" to process.', 'info');
        } else {
            showMessage('Failed to load sample: Sample text not found in index.html', 'error');
        }
    }

    /**
     * Handle toggle preview button click
     */
    function handleTogglePreview() {
        previewDiv.classList.toggle('collapsed');
        const isCollapsed = previewDiv.classList.contains('collapsed');
        togglePreviewButton.textContent = isCollapsed ? '▼ Show Preview' : '▲ Hide Preview';
    }

    /**
     * Show message to user
     * @param {string} text - Message text
     * @param {string} type - Message type: 'success', 'error', 'info'
     */
    function showMessage(text, type = 'info') {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');

        // Auto-hide info messages after 5 seconds
        if (type === 'info') {
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
        }
    }

    // Public API
    return {
        init
    };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
