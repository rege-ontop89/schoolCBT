# Inter-Agent Contracts

**Version:** 1.0.0  
**Status:** 🔒 FROZEN  
**Author:** System Architect  
**Approved:** 2025-12-22T16:45:49+01:00

---

## 1. Purpose

This document defines the explicit contracts between system subsystems (agents). Each contract specifies:
- What each agent CAN do
- What each agent CANNOT do
- Data interfaces between agents
- Validation requirements

> [!CAUTION]
> Once approved, these contracts are FROZEN. Any changes require PM approval and version increment.

---

## 2. Contract Registry

| Contract ID | Name | Producer | Consumer |
|-------------|------|----------|----------|
| CTR-001 | Exam File Contract | Admin Tool | Student UI |
| CTR-002 | Result Submission Contract | Student UI | Sheets Integration |
| CTR-003 | Integrity Report Contract | Integrity Module | Student UI |
| CTR-004 | Schema Validation Contract | Shared Validator | All Agents |

---

## 3. CTR-001: Exam File Contract

### Producer: Admin Tool Agent

**MUST:**
- Generate exam files conforming to `exam.schema.json`
- Assign unique `examId` in format `SUBJ-YEAR-SEQ`
- Ensure all questions have unique `questionId`
- Validate output before saving
- Save files to `/exams/` directory with naming: `{examId}.json`

**MUST NOT:**
- Create exams with fewer than 1 question
- Allow duplicate question IDs within an exam
- Include any fields not defined in schema
- Modify exams after export (immutability)

### Consumer: Student UI Agent

**MUST:**
- Load exam files from `/exams/` directory
- Validate loaded exam against `exam.schema.json` before presenting
- Reject invalid exam files with user-friendly error
- Respect all `settings` values from exam file

**MUST NOT:**
- Modify exam content in any way
- Cache exams between sessions
- Expose `correctAnswer` values to student view

### Interface

```json
// File: /exams/{examId}.json
// Schema: exam.schema.json
{
  "examId": "MATH-2025-001",
  "version": "1.0.0",
  "metadata": { ... },
  "settings": { ... },
  "questions": [ ... ]
}
```

---

## 4. CTR-002: Result Submission Contract

### Producer: Student UI Agent

**MUST:**
- Generate result objects conforming to `results.schema.json`
- Generate unique `submissionId` in format `SUB-YYYYMMDD-RANDOM`
- Calculate score accurately based on exam answers
- Include all timing information
- Set correct `submission.type` value

**MUST NOT:**
- Submit results without student information
- Submit incomplete answer arrays
- Modify scoring after calculation
- Submit duplicate results for same exam session

### Consumer: Sheets Integration Agent

**MUST:**
- Validate incoming result against `results.schema.json`
- Reject invalid submissions
- POST to Google Apps Script webhook
- Handle network failures gracefully
- Return success/failure status to Student UI

**MUST NOT:**
- Modify result data during transmission
- Store results locally after successful submission
- Retry indefinitely (max 3 attempts)
- Expose Google Sheets credentials client-side

### Interface

```json
// In-memory object passed between modules
// Schema: results.schema.json
{
  "submissionId": "SUB-20251222-A1B2C3",
  "version": "1.0.0",
  "student": { ... },
  "exam": { ... },
  "answers": [ ... ],
  "scoring": { ... },
  "timing": { ... },
  "submission": { ... },
  "integrity": { ... }
}
```

### Response Interface

```json
// From Sheets Integration to Student UI
{
  "success": true,
  "submissionId": "SUB-20251222-A1B2C3",
  "timestamp": "2025-12-22T14:30:00Z",
  "error": null
}

// On failure
{
  "success": false,
  "submissionId": "SUB-20251222-A1B2C3",
  "timestamp": "2025-12-22T14:30:00Z",
  "error": "Network timeout. Please try again."
}
```

---

## 5. CTR-003: Integrity Report Contract

### Producer: Integrity Module Agent

**MUST:**
- Monitor for tab/window blur events
- Log violations with timestamp
- Provide violation count and log to Student UI
- Trigger auto-submit if threshold exceeded (if configured)

**MUST NOT:**
- Block exam functionality
- Access system-level processes
- Prevent normal browser behavior
- Fabricate or inflate violation counts

### Consumer: Student UI Agent

**MUST:**
- Initialize Integrity Module at exam start
- Include integrity data in result submission
- Display violation warnings to student (optional)
- Respect auto-submit triggers

**MUST NOT:**
- Ignore integrity module output
- Allow student to reset violation count
- Proceed without integrity module (must fail gracefully)

### Interface

```javascript
// Integrity Module API
IntegrityModule.init(config)        // Initialize monitoring
IntegrityModule.getViolations()     // Returns { count: number, log: array }
IntegrityModule.onViolation(cb)     // Callback on each violation
IntegrityModule.destroy()           // Cleanup
```

```json
// Violation Log Entry
{
  "type": "tab-switch",
  "timestamp": "2025-12-22T14:25:30Z"
}
```

---

## 6. CTR-004: Schema Validation Contract

### Provider: Shared Validator Module

**MUST:**
- Validate any JSON against specified schema
- Return boolean validity result
- Return detailed error messages on failure
- Support both exam and results schemas

**MUST NOT:**
- Modify data during validation
- Cache validation results
- Throw uncaught exceptions

### Consumers: All Agents

**MUST:**
- Validate data before processing (read operations)
- Validate data before saving/submitting (write operations)
- Handle validation failures gracefully
- Display meaningful error messages to user

**MUST NOT:**
- Skip validation steps
- Process invalid data
- Assume data is valid without checking

### Interface

```javascript
// Validator API
Validator.validate(data, schemaType)
// schemaType: 'exam' | 'results'

// Returns:
{
  "valid": true,
  "errors": []
}

// Or on failure:
{
  "valid": false,
  "errors": [
    {
      "path": "$.questions[0].options.E",
      "message": "Additional property 'E' is not allowed"
    }
  ]
}
```

---

## 7. Agent Boundaries Summary

### Admin Tool Agent

| Permission | Status |
|------------|--------|
| Create exam JSON files | ✅ ALLOWED |
| Read exam schema | ✅ ALLOWED |
| Validate exam files | ✅ ALLOWED |
| Read student results | ❌ DENIED |
| Connect to Google Sheets | ❌ DENIED |
| Modify exported exams | ❌ DENIED |

---

### Student UI Agent

| Permission | Status |
|------------|--------|
| Load exam JSON files | ✅ ALLOWED |
| Display questions to student | ✅ ALLOWED |
| Capture student answers | ✅ ALLOWED |
| Calculate scores | ✅ ALLOWED |
| Generate result objects | ✅ ALLOWED |
| Request submission to Sheets | ✅ ALLOWED |
| Modify exam content | ❌ DENIED |
| Show correct answers during exam | ❌ DENIED |
| Access other sessions | ❌ DENIED |

---

### Integrity Module Agent

| Permission | Status |
|------------|--------|
| Monitor blur/focus events | ✅ ALLOWED |
| Log violations | ✅ ALLOWED |
| Trigger auto-submit | ✅ ALLOWED |
| Access system processes | ❌ DENIED |
| Prevent browser actions | ❌ DENIED |
| Access exam content | ❌ DENIED |

---

### Sheets Integration Agent

| Permission | Status |
|------------|--------|
| Receive result objects | ✅ ALLOWED |
| Validate results | ✅ ALLOWED |
| POST to webhook | ✅ ALLOWED |
| Return submission status | ✅ ALLOWED |
| Modify result data | ❌ DENIED |
| Read from Google Sheets | ❌ DENIED |
| Store credentials client-side | ❌ DENIED |

---

## 8. Versioning

| Schema/Contract | Current Version | Status |
|-----------------|-----------------|--------|
| exam.schema.json | 1.0.0 | 🔒 FROZEN |
| results.schema.json | 1.0.0 | 🔒 FROZEN |
| CONTRACTS.md | 1.0.0 | 🔒 FROZEN |

> [!IMPORTANT]
> All agents must check version compatibility. If schema version changes, agents must be updated accordingly.

---

## 9. Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| System Architect | (Agent) | SUBMITTED | 2025-12-22 |
| PM | (User) | ✅ APPROVED | 2025-12-22 |

---

*Once approved, these contracts become binding for all implementing agents.*
