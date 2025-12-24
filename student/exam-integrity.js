/**
 * Exam Integrity Module
 * 
 * Responsibilities:
 * - Enforce fullscreen mode
 * - Detect tab switching and window blur
 * - Log integrity violations
 * - Trigger auto-submission on threshold exceeded
 * 
 * @version 1.0.0
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
        lastViolationTime: 0
    };

    let _callbacks = {
        onViolation: [],
        onAutoSubmit: []
    };

    // Event handler references for cleanup
    let _handlers = {};

    /**
     * Log a violation and trigger callbacks
     * @param {string} type - 'tab-switch' | 'window-blur' | 'fullscreen-exit'
     */
    function _logViolation(type) {
        console.debug(`[Integrity] Attempting to log violation: ${type}. isActive: ${_state.isActive}`);
        if (!_state.isActive) return;

        // Debounce violations (prevent duplicate events within 500ms)
        const now = Date.now();
        if (now - _state.lastViolationTime < 500) return;
        _state.lastViolationTime = now;

        _state.violations++;

        const violationEntry = {
            type: type,
            timestamp: new Date().toISOString()
        };

        _state.violationLog.push(violationEntry);

        console.warn(`Integrity Violation: ${type} (${_state.violations}/${_config.violationThreshold})`);

        // Notify subscribers
        _callbacks.onViolation.forEach(cb => cb(violationEntry, _state.violations, _config.violationThreshold));

        // Check for auto-submit
        if (_config.autoSubmitOnViolation && _state.violations >= _config.violationThreshold) {
            _triggerAutoSubmit();
        }
    }

    /**
     * Trigger auto-submission
     */
    function _triggerAutoSubmit() {
        if (!_state.isActive) return;

        console.warn('Integrity Violation Threshold Exceeded. Triggering Auto-Submit.');
        _callbacks.onAutoSubmit.forEach(cb => cb());

        // Optional: deactivate after auto-submit trigger to prevent flood
        _state.isActive = false;
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
            if (document.hidden) {
                _logViolation('tab-switch');
            }
        };
        document.addEventListener('visibilitychange', _handlers.visibilityChange);

        // 2. Window Blur (Alt+Tab or losing focus)
        _handlers.blur = (e) => {
            console.debug(`[Integrity] blur event. document.hidden: ${document.hidden}`);
            // Log blur if the document is NOT hidden (to separate from tab switches)
            // or if it's a window-level blur.
            if (!document.hidden) {
                _logViolation('window-blur');
            }
        };
        window.addEventListener('blur', _handlers.blur);

        // 3. Fullscreen Change
        _handlers.fullscreenChange = () => {
            if (!document.fullscreenElement &&
                !document.webkitFullscreenElement &&
                !document.mozFullScreenElement &&
                !document.msFullscreenElement) {

                // If strict mode is on, log violation immediately
                if (_config.strictMode) {
                    _logViolation('fullscreen-exit');
                } else {
                    // Otherwise just warn or re-request (handled by UI)
                    // We still log it for the record usually, but let's stick to contract
                    _logViolation('fullscreen-exit');
                }
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
                lastViolationTime: 0
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
         * toggle strict mode
         * @param {Boolean} isStrict 
         */
        setStrictMode: function (isStrict) {
            _config.strictMode = !!isStrict;
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
