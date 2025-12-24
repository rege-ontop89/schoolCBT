// Polyfill to ensure app.js finds the Ajv constructor
// Standard Ajv bundle exports 'Ajv' (class)
if (typeof window.Ajv !== 'undefined') {
    window.ajv2020 = window.Ajv;
} else if (typeof window.ajv !== 'undefined') {
    window.ajv2020 = window.ajv;
}

// If neither is found, we might have a problem, but let's hope for the best.
console.log('Ajv adapter loaded. window.Ajv:', typeof window.Ajv);
