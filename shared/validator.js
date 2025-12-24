/**
 * Shared Validator Module (CTR-004)
 * Validates JSON data against exam.schema.json or results.schema.json
 */

const Validator = (function () {
  'use strict';

  // Ajv instance will be initialized when schemas are loaded
  let ajv = null;
  let examValidator = null;
  let resultsValidator = null;

  /**
   * Initialize the validator with Ajv and schemas
   * @param {object} Ajv - Ajv constructor from CDN
   * @param {object} examSchema - exam.schema.json
   * @param {object} resultsSchema - results.schema.json (optional)
   */
  function init(Ajv, examSchema, resultsSchema = null) {
    ajv = new Ajv({ allErrors: true, verbose: true, strict: false });

    // Add format validation
    if (typeof require !== 'undefined') {
      require('ajv-formats')(ajv);
    } else if (window.ajvFormats) {
      window.ajvFormats(ajv);
    } else {
      console.warn('ajv-formats not found. Format validation may be limited.');
    }

    examValidator = ajv.compile(examSchema);

    if (resultsSchema) {
      resultsValidator = ajv.compile(resultsSchema);
    }
  }

  /**
   * Validate data against specified schema
   * @param {object} data - Data to validate
   * @param {string} schemaType - 'exam' or 'results'
   * @returns {object} { valid: boolean, errors: array }
   */
  function validate(data, schemaType = 'exam') {
    if (!ajv) {
      return {
        valid: false,
        errors: [{
          path: '$',
          message: 'Validator not initialized. Call Validator.init() first.'
        }]
      };
    }

    const validator = schemaType === 'exam' ? examValidator : resultsValidator;

    if (!validator) {
      return {
        valid: false,
        errors: [{
          path: '$',
          message: `Schema type '${schemaType}' not loaded.`
        }]
      };
    }

    const valid = validator(data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    // Format errors for user-friendly display
    const errors = validator.errors.map(err => {
      let path = err.instancePath || '$';
      let message = err.message;

      // Add more context for common errors
      if (err.keyword === 'required') {
        message = `Missing required field: ${err.params.missingProperty}`;
      } else if (err.keyword === 'pattern') {
        message = `Invalid format: ${message}`;
      } else if (err.keyword === 'enum') {
        message = `Invalid value. Allowed values: ${err.params.allowedValues.join(', ')}`;
      } else if (err.keyword === 'additionalProperties') {
        message = `Additional property '${err.params.additionalProperty}' is not allowed`;
      }

      return { path, message };
    });

    return { valid: false, errors };
  }

  /**
   * Get detailed error messages as formatted string
   * @param {array} errors - Array of error objects
   * @returns {string} Formatted error message
   */
  function formatErrors(errors) {
    if (!errors || errors.length === 0) {
      return '';
    }

    return errors.map((err, index) =>
      `${index + 1}. ${err.path}: ${err.message}`
    ).join('\n');
  }

  // Public API
  return {
    init,
    validate,
    formatErrors
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validator;
} else if (typeof window !== 'undefined') {
  window.Validator = Validator;
}
