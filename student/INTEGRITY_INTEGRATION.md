# Exam Integrity Module Integration Guide

This guide explains how to integrate the client-side integrity module into the Student UI.

## Overview

The `IntegrityModule` enforces fullscreen mode and monitors for:
- Tab switching
- Window blur
- Fullscreen exit events

It provides a simple API to track violations and trigger callbacks (e.g., warnings or auto-submission).

## Quick Start

1. **Include the script:**

```html
<script src="student/exam-integrity.js"></script>
```

2. **Initialize when exam starts:**

```javascript
// Start monitoring when the student clicks "Start Exam"
IntegrityModule.init({
    autoSubmitOnViolation: true,
    violationThreshold: 3
});

// Request fullscreen (must be user-triggered)
IntegrityModule.requestFullscreen();
```

3. **Listen for violations:**

```javascript
IntegrityModule.onViolation((violation, count, max) => {
    alert(`Warning: ${violation.type} detected! (${count}/${max})`);
});
```

## API Reference

### `IntegrityModule.init(config)`

Initializes the module with the provided configuration.

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `containerElement` | Element | `document.documentElement` | Element to make fullscreen |
| `autoSubmitOnViolation` | Boolean | `false` | Trigger auto-submit callback on threshold |
| `violationThreshold` | Number | `3` | Number of violations before auto-submit |
| `enableWarnings` | Boolean | `true` | (Currently used for internal logging) |
| `strictMode` | Boolean | `false` | Log violation on fullscreen exit immediately |

### `IntegrityModule.requestFullscreen()`

Requests fullscreen mode for the configured container.
> [!IMPORTANT]
> **Consumer Gesture Required:** This method **must** be called from a user interaction event handler (click, submit, keypress) to work. If there is an asynchronous step (like `JSON.parse` or a `fetch`) between the user's click and the fullscreen request, the browser may block it due to a "transient activation" timeout.
>
> **Best Practice:** Call it as the very first line of your interaction handler.

### `IntegrityModule.getViolations()`

Returns the current integrity state.

**Returns:**
```javascript
{
    count: 2,
    log: [
        { type: "tab-switch", timestamp: "2025-12-22T14:00:01.000Z" },
        { type: "window-blur", timestamp: "2025-12-22T14:00:05.000Z" }
    ]
}
```

### `IntegrityModule.onViolation(callback)`

Register a callback to run whenever a violation is detected.

**Callback Signature:**
`(violation, count, max) => void`

### `IntegrityModule.onAutoSubmit(callback)`

Register a callback to run when the violation threshold is reached (if configured).

**Callback Signature:**
`() => void`

### `IntegrityModule.destroy()`

Stops monitoring, removes event listeners, and clears callbacks. Call this when the exam ends or is submitted.

## Best Practices

1. **Warn Early:** Explain to students that fullscreen is required and navigating away will be logged.
2. **Handle Gracefully:** Do not interrupt the exam flow aggressively; use non-blocking toasts or warnings.
3. **Save Data:** Always include `IntegrityModule.getViolations()` data in the final result submission object.

## Result Schema Integration

When constructing the final result object:

```javascript
const finalResult = {
    // ... other fields ...
    integrity: {
        violations: IntegrityModule.getViolations().count,
        violationLog: IntegrityModule.getViolations().log
    }
};
```
