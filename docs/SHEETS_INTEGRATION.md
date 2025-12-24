# Google Sheets Integration Guide

This guide explains how to set up the Google Sheet to receive exam results from SchoolCBT.

## 1. Sheet Setup

1.  Create a new Google Sheet.
2.  Rename the active sheet (tab) to `ExamResults` (or update the script if you choose a different name).
3.  Add the following headers to the **first row**:

| Column | Header | Description |
| :--- | :--- | :--- |
| A | Submission ID | Unique ID for the submission |
| B | Timestamp | Server-side reception time |
| C | Student Name | Full Name |
| D | Reg Number | Registration/Admission Number |
| E | Class | Class/Grade |
| F | Exam ID | Exam Reference ID |
| G | Subject | Subject Name |
| H | Term | Academic Term |
| I | Total Marks | Total obtainable marks |
| J | Obtained Marks | Score derived |
| K | Percentage | Score percentage |
| L | Passed | TRUE/FALSE based on pass mark |
| M | Duration Used | Time spent (minutes) |
| N | Violations | Count of integrity violations |
| O | Client Time | When the client sent the request |
| P | Full JSON | Complete raw JSON payload (backup) |

## 2. Google Apps Script Setup

1.  In your Google Sheet, go to **Extensions > Apps Script**.
2.  Clear the default code in `Code.gs`.
3.  Copy the content of `sheets/Code.gs` from this project and paste it there.
4.  **Save** the project.

## 3. Deployment

1.  Click **Deploy > New deployment**.
2.  Select type: **Web app**.
3.  Description: `v1`.
4.  Execute as: **Me** (your email).
5.  Who has access: **Anyone** (this is critical for the app to work without login).
6.  Click **Deploy**.
7.  Copy the **Web App URL**.
8.  Paste this URL into the SchoolCBT configuration (e.g., `exam.json` or config file).

## 4. Security & Transmission Note

### Opaque Transmission
Due to browser Cross-Origin Resource Sharing (CORS) restrictions with Google Apps Script redirects, the client-side uses **Opaque Transmission** (`mode: 'no-cors'`).

*   **Implication**: The client **cannot** read the server's response (Success or Error). It only knows if the network request was *sent*.
*   **UI Behavior**: Upon clicking submit, if no network error occurs (like being offline), the UI will assume success.
*   **Verification**: Teachers should verify receipt of data in the Google Sheet.

### Security
Since "Anyone" has access, the URL acts as the secret key. Do not share this URL publicly. The script includes basic validation to ensure only valid JSON complying with the structure is accepted, but it does not authenticate the sender.

## 5. Sample Payload structure

The system expects the payload defined in `results.schema.json`.

```json
{
  "submissionId": "SUB-20251222-X9Y8Z7",
  "version": "1.0.0",
  "student": {
    "fullName": "Jane Doe",
    "registrationNumber": "ADM/2023/001",
    "class": "SS3"
  },
  "exam": {
    "examId": "MATH-2025-001",
    "title": "Mathematics Final",
    "subject": "Mathematics",
    "term": "First Term",
    "academicYear": "2024/2025"
  },
  "answers": [ ... ],
  "scoring": {
    "totalMarks": 100,
    "obtainedMarks": 85,
    "percentage": 85.00,
    "passed": true,
    ...
  },
  "timing": {
    "durationUsed": 45,
    ...
  },
  "submission": {
    "type": "manual",
    "clientTimestamp": "2025-12-22T12:00:00Z"
  },
  "integrity": {
    "violations": 0
  }
}
```
