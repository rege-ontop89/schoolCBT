/**
 * Parser Module
 * Converts Word-pasted text into exam JSON structure
 */

const Parser = (function () {
    'use strict';

    /**
     * Parse metadata section from text
     * @param {string} text - Full input text
     * @returns {object} Metadata object
     */
    function parseMetadata(text) {
        const metadata = {};
        const settings = {};

        // Split by separator to get header section
        const parts = text.split('---');
        if (parts.length < 2) {
            throw new Error('Invalid format: Missing "---" separator between metadata and questions');
        }

        const headerSection = parts[0].trim();
        const lines = headerSection.split('\n');

        // Parse each metadata line
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) {
                throw new Error(`Invalid metadata line: "${trimmed}". Expected format: KEY: value`);
            }

            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();

            // Map to appropriate fields
            switch (key) {
                case 'EXAM_ID':
                    metadata.examId = value;
                    break;
                case 'TITLE':
                    metadata.title = value;
                    break;
                case 'SUBJECT':
                    metadata.subject = value;
                    break;
                case 'CLASS':
                    metadata.class = value;
                    break;
                case 'TERM':
                    metadata.term = value;
                    break;
                case 'ACADEMIC_YEAR':
                    metadata.academicYear = value;
                    break;
                case 'DURATION':
                    settings.duration = parseInt(value, 10);
                    break;
                case 'TOTAL_MARKS':
                    settings.totalMarks = parseInt(value, 10);
                    break;
                case 'PASS_MARK':
                    settings.passMark = parseInt(value, 10);
                    break;
                case 'SHUFFLE_QUESTIONS':
                    settings.shuffleQuestions = value.toLowerCase() === 'true';
                    break;
                case 'SHUFFLE_OPTIONS':
                    settings.shuffleOptions = value.toLowerCase() === 'true';
                    break;
                case 'SHOW_RESULTS':
                    settings.showResults = value.toLowerCase() === 'true';
                    break;
                case 'ALLOW_REVIEW':
                    settings.allowReview = value.toLowerCase() === 'true';
                    break;
                case 'CREATED_BY':
                    metadata.createdBy = value;
                    break;
                case 'INSTRUCTIONS':
                    metadata.instructions = value;
                    break;
                default:
                    console.warn(`Unknown metadata key: ${key}`);
            }
        }

        return { metadata, settings };
    }

    /**
     * Parse questions section from text
     * @param {string} text - Full input text
     * @returns {array} Array of question objects
     */
    function parseQuestions(text) {
        const parts = text.split('---');
        if (parts.length < 2) {
            throw new Error('Invalid format: Missing "---" separator');
        }

        const questionsSection = parts[1].trim();

        // Split by question numbers (e.g., "1.", "2.", etc.)
        const questionBlocks = questionsSection.split(/\n(?=\d+\.\s)/);

        const questions = [];

        for (const block of questionBlocks) {
            const trimmed = block.trim();
            if (!trimmed) continue;

            try {
                const question = parseQuestion(trimmed);
                questions.push(question);
            } catch (error) {
                throw new Error(`Error parsing question: ${error.message}`);
            }
        }

        return questions;
    }

    /**
     * Parse individual question block
     * @param {string} block - Single question text block
     * @returns {object} Question object
     */
    function parseQuestion(block) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length < 7) {
            throw new Error('Question block too short. Expected: question text, 4 options, ANSWER, MARKS');
        }

        // Extract question number and text
        const firstLine = lines[0];
        const match = firstLine.match(/^(\d+)\.\s+(.+)$/);
        if (!match) {
            throw new Error(`Invalid question format: "${firstLine}". Expected: "1. Question text?"`);
        }

        const questionNumber = parseInt(match[1], 10);
        const questionText = match[2];

        // Extract options
        const options = {};
        let optionIndex = 1;

        for (const optionKey of ['A', 'B', 'C', 'D']) {
            if (optionIndex >= lines.length) {
                throw new Error(`Question ${questionNumber}: Missing option ${optionKey}`);
            }

            const optionLine = lines[optionIndex];
            const optionMatch = optionLine.match(/^([A-D])\.\s+(.+)$/);

            if (!optionMatch || optionMatch[1] !== optionKey) {
                throw new Error(`Question ${questionNumber}: Expected option ${optionKey}, got "${optionLine}"`);
            }

            options[optionKey] = optionMatch[2];
            optionIndex++;
        }

        // Extract answer
        const answerLine = lines[optionIndex];
        const answerMatch = answerLine.match(/^ANSWER:\s*([A-D])$/);
        if (!answerMatch) {
            throw new Error(`Question ${questionNumber}: Invalid ANSWER line. Expected "ANSWER: A/B/C/D", got "${answerLine}"`);
        }
        const correctAnswer = answerMatch[1];

        // Extract marks
        const marksLine = lines[optionIndex + 1];
        const marksMatch = marksLine.match(/^MARKS:\s*(\d+)$/);
        if (!marksMatch) {
            throw new Error(`Question ${questionNumber}: Invalid MARKS line. Expected "MARKS: number", got "${marksLine}"`);
        }
        const marks = parseInt(marksMatch[1], 10);

        // Generate question ID (Q001, Q002, etc.)
        const questionId = `Q${String(questionNumber).padStart(3, '0')}`;

        return {
            questionId,
            questionNumber,
            questionText,
            options,
            correctAnswer,
            marks
        };
    }

    /**
     * Generate complete exam JSON from parsed components
     * @param {string} text - Full input text
     * @returns {object} Complete exam JSON
     */
    function parseExam(text) {
        if (!text || !text.trim()) {
            throw new Error('Input text is empty');
        }

        // Parse metadata and settings
        const { metadata, settings } = parseMetadata(text);

        // Parse questions
        const questions = parseQuestions(text);

        // Validate we have questions
        if (questions.length === 0) {
            throw new Error('No questions found in input');
        }

        // Build complete exam object
        const exam = {
            examId: metadata.examId,
            version: '1.0.0',
            metadata: {
                title: metadata.title,
                subject: metadata.subject,
                class: metadata.class,
                term: metadata.term,
                academicYear: metadata.academicYear,
                createdAt: new Date().toISOString()
            },
            settings: {
                duration: settings.duration,
                totalMarks: settings.totalMarks,
                passMark: settings.passMark,
                shuffleQuestions: settings.shuffleQuestions,
                shuffleOptions: settings.shuffleOptions
            },
            questions
        };

        // Add optional fields if present
        if (metadata.createdBy) {
            exam.metadata.createdBy = metadata.createdBy;
        }
        if (metadata.instructions) {
            exam.metadata.instructions = metadata.instructions;
        }
        if (settings.showResults !== undefined) {
            exam.settings.showResults = settings.showResults;
        }
        if (settings.allowReview !== undefined) {
            exam.settings.allowReview = settings.allowReview;
        }

        return exam;
    }

    // Public API
    return {
        parseExam,
        parseMetadata,
        parseQuestions,
        parseQuestion
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Parser;
} else if (typeof window !== 'undefined') {
    window.Parser = Parser;
}
