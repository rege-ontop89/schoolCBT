# SchoolCBT System Architecture

**Version:** 1.0.0  
**Phase:** 1 - Foundation  
**Author:** System Architect  
**Last Updated:** 2025-12-22

---

## 1. System Overview

SchoolCBT is a **client-side only** Computer-Based Testing application for schools. It enables administrators to create objective (multiple-choice) exams and students to take them, with results submitted to Google Sheets.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCHOOLCBT SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │   ADMIN TOOL    │         │   STUDENT UI    │                       │
│  │   (Exam Builder)│         │  (Exam Player)  │                       │
│  └────────┬────────┘         └────────┬────────┘                       │
│           │                           │                                 │
│           │ writes                    │ reads                           │
│           ▼                           ▼                                 │
│  ┌─────────────────────────────────────────────┐                       │
│  │              LOCAL FILE SYSTEM               │                       │
│  │  ┌─────────────────┐  ┌──────────────────┐  │                       │
│  │  │  exam.json      │  │  (exam files)    │  │                       │
│  │  │  (per exam)     │  │                  │  │                       │
│  │  └─────────────────┘  └──────────────────┘  │                       │
│  └─────────────────────────────────────────────┘                       │
│                                                                         │
│           │ submits results                                             │
│           ▼                                                             │
│  ┌─────────────────────────────────────────────┐                       │
│  │           GOOGLE SHEETS (External)           │                       │
│  │           Results Persistence Layer          │                       │
│  └─────────────────────────────────────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Boundaries

### 2.1 What The System IS

| Capability | Description |
|------------|-------------|
| Exam Builder | Admin creates objective exams in JSON format |
| Exam Player | Students take exams in browser |
| Timer System | Countdown timer with auto-submit |
| Result Submission | Scores sent to Google Sheets |
| Offline-First | Works without internet (except submission) |

### 2.2 What The System IS NOT

| Exclusion | Rationale |
|-----------|-----------|
| No Backend Server | Client-side only (Constraint C01) |
| No Database | JSON file storage (Constraint C02) |
| No Authentication | No login system (Constraint C03) |
| No Frameworks | Vanilla HTML/CSS/JS (Constraint C04) |
| No Subjective Questions | Objective only in Base Model (Constraint C05) |

---

## 3. Subsystem Definitions

### 3.1 Admin Tool (Exam Builder)

**Purpose:** Create and manage objective exam JSON files.

**Responsibilities:**
- Generate valid `exam.json` files
- Validate exam structure against `exam.schema.json`
- Preview exam before export

**Boundaries:**
- Cannot access student results
- Cannot connect to Google Sheets
- Cannot modify exams after export (immutable)

---

### 3.2 Student UI (Exam Player)

**Purpose:** Load and present exams to students, capture answers.

**Responsibilities:**
- Load `exam.json` files
- Present questions one at a time or all at once
- Manage countdown timer
- Capture and store answers locally (in memory)
- Calculate score
- Prepare result payload for submission

**Boundaries:**
- Cannot modify exam content
- Cannot access other students' results
- Cannot submit without completing required fields

---

### 3.3 Integrity Module

**Purpose:** Ensure exam integrity during runtime.

**Responsibilities:**
- Detect tab/window switching (blur events)
- Log integrity violations
- Optionally auto-submit on violation threshold

**Boundaries:**
- Cannot prevent browser native behaviors
- Cannot access system-level monitoring
- Reports violations, does not block exam

---

### 3.4 Sheets Integration Module

**Purpose:** Submit exam results to Google Sheets.

**Responsibilities:**
- Format result payload per `results.schema.json`
- POST to Google Apps Script Web App endpoint
- Handle submission success/failure

**Boundaries:**
- Cannot read from Google Sheets
- Cannot modify past submissions
- Cannot function without internet connection

---

## 4. Data Flow

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Admin Tool  │─────▶│  exam.json   │◀─────│  Student UI  │
│  (writes)    │      │  (storage)   │      │  (reads)     │
└──────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
                                                   │ generates
                                                   ▼
                                            ┌──────────────┐
                                            │ Result Object│
                                            │ (in memory)  │
                                            └──────┬───────┘
                                                   │
                                                   │ submits
                                                   ▼
                                            ┌──────────────┐
                                            │ Google Sheets│
                                            │ (external)   │
                                            └──────────────┘
```

---

## 5. Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Structure | HTML5 | Semantic markup, accessibility |
| Styling | Vanilla CSS | No framework dependency |
| Logic | Vanilla JavaScript (ES6+) | No framework dependency |
| Data Format | JSON | Human-readable, easy to validate |
| External Integration | Google Sheets + Apps Script | Free, accessible, cloud-based |

---

## 6. File Structure (Proposed)

```
schoolCBT/
├── docs/
│   ├── ARCHITECTURE.md          # This document
│   └── CONTRACTS.md             # Inter-agent contracts
├── schemas/
│   ├── exam.schema.json         # Exam data schema
│   └── results.schema.json      # Results data schema
├── admin/
│   ├── index.html               # Admin tool entry
│   ├── admin.css                # Admin styles
│   └── admin.js                 # Admin logic
├── student/
│   ├── index.html               # Student UI entry
│   ├── student.css              # Student styles
│   └── student.js               # Student logic
├── shared/
│   ├── validator.js             # JSON schema validator
│   └── utils.js                 # Shared utilities
├── exams/
│   └── [exam-files].json        # Generated exam files
└── PROJECT_CHARTER.md           # Project source of truth
```

---

## 7. Constraints Compliance Matrix

| Constraint ID | Constraint | Architecture Compliance |
|---------------|------------|-------------------------|
| C01 | No Backend/Server | ✅ All logic runs in browser |
| C02 | No Database | ✅ JSON files only |
| C03 | No Authentication | ✅ No login/session system |
| C04 | No External Dependencies | ✅ Vanilla HTML/CSS/JS |
| C05 | Objective Questions Only | ✅ Schema enforces MCQ only |
| C06 | Google Sheets for Results | ✅ Single integration point |
| C07 | Schema Compliance | ✅ Validators enforce schemas |

---

## 8. Schema References

- [exam.schema.json](../schemas/exam.schema.json) - Defines exam structure
- [results.schema.json](../schemas/results.schema.json) - Defines result submission structure

---

*This document defines the canonical system architecture. All agents must comply.*
