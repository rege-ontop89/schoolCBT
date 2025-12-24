/**
 * submission.js
 * Handles the submission of exam results to the Google Apps Script endpoint.
 */

/**
 * Submits the exam result payload to the configured Google Sheet.
 * @param {Object} payload - The strictly typed result object matching results.schema.json.
 * @param {string} scriptUrl - The Web App URL of the deployed Google Apps Script.
 * @returns {Promise<Object>} - The response from the server (success or error).
 */
export async function submitExamResult(payload, scriptUrl) {
    if (!scriptUrl) {
        throw new Error("Submission URL is not configured.");
    }

    // We use mode: 'no-cors' for "Opaque Transmission".
    // This allows the request to reach Google Apps Script even if the 302 redirect logic
    // triggers browser CORS blocks on the response reading.
    // LIMITATION: We cannot read the response body or status code (it will be 0).
    // We assume success if the network request doesn't throw an exception.
    const options = {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
        headers: {
            "Content-Type": "text/plain;charset=utf-8",
        },
    };

    try {
        await fetch(scriptUrl, options);

        // In no-cors, we can't check response.ok or response.json().
        // If we get here, the request was sent successfully.
        return { result: 'success', note: 'Opaque transmission (assumed delivered)' };

    } catch (error) {
        console.error("Submission failed (Network Error):", error);
        throw error; // Re-throw to let the UI handle the failure (e.g., show retry button)
    }
}
