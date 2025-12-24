# SchoolCBT Project Charter
**Version:** 1.1.0  
**Phase:** 1 - Foundation (COMPLETE)  
**Status:** ✅ PHASE 1 COMPLETE  
**Last Updated:** 2025-12-22T16:45:49+01:00

---

## 🎯 Base Model Scope

### ✅ CONFIRMED: Objective Questions ONLY

The Base Model is strictly scoped to **objective (multiple-choice) questions**.

| Feature | Status |
|---------|--------|
| Multiple-choice questions (single correct answer) | ✅ IN SCOPE |
| Essay/subjective questions | ❌ OUT OF SCOPE |
| Fill-in-the-blank | ❌ OUT OF SCOPE |
| Multi-select questions | ❌ OUT OF SCOPE |
| Image-based questions | ❌ OUT OF SCOPE (Phase 2+) |
| Audio/video questions | ❌ OUT OF SCOPE |

---

## 🚫 Hard Constraints

> [!CAUTION]
> These constraints are NON-NEGOTIABLE. Violation will result in rejection.

| ID | Constraint | Rationale |
|----|------------|-----------|
| C01 | **No Backend/Server** | Client-side only application |
| C02 | **No Database** | JSON file-based data storage |
| C03 | **No Authentication** | No login/user management system |
| C04 | **No External Dependencies** | Vanilla HTML/CSS/JS only (no frameworks) |
| C05 | **Objective Questions Only** | Base Model scope limitation |
| C06 | **Google Sheets for Results** | Only integration point for data persistence |
| C07 | **Schema Compliance** | All data must validate against defined schemas |

---

## 📋 Execution Order

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: INITIALIZATION (CURRENT)                           │
│ • Confirm scope ✅                                          │
│ • Publish constraints ✅                                    │
│ • Define execution order ✅                                 │
│ • Agents remain BLOCKED                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: FOUNDATION ✅ COMPLETE                             │
│ Step 1.1: System Architect → Schemas (exam, results) ✅     │
│ Step 1.2: System Architect → Inter-agent Contracts ✅       │
│ [SCHEMAS FROZEN - 2025-12-22]                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: CORE IMPLEMENTATION 🔓 UNBLOCKED                   │
│ Step 2.1: Admin Tool Agent → Exam Builder UI                │
│ Step 2.2: Student UI Agent → Exam Interface                 │
│ [READY - Awaiting PM go-ahead]                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: INTEGRATION                                        │
│ Step 3.1: Integrity Module Agent → Security Features        │
│ Step 3.2: Sheets Integration Agent → Result Submission      │
│ [BLOCKED - Requires Phase 2 completion]                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: VALIDATION                                         │
│ Step 4.1: QA Agent → Constraint Validation                  │
│ Step 4.2: QA Agent → Integration Testing                    │
│ Step 4.3: PM → Final Review & Version Freeze                │
│ [BLOCKED - Requires Phase 3 completion]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Agent Status Registry

| Agent | Role | Current Status | Blocker |
|-------|------|----------------|---------|
| System Architect | Schema & Contract Design | ✅ COMPLETE | — |
| Admin Tool Agent | Exam Builder Implementation | � READY | Awaiting PM go-ahead |
| Student UI Agent | Exam Interface Implementation | � READY | Awaiting PM go-ahead |
| Integrity Module Agent | Security Features | 🔒 BLOCKED | Requires core UI |
| Sheets Integration Agent | Result Submission | 🔒 BLOCKED | Requires core UI |
| QA Agent | Validation & Testing | 🔒 BLOCKED | Requires full implementation |

---

## 📐 Schema Requirements (Preview)

### exam.schema.json
Must define:
- Exam metadata (title, subject, duration, total marks)
- Question array with:
  - Question ID
  - Question text
  - Options array (4 options: A, B, C, D)
  - Correct answer indicator
  - Marks per question

### results.schema.json
Must define:
- Student information (name, ID/registration number)
- Exam reference
- Submission timestamp
- Answers array
- Score calculation
- Integrity flags (if applicable)

---

## ✋ Current Blockers

> [!IMPORTANT]
> All agents are currently **BLOCKED** pending PM approval to proceed.

**Next Action Required:**  
PM may proceed to **Phase 2** by unblocking Admin Tool Agent or Student UI Agent.

---

## 📝 Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-12-22 | 1.1.0 | Phase 1 complete, schemas frozen | System Architect |
| 2025-12-22 | 1.0.0 | Initial charter created | PM Agent |

---

*This document is the single source of truth for project state.*
