/**
 * Exam Integrity Module
 * 
 * Responsibilities:
 * - Enforce fullscreen mode
 * - Detect tab switching and window blur
 * - Log integrity violations
 * - Trigger auto-submission on threshold exceeded
 * 
 * @version 1.2.0
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
        isReentering: false, // NEW: Track if we're re-entering fullscreen
        isSubmitting: false  // NEW: Track if we're in submission process
    };

    let _callbacks = {
        onViolation: [],
        onAutoSubmit: []
    };

    // Event handler references for cleanup
    let _handlers = {};

    /**
     * Show warning alert to user
     * @param {string} type - Type of violation
     * @param {number} count - Current violation count
     * @param {number} max - Maximum allowed violations
     */
    function _showWarning(type, count, max) {
        if (!_config.enableWarnings) return;

        let message = '';
        const remaining = max - count;

        switch (type) {
            case 'fullscreen-exit':
                if (count >= max) {
                    message = '⚠️ EXAM TERMINATED\n\nYou have exited fullscreen too many times.\nYour exam will now be auto-submitted.';
                } else {
                    message = `⚠️ WARNING #${count}\n\nYou must remain in fullscreen mode during the exam.\n\nViolations remaining before auto-submission: ${remaining}`;
                }
                break;
            case 'tab-switch':
                if (count >= max) {
                    message = '⚠️ EXAM TERMINATED\n\nYou have switched tabs too many times.\nYour exam will now be auto-submitted.';
                } else {
                    message = `⚠️ WARNING #${count}\n\nYou must not switch tabs during the exam.\n\nViolations remaining before auto-submission: ${remaining}`;
                }
                break;
            case 'window-blur':
                if (count >= max) {
                    message = '⚠️ EXAM TERMINATED\n\nYou have lost focus too many times.\nYour exam will now be auto-submitted.';
                } else {
                    message = `⚠️ WARNING #${count}\n\nYou must keep the exam window in focus.\n\nViolations remaining before auto-submission: ${remaining}`;
                }
                break;
        }

        if (message) {
            alert(message);
        }
    }

    /**
     * Force return to fullscreen after exit
     */
    function _enforceFullscreen() {
        // Prevent re-entry loop
        if (_state.isReentering || _state.isSubmitting) {
            console.debug('[Integrity] Skipping fullscreen re-entry (already re-entering or submitting)');
            return;
        }

        _state.isReentering = true;

        // Small delay to allow the exit to complete before re-requesting
        setTimeout(() => {
            if (_state.isActive && !_state.isSubmitting) {
                console.log('[Integrity] Re-requesting fullscreen after violation');

                const el = _config.containerElement;
                const rfs = el.requestFullscreen ||
                    el.webkitRequestFullscreen ||
                    el.mozRequestFullScreen ||
                    el.msRequestFullscreen;

                if (rfs) {
                    rfs.call(el)
                        .then(() => {
                            console.log('[Integrity] Successfully re-entered fullscreen');
                            _state.isReentering = false;
                        })
                        .catch(err => {
                            console.error('Error re-entering fullscreen:', err);
                            _state.isReentering = false;
                        });
                } else {
                    _state.isReentering = false;
                }
            } else {
                _state.isReentering = false;
            }
        }, 200);
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

        // Debounce violations (prevent duplicate events within 1000ms)
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

        // Show warning
        _showWarning(type, _state.violations, _config.violationThreshold);

        // Notify subscribers
        _callbacks.onViolation.forEach(cb => cb(violationEntry, _state.violations, _config.violationThreshold));

        // For fullscreen exits, force back to fullscreen (unless already at threshold)
        if (type === 'fullscreen-exit' && !thresholdExceeded) {
            _enforceFullscreen();
        }

        // Check for auto-submit AFTER warning shown
        if (_config.autoSubmitOnViolation && thresholdExceeded) {
            _triggerAutoSubmit();
        }
    }

    /**
     * Trigger auto-submission
     */
    function _triggerAutoSubmit() {
        if (!_state.isActive || _state.isSubmitting) return;

        console.warn('Integrity Violation Threshold Exceeded. Triggering Auto-Submit.');

        _state.isSubmitting = true;
        _state.isActive = false; // Deactivate immediately

        // Call all auto-submit callbacks
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
        // Remove existing if any
        _removeListeners();

        // 1. Visibility Change (Tab Switch)
        _handlers.visibilityChange = () => {
            console.debug(`[Integrity] visibilitychange event. hidden: ${document.hidden}`);
            if (document.hidden && !_state.isSubmitting) {
                _logViolation('tab-switch');
            }
        };
        document.addEventListener('visibilitychange', _handlers.visibilityChange);

        // 2. Window Blur (Alt+Tab or losing focus)
        _handlers.blur = (e) => {
            console.debug(`[Integrity] blur event. document.hidden: ${document.hidden}`);
            // Only log blur if document is NOT hidden (separate from tab switches)
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

            // Only log violation if:
            // 1. User EXITED fullscreen
            // 2. We're not currently in the re-entry process
            // 3. We're not submitting
            if (!isInFullscreen && _state.isActive && !_state.isReentering && !_state.isSubmitting) {
                console.debug('[Integrity] User exited fullscreen - logging violation');
                _logViolation('fullscreen-exit');
            } else if (isInFullscreen && _state.isReentering) {
                // Successfully re-entered, clear the flag
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
        /**
         * Initialize the integrity module
         * @param {Object} config - Configuration options
         */
        init: function (config = {}) {
            _config = { ..._config, ...config };

            // Clean up any existing session
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

        /**
         * Request fullscreen mode
         * Must be called in response to a user action
         */
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

        /**
         * Get current violation stats
         * @returns {Object} { count, log }
         */
        getViolations: function () {
            return {
                count: _state.violations,
                log: [..._state.violationLog] // Return copy
            };
        },

        /**
         * Register a callback for violations
         * @param {Function} callback - (violation, count, max) => {}
         */
        onViolation: function (callback) {
            if (typeof callback === 'function') {
                _callbacks.onViolation.push(callback);
            }
        },

        /**
         * Register a callback for auto-submission trigger
         * @param {Function} callback - () => {}
         */
        onAutoSubmit: function (callback) {
            if (typeof callback === 'function') {
                _callbacks.onAutoSubmit.push(callback);
            }
        },

        /**
         * Toggle strict mode
         * @param {Boolean} isStrict 
         */
        setStrictMode: function (isStrict) {
            _config.strictMode = !!isStrict;
        },

        /**
         * Manually trigger a violation (for testing)
         * @param {string} type - Violation type
         */
        triggerViolation: function (type) {
            _logViolation(type);
        },

        /**
         * Check if module is currently in submission state
         * @returns {boolean}
         */
        isSubmitting: function () {
            return _state.isSubmitting;
        },

        /**
         * Cleanup and destroy module instance
         */
        destroy: function () {
            if (_state.isActive) {
                console.log('Destroying Integrity Module...');
                _state.isActive = false;
            }

            _removeListeners();

            // Clear callbacks
            _callbacks = {
                onViolation: [],
                onAutoSubmit: []
            };

            console.log('Integrity Module Destroyed');
        }
    };
})();

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrityModule;
} else {
    window.IntegrityModule = IntegrityModule;
}