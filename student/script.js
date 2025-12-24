/**
 * SchoolCBT Student Exam Logic
 * Version: 1.0
 */

// STATE MANAGEMENT
const state = {
    student: {
        name: '',
        seatNumber: '',
        class: '',
        subject: ''
    },
    exam: null,      // Loaded JSON object
    currentQIndex: 0,
    answers: {},     // { questionId: "A" }
    timeLeft: 0,     // Seconds
    timerId: null,
    isSubmitted: false,
    timing: {
        startedAt: null,
        submittedAt: null,
        durationAllowed: 0
    }
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

// --- SHARED VALIDATOR INIT ---
try {
    if (typeof Validator !== 'undefined' && typeof window.ajv2020 !== 'undefined' && typeof examSchema !== 'undefined') {
        // ajv2020 is set by ajv-adapter, or we can look for Ajv
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
// Fetch list of exams from ../exams/manifest.json
function loadManifest() {
    const manifestUrl = '../exams/manifest.json';

    fetch(manifestUrl)
        .then(response => {
            if (!response.ok) throw new Error("Failed to load exam catalog.");
            return response.json();
        })
        .then(data => {
            const select = DOM.login.examSelect;
            select.innerHTML = '<option value="" disabled selected>Select an Exam...</option>';

            data.forEach(exam => {
                const option = document.createElement('option');
                option.value = exam.filename; // We'll fetch this relative to ../exams/
                option.textContent = exam.title;
                select.appendChild(option);
            });

            select.disabled = false;
            DOM.login.examLoadingHint.hidden = true;
        })
        .catch(err => {
            console.error(err);
            DOM.login.examLoadingHint.textContent = "Error loading exams. Please contact admin.";
            DOM.login.examLoadingHint.style.color = "red";
        });
}

// Auto-load manifest
loadManifest();

function handleLogin(e) {
    e.preventDefault();

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
                // validation error already shown by validateExam
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
    // Shared Validator Integration
    if (typeof Validator !== 'undefined' && typeof Validator.validate === 'function') {
        const result = Validator.validate(json, 'exam');
        if (!result.valid) {
            const msg = Validator.formatErrors(result.errors);
            console.error("Exam Validation Failed:", result.errors);
            // Use replace regex to start nicely
            showError("Invalid Exam File:\n" + msg);
            return false;
        }
        return true;
    }

    // Fallback Basic Check if Validator missing
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

    // Create a copy of state without the timer ID
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
        // Robust Check: Ensure valid structure and non-empty student name
        const isValidSession =
            parsed &&
            parsed.exam &&
            parsed.exam.examId &&
            parsed.student &&
            typeof parsed.student.name === 'string' &&
            parsed.student.name.trim().length > 0;

        if (isValidSession) {
            // Non-blocking Alert on Login Screen
            const alertBox = document.getElementById('resume-alert');
            const alertName = document.getElementById('resume-alert-name');
            const btnResume = document.getElementById('btn-resume-trigger');
            const btnDismiss = document.getElementById('btn-resume-dismiss'); // NEW

            if (alertBox && alertName && btnResume) {
                // Safety check for metadata
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

                // NEW: Dismiss Handler
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
    // Restore State
    state.student = savedState.student;
    state.exam = savedState.exam;
    state.currentQIndex = savedState.currentQIndex || 0;
    state.answers = savedState.answers || {};
    state.timeLeft = savedState.timeLeft;
    state.timing = savedState.timing;

    // UI Setup (similar to startExam but using restored values)
    updateHeader();
    renderPalette();
    loadQuestion(state.currentQIndex);
    startTimer();

    // Setup Integrity if needed
    if (typeof IntegrityModule !== 'undefined') {
        IntegrityModule.init({
            autoSubmitOnViolation: state.exam.settings.autoSubmitOnViolation || false,
            violationThreshold: state.exam.settings.violationThreshold || 3,
            strictMode: state.exam.settings.strictMode || false
        });
        IntegrityModule.onAutoSubmit(() => {
            submitExam(true, 'auto-violation');
        });
    }

    // Switch Screens
    DOM.screens.login.classList.remove('active');
    DOM.screens.exam.classList.add('active');
}

// --- EXAM LOGIC ---

function startExam(examData) {
    state.exam = examData;
    state.answers = {};
    state.currentQIndex = 0;

    // Initialize Metadata
    state.student.subject = examData.metadata.subject;

    // Timer Setup (Minutes -> Seconds)
    const duration = examData.settings.duration || 30;
    state.timeLeft = duration * 60;
    state.timing.durationAllowed = duration;
    state.timing.startedAt = new Date().toISOString();

    // Initialize Integrity Module (per CTR-003)
    if (typeof IntegrityModule !== 'undefined') {
        IntegrityModule.init({
            autoSubmitOnViolation: examData.settings.autoSubmitOnViolation || false,
            violationThreshold: examData.settings.violationThreshold || 3,
            strictMode: examData.settings.strictMode || false
        });

        // Register auto-submit callback
        IntegrityModule.onAutoSubmit(() => {
            submitExam(true, 'auto-violation');
        });
    }

    // Configure Sheets Submitter (if webhook URL provided)
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

    // Switch Screens
    DOM.screens.login.classList.remove('active');
    DOM.screens.exam.classList.add('active');

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
    updateTimerDisplay(); // Initial draw
    state.timerId = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();

        // Save state every 5 seconds to minimize disk writes but stay relatively fresh
        if (state.timeLeft % 5 === 0) {
            saveActiveState();
        }

        if (state.timeLeft <= 0) {
            clearInterval(state.timerId);
            submitExam(true); // Auto submit
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(state.timeLeft / 60);
    const s = state.timeLeft % 60;
    DOM.exam.timer.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    // Warning color
    if (state.timeLeft < 300) { // < 5 mins
        DOM.exam.timer.parentElement.style.backgroundColor = '#ef4444'; // Red
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
    const currentAnswer = state.answers[q.questionId]; // Get saved answer if any

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

    // If last question -> Show Finish, Hide Next
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

    // Update Stats
    updateStats();

    // Re-render options to show selection
    loadQuestion(state.currentQIndex);
    renderPalette(); // Update answered status dot
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
    // Simply move next without error, logic handled by loadQuestion
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

        // Add classes
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
    // Easier to just re-render to keep sync simple
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
    if (state.isSubmitted) return; // Prevent double submission

    state.isSubmitted = true;
    clearInterval(state.timerId);
    DOM.modal.overlay.hidden = true;
    clearActiveState(); // Wipe persistence on formal submission

    // Set submission timestamp
    state.timing.submittedAt = new Date().toISOString();

    // Determine submission type
    let finalSubmissionType = submissionType;
    if (isAuto && submissionType === 'manual') {
        finalSubmissionType = 'auto-timeout';
    }

    // CALCULATION & BUILD ANSWERS ARRAY
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

    // Calculate percentage
    const percentage = totalObtainable > 0 ?
        Math.round((score / totalObtainable) * 10000) / 100 : 0;

    // Determine pass/fail
    const passMark = state.exam.settings.passMark || 50;
    const passed = percentage >= passMark;

    // Calculate duration used (in minutes)
    const durationUsed = Math.ceil(
        (state.timing.durationAllowed * 60 - state.timeLeft) / 60
    );

    // Get integrity data
    let integrityData = { violations: 0, violationLog: [] };
    if (typeof IntegrityModule !== 'undefined') {
        const violations = IntegrityModule.getViolations();
        integrityData = {
            violations: violations.count,
            violationLog: violations.log
        };
        IntegrityModule.destroy(); // Cleanup
    }

    // BUILD RESULT OBJECT (per results.schema.json)
    const resultObject = {
        submissionId: typeof SheetsSubmitter !== 'undefined' ?
            SheetsSubmitter.generateSubmissionId() :
            `SUB-${Date.now()}`,
        version: "1.0.0",
        student: {
            fullName: state.student.name,
            registrationNumber: state.student.seatNumber, // Map Seat No -> Reg No
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
                // Store locally as backup
                localStorage.setItem(
                    `exam_result_${resultObject.submissionId}`,
                    JSON.stringify(resultObject)
                );
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

    // Switch Screens
    DOM.screens.exam.classList.remove('active');
    DOM.screens.result.classList.add('active');
}

// AUTO-START DETECTION
initResumeDetection();
