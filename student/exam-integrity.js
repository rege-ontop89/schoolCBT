/**
 * Exam Integrity Module
 * 
 * Responsibilities:
 * - Enforce fullscreen mode
 * - Detect tab switching and window blur
 * - Log integrity violations
 * - Trigger auto-submission on threshold exceeded
 * 
 * @version 1.3.0
 * @author Exam Integrity & Control Agent
 */

const IntegrityModule = (function () {
    // Private state
    let _config = {
        containerElement: document.documentElement,
        autoSubmitOnViolation: false,
        violationThreshold: 3,
        enableWarnings: true,
        strictMode: false
    };

    let _state = {
        violations: 0,
        violationLog: [],
        isActive: false,
        lastViolationTime: 0,
        isReentering: false,
        isSubmitting: false
    };

    let _callbacks = {
        onViolation: [],
        onAutoSubmit: []
    };

    // Event handler references for cleanup
    let _handlers = {};

    // Warning modal elements
    let _warningModal = null;

    /**
     * Create custom warning modal (non-blocking alternative to alert)
     */
    function _createWarningModal() {
        if (_warningModal) return;

        const modalHTML = `
            <div id="integrity-warning-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 500px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                ">
                    <div style="
                        font-size: 48px;
                        margin-bottom: 1rem;
                    ">⚠️</div>
                    <h2 id="integrity-warning-title" style="
                        margin: 0 0 1rem 0;
                        color: #dc2626;
                        font-size: 1.5rem;
                        font-weight: 600;
                    ">Warning</h2>
                    <p id="integrity-warning-message" style="
                        margin: 0 0 1.5rem 0;
                        color: #374151;
                        line-height: 1.6;
                        font-size: 1rem;
                    "></p>
                    <button id="integrity-warning-btn" style="
                        background: #dc2626;
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#b91c1c'" 
                       onmouseout="this.style.background='#dc2626'">
                        Continue Exam
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        _warningModal = {
            container: document.getElementById('integrity-warning-modal'),
            title: document.getElementById('integrity-warning-title'),
            message: document.getElementById('integrity-warning-message'),
            button: document.getElementById('integrity-warning-btn')
        };
    }

    /**
     * Show custom warning modal
     * @param {string} type - Type of violation
     * @param {number} count - Current violation count
     * @param {number} max - Maximum allowed violations
     * @param {Function} onClose - Callback when modal closes
     */
    function _showWarning(type, count, max, onClose) {
        if (!_config.enableWarnings) {
            if (onClose) onClose();
            return;
        }

        _createWarningModal();

        let title = '';
        let message = '';
        const remaining = max - count;

        switch (type) {
            case 'fullscreen-exit':
                if (count >= max) {
                    title = 'EXAM TERMINATED';
                    message = 'You have exited fullscreen too many times. Your exam will now be auto-submitted.';
                } else {
                    title = `WARNING #${count}`;
                    message = `You must remain in fullscreen mode during the exam.\n\nViolations remaining before auto-submission: ${remaining}`;
                }
                break;
            case 'tab-switch':
                if (count >= max) {
                    title = 'EXAM TERMINATED';
                    message = 'You have switched tabs too many times. Your exam will now be auto-submitted.';
                } else {
                    title = `WARNING #${count}`;
                    message = `You must not switch tabs during the exam.\n\nViolations remaining before auto-submission: ${remaining}`;
                }
                break;
            case 'window-blur':
                if (count >= max) {
                    title = 'EXAM TERMINATED';
                    message = 'You have lost focus too many times. Your exam will now be auto-submitted.';
                } else {
                    title = `WARNING #${count}`;
                    message = `You must keep the exam window in focus.\n\nViolations remaining before auto-submission: ${remaining}`;
                }
                break;
        }

        _warningModal.title.textContent = title;
        _warningModal.message.textContent = message;
        _warningModal.container.style.display = 'flex';

        // Handle button click
        const handleClick = () => {
            _warningModal.container.style.display = 'none';
            _warningModal.button.removeEventListener('click', handleClick);
            if (onClose) onClose();
        };

        _warningModal.button.addEventListener('click', handleClick);
    }

    /**
     * Force return to fullscreen after exit
     */
    function _enforceFullscreen() {
        if (_state.isReentering || _state.isSubmitting) {
            console.debug('[Integrity] Skipping fullscreen re-entry (already re-entering or submitting)');
            return;
        }

        _state.isReentering = true;

        console.log('[Integrity] Requesting fullscreen re-entry');

        const el = _config.containerElement;
        const rfs = el.requestFullscreen ||
            el.webkitRequestFullscreen ||
            el.mozRequestFullScreen ||
            el.msRequestFullscreen;

        if (rfs) {
            rfs.call(el)
                .then(() => {
                    console.log('[Integrity] Successfully re-entered fullscreen');
                    setTimeout(() => {
                        _state.isReentering = false;
                    }, 500);
                })
                .catch(err => {
                    console.error('Error re-entering fullscreen:', err);
                    _state.isReentering = false;
                });
        } else {
            _state.isReentering = false;
        }
    }

    /**
     * Log a violation and trigger callbacks
     * @param {string} type - 'tab-switch' | 'window-blur' | 'fullscreen-exit'
     */
    function _logViolation(type) {
        console.debug(`[Integrity] Attempting to log violation: ${type}. isActive: ${_state.isActive}, isReentering: ${_state.isReentering}`);

        if (!_state.isActive || _state.isSubmitting) return;

        // Skip if we're re-entering fullscreen (prevents loop)
        if (_state.isReentering && type === 'fullscreen-exit') {
            console.debug('[Integrity] Skipping fullscreen-exit log during re-entry');
            return;
        }

        // Debounce violations
        const now = Date.now();
        if (now - _state.lastViolationTime < 1000) {
            console.debug('[Integrity] Violation debounced (too soon after last)');
            return;
        }
        _state.lastViolationTime = now;

        _state.violations++;

        const violationEntry = {
            type: type,
            timestamp: new Date().toISOString()
        };

        _state.violationLog.push(violationEntry);

        console.warn(`Integrity Violation: ${type} (${_state.violations}/${_config.violationThreshold})`);

        // Check if threshold exceeded
        const thresholdExceeded = _state.violations >= _config.violationThreshold;

        // Notify subscribers
        _callbacks.onViolation.forEach(cb => cb(violationEntry, _state.violations, _config.violationThreshold));

        // For fullscreen exits, force back immediately (unless at threshold)
        if (type === 'fullscreen-exit' && !thresholdExceeded) {
            _enforceFullscreen();
            // Show warning with callback to ensure it's after fullscreen attempt
            setTimeout(() => {
                _showWarning(type, _state.violations, _config.violationThreshold);
            }, 100);
        } else {
            // For other violations or threshold exceeded, show warning immediately
            if (thresholdExceeded) {
                _showWarning(type, _state.violations, _config.violationThreshold, () => {
                    // After user clicks OK on termination warning, trigger auto-submit
                    if (_config.autoSubmitOnViolation) {
                        _triggerAutoSubmit();
                    }
                });
            } else {
                _showWarning(type, _state.violations, _config.violationThreshold);
            }
        }

        // Check for auto-submit (for non-fullscreen violations)
        if (_config.autoSubmitOnViolation && thresholdExceeded && type !== 'fullscreen-exit') {
            // Delay handled by modal callback above
        }
    }

    /**
     * Trigger auto-submission
     */
    function _triggerAutoSubmit() {
        if (!_state.isActive || _state.isSubmitting) return;

        console.warn('Integrity Violation Threshold Exceeded. Triggering Auto-Submit.');

        _state.isSubmitting = true;
        _state.isActive = false;

        _callbacks.onAutoSubmit.forEach(cb => {
            try {
                cb();
            } catch (err) {
                console.error('[Integrity] Error in auto-submit callback:', err);
            }
        });
    }

    /**
     * Internal helper to remove listeners
     */
    function _removeListeners() {
        if (_handlers.visibilityChange) {
            document.removeEventListener('visibilitychange', _handlers.visibilityChange);
        }
        if (_handlers.blur) {
            window.removeEventListener('blur', _handlers.blur);
        }
        if (_handlers.fullscreenChange) {
            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
                event => document.removeEventListener(event, _handlers.fullscreenChange)
            );
        }
        _handlers = {};
    }

    /**
     * Initialize event listeners
     */
    function _initListeners() {
        _removeListeners();

        // 1. Visibility Change (Tab Switch)
        _handlers.visibilityChange = () => {
            console.debug(`[Integrity] visibilitychange event. hidden: ${document.hidden}`);
            if (document.hidden && !_state.isSubmitting) {
                _logViolation('tab-switch');
            }
        };
        document.addEventListener('visibilitychange', _handlers.visibilityChange);

        // 2. Window Blur
        _handlers.blur = (e) => {
            console.debug(`[Integrity] blur event. document.hidden: ${document.hidden}`);
            if (!document.hidden && !_state.isSubmitting) {
                _logViolation('window-blur');
            }
        };
        window.addEventListener('blur', _handlers.blur);

        // 3. Fullscreen Change
        _handlers.fullscreenChange = () => {
            console.debug('[Integrity] fullscreenchange event fired');

            const isInFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );

            console.debug(`[Integrity] Currently in fullscreen: ${isInFullscreen}, isReentering: ${_state.isReentering}`);

            if (!isInFullscreen && _state.isActive && !_state.isReentering && !_state.isSubmitting) {
                console.debug('[Integrity] User exited fullscreen - logging violation');
                _logViolation('fullscreen-exit');
            } else if (isInFullscreen && _state.isReentering) {
                console.debug('[Integrity] Successfully re-entered fullscreen');
                _state.isReentering = false;
            }
        };

        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
            event => document.addEventListener(event, _handlers.fullscreenChange)
        );
    }

    // Public API
    return {
        init: function (config = {}) {
            _config = { ..._config, ...config };
            this.destroy();

            _state = {
                violations: 0,
                violationLog: [],
                isActive: true,
                lastViolationTime: 0,
                isReentering: false,
                isSubmitting: false
            };

            _initListeners();
            console.log('Integrity Module Initialized', _config);
        },

        requestFullscreen: function () {
            const el = _config.containerElement;
            const rfs = el.requestFullscreen ||
                el.webkitRequestFullscreen ||
                el.mozRequestFullScreen ||
                el.msRequestFullscreen;

            if (rfs) {
                rfs.call(el).catch(err => {
                    console.error('Error attempting to enable fullscreen:', err);
                });
            }
        },

        getViolations: function () {
            return {
                count: _state.violations,
                log: [..._state.violationLog]
            };
        },

        onViolation: function (callback) {
            if (typeof callback === 'function') {
                _callbacks.onViolation.push(callback);
            }
        },

        onAutoSubmit: function (callback) {
            if (typeof callback === 'function') {
                _callbacks.onAutoSubmit.push(callback);
            }
        },

        setStrictMode: function (isStrict) {
            _config.strictMode = !!isStrict;
        },

        triggerViolation: function (type) {
            _logViolation(type);
        },

        isSubmitting: function () {
            return _state.isSubmitting;
        },

        destroy: function () {
            if (_state.isActive) {
                console.log('Destroying Integrity Module...');
                _state.isActive = false;
            }

            _removeListeners();

            // Remove warning modal
            if (_warningModal && _warningModal.container) {
                _warningModal.container.remove();
                _warningModal = null;
            }

            _callbacks = {
                onViolation: [],
                onAutoSubmit: []
            };

            console.log('Integrity Module Destroyed');
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrityModule;
} else {
    window.IntegrityModule = IntegrityModule;
}