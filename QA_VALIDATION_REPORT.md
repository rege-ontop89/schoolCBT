# SchoolCBT QA & Constraint Validation Report

**Date:** 2025-12-22  
**Version:** 1.0.0  
**Status:** ⚠️ CONDITIONAL PASS (Pending Integrity Fixes)

---

## 1. Constraint Compliance Checklist

| ID | Constraint | Status | Evidence/Observation |
|:---|:---|:---:|:---|
| **C01** | **No Backend/Server** | ✅ PASS | All logic (Admin & Student) runs entirely in the browser. |
| **C02** | **No Database** | ✅ PASS | Data persistence is handled via JSON files and Google Sheets. |
| **C03** | **No Authentication** | ✅ PASS | System uses registration details for session identity; no login required. |
| **C04** | **No External Dependencies** | ✅ PASS | Uses vanilla HTML/CSS/JS. Admin tool uses Ajv (local script tags). |
| **C05** | **Objective Questions Only** | ✅ PASS | Schema and Parser strictly enforce MCQ format (A, B, C, D). |
| **C06** | **Google Sheets for Results** | ✅ PASS | Submission logic (Code.gs & sheets-submitter.js) is correctly implemented. |
| **C07** | **Schema Compliance** | ✅ PASS | Admin tool validates against `exam.schema.json`; results match `results.schema.json`. |

---

## 2. Functional Test Results

### 2.1 Admin Tool (Exam Builder)
- **Question Parsing**: ✅ **SUCCESS**. Correctly interprets Word-pasted content.
- **Validation**: ✅ **SUCCESS**. Correctly identifies missing answers, incorrect marks, and schema type mismatches.
- **Export**: ✅ **SUCCESS**. Generates valid JSON files with correct `examId` format.

### 2.2 Student UI (Exam Player)
- **Question Navigation**: ✅ **SUCCESS**. "Next", "Previous", and "Skip" work as intended.
- **Answer Persistence**: ✅ **SUCCESS**. Answers are preserved when navigating away and back to a question.
- **Timer Behavior**: ✅ **SUCCESS**. Countdown is accurate; timer turns red in final 5 minutes.
- **Auto-Submission**: ✅ **SUCCESS**. Exam automatically submits when timer reaching 00:00.
- **Score Calculation**: ✅ **SUCCESS**. Verified correct marks awarded for correct answers and zero for incorrect/skipped.
- **Result Object**: ✅ **SUCCESS**. Injected `submissionId`, `timing`, and `scoring` data are accurate.

### 2.3 Integrity Module
- **Fullscreen Enforcement**: ⚠️ **PARTIAL**. Requests fullscreen on start, but browser security may block it without direct interaction.
- **Tab/Window Detection**: ❌ **FAIL**.
  - **Issue**: Tab switching (`visibilitychange`) and window blurring events are detected by listeners but do **not** increment the violation counter or trigger warnings in the test environment.
  - **Environment**: Tested on `file://` protocol. Potential origin constraints or logic errors in `exam-integrity.js` de-bounce/state management.

---

## 3. Detected Risks & Weaknesses

### 🚨 Critical Risks
1.  **Integrity Bypass**: The failure of the tab-switching detection is the most critical risk. Currently, the system does not reliably penalize or log students leaving the exam tab.
2.  **Stateless Session (Local State Only)**: Current implementation keeps `state` in a JavaScript object. A simple browser refresh (`F5`) will **wipe all progress**.
    - *Recommendation*: Answers should be mirrored to `localStorage` after every selection to allow resumption.

### ⚠️ Technical Weaknesses
1.  **Offline "Load Sample" Failure**: The Admin tool's "Load Sample" button fails when running via `file://` because `fetch` is restricted.
    - *Recommendation*: Use a hardcoded string or a `static` resource for the sample text.
2.  **Missing Student UI Schema Validation**: While the Admin tool validates JSON, the Student UI only does a "basic" check (existence of `examId`).
    - *Recommendation*: Integrate the shared `Validator` to perform full schema validation on the loaded JSON before the exam starts.
3.  **Submission Reliability**: The `no-cors` mode for Google Apps Script means the system cannot "confirm" if the sheet actually received the data, only that the request was sent.

---

## 4. Final Verdict
The architecture is **strictly compliant** with the Project Charter. The core flow (Admin -> Student -> Scoring) is functional and accurate. However, the **Integrity Module requires debugging** before the system can be considered secure for formal testing environments.

---
*QA Agent - Phase 4 Validation Complete*
