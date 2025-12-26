/**
* SchoolCBT Student Exam Logic
* Version: 1.0 - FIXED v2
*/

// STATE MANAGEMENT
import { loadExamFromURL } from "./exam-loader.js";

const state = {
    student: {
        name: '',
        seatNumber: '',
        class: '',
        subject: ''
    },
    exam: null,
    currentQIndex: 0,
    answers: {},
    timeLeft: 0,
    timerId: null,
    isSubmitted: false,
    timing: {
        startedAt: null,
        submittedAt: null,
        durationAllowed: 0
    },
    examStartedManually: false
};

// DOM ELEMENTS
const DOM = {
    screens: {
        login: document.getElementById('login-screen'),
        exam: document.getElementById('exam-screen'),
        result: document.getElementById('result-screen')
    },
    login: {
        form: document.getElementById('details-form'),
        inputName: document.getElementById('student-name'),
        inputClass: document.getElementById('student-class'),
        inputSeat: document.getElementById('student-seat'),
        examSelect: document.getElementById('exam-select'),
        examLoadingHint: document.getElementById('exam-loading-hint'),
        errorMsg: document.getElementById('login-error')
    },
    exam: {
        displayName: document.getElementById('display-name'),
        subject: document.getElementById('exam-subject'),
        className: document.getElementById('exam-class'),
        timer: document.getElementById('timer-text'),
        progressBar: document.getElementById('progress-bar-fill'),
        qNum: document.getElementById('current-q-num'),
        qTotal: document.getElementById('total-q-num'),
        text: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options-container'),
        answeredCount: document.getElementById('answered-count'),
        unansweredCount: document.getElementById('unanswered-count'),
        palette: document.getElementById('question-palette'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnSkip: document.getElementById('btn-skip'),
        btnFinish: document.getElementById('btn-finish')
    },
    modal: {
        overlay: document.getElementById('modal-overlay'),
        warning: document.getElementById('modal-warning'),
        unansweredCount: document.getElementById('modal-unanswered'),
        btnCancel: document.getElementById('btn-modal-cancel'),
        btnConfirm: document.getElementById('btn-modal-confirm')
    },
    results: {
        name: document.getElementById('res-student-name'),
        subject: document.getElementById('res-subject'),
        total: document.getElementById('res-total'),
        score: document.getElementById('res-score')
    },
};

// PERSISTENCE SETTINGS
const STORAGE_KEY = 'school_cbt_active_session';

// --- UTILITY FUNCTIONS ---
/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Shuffle question options while tracking correct answer
 */
function shuffleOptions(options, correctAnswer) {
    const optionKeys = ['A', 'B', 'C', 'D'];
    const optionPairs = optionKeys.map(key => ({ key, value: options[key] }));
    const shuffled = shuffleArray(optionPairs);

    const newOptions = {};
    let newCorrectAnswer = correctAnswer;

    shuffled.forEach((pair, index) => {
        const newKey = optionKeys[index];
        newOptions[newKey] = pair.value;

        // Track where the correct answer moved to
        if (pair.key === correctAnswer) {
            newCorrectAnswer = newKey;
        }
    });

    return { options: newOptions, correctAnswer: newCorrectAnswer };
}

// --- SHARED VALIDATOR INIT ---
try {
    if (typeof Validator !== 'undefined' && typeof window.ajv2020 !== 'undefined' && typeof examSchema !== 'undefined') {
        const AjvConstructor = window.Ajv || window.ajv2020;
        if (AjvConstructor) {
            Validator.init(AjvConstructor, examSchema);
            console.log("Shared Validator initialized.");
        } else {
            console.warn("Ajv constructor not found.");
        }
    } else if (typeof Validator !== 'undefined' && typeof window.Ajv !== 'undefined' && typeof examSchema !== 'undefined') {
        Validator.init(window.Ajv, examSchema);
        console.log("Shared Validator initialized (standard Ajv).");
    }
} catch (e) {
    console.warn("Validator Init Failed:", e);
}

// --- INITIALIZATION & LOGIN ---
DOM.login.form.addEventListener('submit', handleLogin);

// --- MANIFEST LOADING ---
let manifestData = []; // Store full manifest for filtering

function loadManifest() {
    const manifestUrl = '../exams/manifest.json';
    fetch(manifestUrl)
        .then(response => {
            if (!response.ok) throw new Error("Failed to load exam catalog.");
            return response.json();
        })
        .then(data => {
            manifestData = data;
            DOM.login.examLoadingHint.textContent = "Select your class to see available exams";
            DOM.login.examLoadingHint.style.color = "#6b7280";
            DOM.login.examLoadingHint.hidden = false;
        })
        .catch(err => {
            console.error(err);
            DOM.login.examLoadingHint.textContent = "Error loading exams. Please contact admin.";
            DOM.login.examLoadingHint.style.color = "red";
        });
}

function filterExamsByClass(selectedClass) {
    const select = DOM.login.examSelect;

    if (!selectedClass) {
        select.innerHTML = '<option value="" disabled selected>Select your class first</option>';
        select.disabled = true;
        return;
    }

    // Filter exams by class
    const filteredExams = manifestData.filter(exam =>
        exam.active !== false && exam.class === selectedClass
    );

    select.innerHTML = '<option value="" disabled selected>Select an Exam...</option>';

    if (filteredExams.length === 0) {
        select.innerHTML = '<option value="" disabled selected>No exams available for your class</option>';
        select.disabled = true;
        DOM.login.examLoadingHint.textContent = "No exams available for " + selectedClass;
        DOM.login.examLoadingHint.style.color = "#dc2626";
        DOM.login.examLoadingHint.hidden = false;
    } else {
        filteredExams.forEach(exam => {
            const option = document.createElement('option');
            option.value = exam.filename;
            option.textContent = exam.title;
            select.appendChild(option);
        });
        select.disabled = false;
        DOM.login.examLoadingHint.textContent = `${filteredExams.length} exam(s) available for ${selectedClass}`;
        DOM.login.examLoadingHint.style.color = "#059669";
        DOM.login.examLoadingHint.hidden = false;
    }
}

// Auto-load manifest
loadManifest();

// Listen for class selection changes
DOM.login.inputClass.addEventListener('change', (e) => {
    filterExamsByClass(e.target.value);
});

function handleLogin(e) {
    e.preventDefault();

    state.examStartedManually = true;

    // Request fullscreen immediately to capture user gesture
    if (typeof IntegrityModule !== 'undefined') {
        IntegrityModule.requestFullscreen();
    }

    // 1. Capture User Details
    state.student.name = DOM.login.inputName.value.trim();
    state.student.seatNumber = DOM.login.inputSeat.value.trim();
    state.student.class = DOM.login.inputClass.value;

    // 2. Load Selected Exam
    const filename = DOM.login.examSelect.value;
    if (!filename) {
        showError("Please select an exam to start.");
        return;
    }

    // Show loading state
    const btn = DOM.login.form.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = "Loading Exam...";
    btn.disabled = true;

    fetch(`../exams/${filename}`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to download exam file.");
            return response.json();
        })
        .then(json => {
            if (validateExam(json)) {
                startExam(json);
            } else {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        })
        .catch(err => {
            showError("Failed to load exam: " + err.message);
            btn.textContent = originalText;
            btn.disabled = false;
        });
}

function showError(msg) {
    DOM.login.errorMsg.textContent = msg;
    DOM.login.errorMsg.hidden = false;
}

function validateExam(json) {
    if (typeof Validator !== 'undefined' && typeof Validator.validate === 'function') {
        const result = Validator.validate(json, 'exam');
        if (!result.valid) {
            const msg = Validator.formatErrors(result.errors);
            console.error("Exam Validation Failed:", result.errors);
            showError("Invalid Exam File:\n" + msg);
            return false;
        }
        return true;
    }

    console.warn("Shared Validator not loaded. Performing basic check.");
    if (!json.examId || !json.questions || !Array.isArray(json.questions)) {
        showError("Invalid Exam File: Missing required fields (examId, questions).");
        return false;
    }
    return true;
}

// --- PERSISTENCE LOGIC ---
function saveActiveState() {
    if (!state.exam || state.isSubmitted) return;

    const dataToSave = {
        student: state.student,
        exam: state.exam,
        currentQIndex: state.currentQIndex,
        answers: state.answers,
        timeLeft: state.timeLeft,
        timing: state.timing
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

function clearActiveState() {
    localStorage.removeItem(STORAGE_KEY);
}

function initResumeDetection() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        const isValidSession =
            parsed &&
            parsed.exam &&
            parsed.exam.examId &&
            parsed.student &&
            typeof parsed.student.name === 'string' &&
            parsed.student.name.trim().length > 0;

        if (isValidSession) {
            const alertBox = document.getElementById('resume-alert');
            const alertName = document.getElementById('resume-alert-name');
            const btnResume = document.getElementById('btn-resume-trigger');
            const btnDismiss = document.getElementById('btn-resume-dismiss');

            if (alertBox && alertName && btnResume) {
                const subject = parsed.exam.metadata ? parsed.exam.metadata.subject : 'Unknown Subject';
                alertName.textContent = `${parsed.student.name} - ${subject}`;
                alertBox.hidden = false;

                btnResume.onclick = () => {
                    try {
                        resumeExam(parsed);
                    } catch (err) {
                        console.error("Failed to resume:", err);
                        alert("Failed to resume exam. Data might be corrupted. Starting new.");
                        clearActiveState();
                        location.reload();
                    }
                };

                if (btnDismiss) {
                    btnDismiss.onclick = () => {
                        if (confirm("Are you sure? This will delete your unsaved progress.")) {
                            clearActiveState();
                            alertBox.hidden = true;
                        }
                    };
                }
            }
        } else {
            console.warn("Found incomplete/corrupted session. Clearing.");
            clearActiveState();
        }
    } catch (e) {
        console.error("Error parsing saved state:", e);
        clearActiveState();
    }
}

function resumeExam(savedState) {
    state.examStartedManually = true;

    // Restore State
    state.student = savedState.student;
    state.exam = savedState.exam;
    state.currentQIndex = savedState.currentQIndex || 0;
    state.answers = savedState.answers || {};
    state.timeLeft = savedState.timeLeft;
    state.timing = savedState.timing;

    // UI Setup
    updateHeader();
    renderPalette();
    loadQuestion(state.currentQIndex);
    startTimer();

    // Setup Integrity
    if (typeof IntegrityModule !== 'undefined') {
        IntegrityModule.init({
            autoSubmitOnViolation: state.exam.settings.autoSubmitOnViolation || true, // Default to TRUE
            violationThreshold: state.exam.settings.violationThreshold || 3,
            strictMode: state.exam.settings.strictMode || false
        });
        IntegrityModule.onAutoSubmit(() => {
            console.log('[Main] Auto-submit triggered by integrity module (resume)');
            setTimeout(() => {
                submitExam(true, 'auto-violation');
            }, 500);
        });
    }

    // CRITICAL FIX: Properly switch screens
    switchToScreen('exam');
}

// --- SCREEN SWITCHING HELPER (NEW) ---
function switchToScreen(screenName) {
    // Remove active class from all screens
    DOM.screens.login.classList.remove('active');
    DOM.screens.exam.classList.remove('active');
    DOM.screens.result.classList.remove('active');

    // Add hidden attribute to all screens
    DOM.screens.login.setAttribute('hidden', '');
    DOM.screens.exam.setAttribute('hidden', '');
    DOM.screens.result.setAttribute('hidden', '');

    // Show the target screen
    const targetScreen = DOM.screens[screenName];
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.removeAttribute('hidden'); // CRITICAL: Remove the hidden attribute
    }
}

// --- EXAM LOGIC ---
function startExam(examData) {
    state.exam = examData;
    state.answers = {};
    state.currentQIndex = 0;

    // Shuffle questions if enabled
    if (examData.settings.shuffleQuestions) {
        state.exam.questions = shuffleArray([...examData.questions]);
        console.log('[Exam] Questions shuffled for this student');
    }

    // Shuffle options if enabled
    if (examData.settings.shuffleOptions) {
        state.exam.questions = state.exam.questions.map(q => {
            const shuffledOptions = shuffleOptions(q.options, q.correctAnswer);
            return { ...q, options: shuffledOptions.options, correctAnswer: shuffledOptions.correctAnswer };
        });
        console.log('[Exam] Options shuffled for each question');
    }

    // Initialize Metadata
    state.student.subject = examData.metadata.subject;

    // Timer Setup
    const duration = examData.settings.duration || 30;
    state.timeLeft = duration * 60;
    state.timing.durationAllowed = duration;
    state.timing.startedAt = new Date().toISOString();

    // Initialize Integrity Module
    if (typeof IntegrityModule !== 'undefined') {
        IntegrityModule.init({
            autoSubmitOnViolation: examData.settings.autoSubmitOnViolation || true, // Default to TRUE
            violationThreshold: examData.settings.violationThreshold || 3,
            strictMode: examData.settings.strictMode || false
        });
        IntegrityModule.onAutoSubmit(() => {
            console.log('[Main] Auto-submit triggered by integrity module');
            // Force submit immediately
            setTimeout(() => {
                submitExam(true, 'auto-violation');
            }, 500); // Small delay to let alert close
        });
    }

    // Configure Sheets Submitter
    if (typeof SheetsSubmitter !== 'undefined' && examData.settings.webhookUrl) {
        SheetsSubmitter.configure({
            webhookUrl: examData.settings.webhookUrl
        });
    }

    // UI Setup
    updateHeader();
    renderPalette();
    loadQuestion(0);
    startTimer();

    // CRITICAL FIX: Use new screen switching function
    switchToScreen('exam');

    // Save initial state
    saveActiveState();
}

function updateHeader() {
    DOM.exam.displayName.textContent = state.student.name;
    DOM.exam.className.textContent = state.student.class;
    DOM.exam.subject.textContent = state.exam.metadata.subject;
    DOM.exam.qTotal.textContent = state.exam.questions.length;
}

function startTimer() {
    updateTimerDisplay();
    state.timerId = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();

        if (state.timeLeft % 5 === 0) {
            saveActiveState();
        }

        if (state.timeLeft <= 0) {
            clearInterval(state.timerId);
            submitExam(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(state.timeLeft / 60);
    const s = state.timeLeft % 60;
    DOM.exam.timer.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    if (state.timeLeft < 300) {
        DOM.exam.timer.parentElement.style.backgroundColor = '#ef4444';
    }
}

// --- QUESTION NAVIGATION ---
function loadQuestion(index) {
    if (index < 0 || index >= state.exam.questions.length) return;

    state.currentQIndex = index;
    const q = state.exam.questions[index];

    // Update Counters
    DOM.exam.qNum.textContent = index + 1;

    // Progress Bar
    const percent = ((index + 1) / state.exam.questions.length) * 100;
    DOM.exam.progressBar.style.width = `${percent}%`;

    // Render Text
    DOM.exam.text.textContent = q.questionText;

    // Render Options
    DOM.exam.optionsContainer.innerHTML = '';
    const currentAnswer = state.answers[q.questionId];

    ['A', 'B', 'C', 'D'].forEach(optKey => {
        if (q.options[optKey]) {
            const el = document.createElement('div');
            el.className = `option-item ${currentAnswer === optKey ? 'selected' : ''}`;
            el.onclick = () => selectOption(q.questionId, optKey);
            el.innerHTML = `
                <div class="option-label">${optKey}</div>
                <div class="option-content">${q.options[optKey]}</div>
            `;
            DOM.exam.optionsContainer.appendChild(el);
        }
    });

    // Update Buttons
    DOM.exam.btnPrev.disabled = index === 0;

    if (index === state.exam.questions.length - 1) {
        DOM.exam.btnNext.classList.add('hidden');
        DOM.exam.btnFinish.classList.remove('hidden');
    } else {
        DOM.exam.btnNext.classList.remove('hidden');
        DOM.exam.btnFinish.classList.add('hidden');
    }

    updatePaletteActive();
    saveActiveState();
}

function selectOption(qId, optKey) {
    if (state.isSubmitted) return;

    state.answers[qId] = optKey;
    updateStats();
    loadQuestion(state.currentQIndex);
    renderPalette();
    saveActiveState();
}

function updateStats() {
    const total = state.exam.questions.length;
    const answered = Object.keys(state.answers).length;
    const unanswered = total - answered;

    DOM.exam.answeredCount.textContent = answered;
    DOM.exam.unansweredCount.textContent = unanswered;
}

// --- NAVIGATION CONTROLLERS ---
DOM.exam.btnPrev.addEventListener('click', () => {
    loadQuestion(state.currentQIndex - 1);
});

DOM.exam.btnNext.addEventListener('click', () => {
    loadQuestion(state.currentQIndex + 1);
});

DOM.exam.btnSkip.addEventListener('click', () => {
    loadQuestion(state.currentQIndex + 1);
});

DOM.exam.btnFinish.addEventListener('click', () => {
    promptSubmit();
});

// --- PALETTE ---
function renderPalette() {
    DOM.exam.palette.innerHTML = '';
    state.exam.questions.forEach((q, i) => {
        const dot = document.createElement('div');
        dot.className = 'nav-dot';
        dot.textContent = i + 1;

        if (state.answers[q.questionId]) {
            dot.classList.add('answered');
        }
        if (i === state.currentQIndex) {
            dot.classList.add('active-question');
        }

        dot.onclick = () => loadQuestion(i);
        DOM.exam.palette.appendChild(dot);
    });
}

function updatePaletteActive() {
    renderPalette();
}

// --- SUBMISSION ---
function promptSubmit() {
    const total = state.exam.questions.length;
    const answered = Object.keys(state.answers).length;
    const unanswered = total - answered;

    if (unanswered > 0) {
        DOM.modal.unansweredCount.textContent = unanswered;
        DOM.modal.warning.hidden = false;
    } else {
        DOM.modal.warning.hidden = true;
    }

    DOM.modal.overlay.hidden = false;
}

DOM.modal.btnCancel.addEventListener('click', () => {
    DOM.modal.overlay.hidden = true;
});

DOM.modal.btnConfirm.addEventListener('click', () => {
    submitExam(false);
});

function submitExam(isAuto, submissionType = 'manual') {
    // Prevent multiple submissions
    if (state.isSubmitted) {
        console.log('[Main] Submission already in progress, ignoring duplicate call');
        return;
    }

    console.log(`[Main] Starting exam submission. isAuto: ${isAuto}, type: ${submissionType}`);

    state.isSubmitted = true;
    clearInterval(state.timerId);
    DOM.modal.overlay.hidden = true;
    clearActiveState();

    state.timing.submittedAt = new Date().toISOString();

    let finalSubmissionType = submissionType;
    if (isAuto && submissionType === 'manual') {
        finalSubmissionType = 'auto-timeout';
    }

    // CALCULATION
    let score = 0;
    let totalObtainable = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const answersArray = state.exam.questions.map(q => {
        const selected = state.answers[q.questionId] || null;
        const marks = q.marks || 1;
        totalObtainable += marks;
        const isCorrect = selected === q.correctAnswer;
        const marksAwarded = isCorrect ? marks : 0;

        if (selected === null) {
            unansweredCount++;
        } else if (isCorrect) {
            correctCount++;
            score += marks;
        } else {
            wrongCount++;
        }

        return {
            questionId: q.questionId,
            selectedOption: selected,
            isCorrect: isCorrect,
            marksAwarded: marksAwarded
        };
    });

    const percentage = totalObtainable > 0 ? Math.round((score / totalObtainable) * 10000) / 100 : 0;
    const passMark = state.exam.settings.passMark || 50;
    const passed = percentage >= passMark;
    const durationUsed = Math.ceil((state.timing.durationAllowed * 60 - state.timeLeft) / 60);

    let integrityData = { violations: 0, violationLog: [] };
    if (typeof IntegrityModule !== 'undefined') {
        const violations = IntegrityModule.getViolations();
        integrityData = {
            violations: violations.count,
            violationLog: violations.log
        };
        IntegrityModule.destroy();
    }

    const resultObject = {
        submissionId: typeof SheetsSubmitter !== 'undefined' ? SheetsSubmitter.generateSubmissionId() : `SUB-${Date.now()}`,
        version: "1.0.0",
        student: {
            fullName: state.student.name,
            registrationNumber: state.student.seatNumber,
            class: state.student.class
        },
        exam: {
            examId: state.exam.examId,
            title: state.exam.metadata.title,
            subject: state.exam.metadata.subject,
            term: state.exam.metadata.term,
            academicYear: state.exam.metadata.academicYear
        },
        answers: answersArray,
        scoring: {
            totalQuestions: state.exam.questions.length,
            attemptedQuestions: state.exam.questions.length - unansweredCount,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            unansweredQuestions: unansweredCount,
            totalMarks: totalObtainable,
            obtainedMarks: score,
            percentage: percentage,
            passed: passed
        },
        timing: {
            startedAt: state.timing.startedAt,
            submittedAt: state.timing.submittedAt,
            durationAllowed: state.timing.durationAllowed,
            durationUsed: durationUsed
        },
        submission: {
            type: finalSubmissionType,
            clientTimestamp: new Date().toISOString()
        },
        integrity: integrityData
    };

    // Submit to Google Sheets
    if (typeof SheetsSubmitter !== 'undefined') {
        SheetsSubmitter.submit(resultObject).then(response => {
            console.log('Sheets submission result:', response);
            if (!response.success) {
                console.warn('Sheets submission failed:', response.error);
                localStorage.setItem(`exam_result_${resultObject.submissionId}`, JSON.stringify(resultObject));
            }
        }).catch(err => {
            console.error('Sheets submission error:', err);
        });
    }

    // DISPLAY RESULTS
    DOM.results.name.textContent = state.student.name;
    DOM.results.subject.textContent = state.student.subject;
    DOM.results.total.textContent = state.exam.questions.length;

    if (state.exam.settings.showResults) {
        DOM.results.score.textContent = `${score} / ${totalObtainable}`;
    } else {
        DOM.results.score.textContent = "Submitted (Hidden)";
    }

    // CRITICAL FIX: Use new screen switching function
    switchToScreen('result');
}

// --- AUTO EXAM LOAD VIA URL ---
document.addEventListener("DOMContentLoaded", () => {
    if (state.examStartedManually) {
        console.log("Exam started manually, skipping URL auto-load");
        return;
    }

    loadExamFromURL(
        (examData) => {
            console.log("Exam loaded via URL:", examData);

            if (!validateExam(examData)) {
                return;
            }

            // Use proper screen switching
            switchToScreen('exam');
            startExam(examData);
        },
        (errorMessage) => {
            console.log("No exam auto-loaded via URL:", errorMessage);
            initResumeDetection();
        }
    );
});